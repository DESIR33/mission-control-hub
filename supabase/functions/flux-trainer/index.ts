const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
    if (!REPLICATE_API_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: 'REPLICATE_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { action, session_id, workspace_id } = await req.json();

    // ── ACTION: create_zip_and_train ──
    if (action === 'train') {
      if (!session_id || !workspace_id) {
        return new Response(JSON.stringify({ success: false, error: 'session_id and workspace_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get session info
      const { data: session, error: sErr } = await supabase
        .from('flux_training_sessions')
        .select('*')
        .eq('id', session_id)
        .single();
      if (sErr || !session) {
        return new Response(JSON.stringify({ success: false, error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get training images
      const { data: images } = await supabase
        .from('flux_training_images')
        .select('storage_path, file_name')
        .eq('session_id', session_id);

      if (!images?.length || images.length < 3) {
        return new Response(JSON.stringify({ success: false, error: 'Need at least 3 training images' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Update status
      await supabase.from('flux_training_sessions')
        .update({ status: 'training', training_started_at: new Date().toISOString(), image_count: images.length })
        .eq('id', session_id);

      // Build zip by downloading images one at a time to minimize memory
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
      const zip = new JSZip();
      let addedCount = 0;

      for (let i = 0; i < images.length; i++) {
        try {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/training-images/${images[i].storage_path}`;
          const imgRes = await fetch(publicUrl);
          if (!imgRes.ok) { console.warn(`Skip image ${i}: ${imgRes.status}`); continue; }
          const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
          const ext = images[i].file_name.split('.').pop() || 'jpg';
          zip.file(`img_${addedCount}.${ext}`, imgBytes);
          addedCount++;
        } catch (e) {
          console.warn(`Failed to fetch image ${i}:`, e);
        }
      }

      if (addedCount < 3) {
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: 'Could not download enough images' })
          .eq('id', session_id);
        return new Response(JSON.stringify({ success: false, error: 'Could not download enough images' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const zipBlob = await zip.generateAsync({ type: "uint8array" });

      // Upload zip to Replicate Files API
      const formData = new FormData();
      formData.append('content', new Blob([zipBlob], { type: 'application/zip' }), 'training_data.zip');

      const uploadRes = await fetch('https://api.replicate.com/v1/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: `File upload failed: ${errText}` })
          .eq('id', session_id);
        return new Response(JSON.stringify({ success: false, error: `File upload failed: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const uploadData = await uploadRes.json();
      const zipUrl = uploadData.urls?.get || uploadData.url;

      // Get feedback to include negative prompts
      const { data: feedback } = await supabase
        .from('flux_generation_feedback')
        .select('prompt, is_positive')
        .eq('workspace_id', workspace_id)
        .eq('is_positive', false)
        .order('created_at', { ascending: false })
        .limit(10);

      const negativePatterns = (feedback || []).map((f: any) => f.prompt).filter(Boolean).join(', ');

      // Create a destination model on Replicate (or use existing)
      const modelName = session.replicate_model_name || `flux-selfie-${session_id.slice(0, 8)}`;
      
      // Try to create the model first
      try {
        await fetch('https://api.replicate.com/v1/models', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            owner: 'your-username', // Will be overridden by the API based on token
            name: modelName,
            description: 'Fine-tuned Flux for thumbnail selfies',
            visibility: 'private',
            hardware: 'gpu-a40-large',
          }),
        });
      } catch (e) {
        // Model might already exist, that's fine
        console.log('Model creation attempt:', e);
      }

      // Start training using replicate/fast-flux-trainer
      const trainRes = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/d995297071a44dcb72244e6c19462111649ec86a9646c32df56daa7f14801199/trainings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            input_images: zipUrl,
            trigger_word: session.trigger_word || 'MYFACE',
            steps: 1000,
            lora_rank: 16,
            optimizer: 'adamw8bit',
            batch_size: 1,
            resolution: '512,768,1024',
            autocaption: true,
            autocaption_prefix: `a photo of ${session.trigger_word || 'MYFACE'}, `,
            learning_rate: 0.0004,
          },
        }),
      });

      if (!trainRes.ok) {
        const errText = await trainRes.text();
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: `Training API error: ${errText}` })
          .eq('id', session_id);
        return new Response(JSON.stringify({ success: false, error: `Training failed: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const trainData = await trainRes.json();

      await supabase.from('flux_training_sessions')
        .update({
          replicate_training_id: trainData.id,
          replicate_model_name: modelName,
          metadata: { ...session.metadata, negative_patterns: negativePatterns, zip_url: zipUrl },
        })
        .eq('id', session_id);

      return new Response(JSON.stringify({
        success: true,
        training_id: trainData.id,
        status: trainData.status,
        model_name: modelName,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: check_status ──
    if (action === 'check_status') {
      if (!session_id) {
        return new Response(JSON.stringify({ success: false, error: 'session_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: session } = await supabase
        .from('flux_training_sessions')
        .select('replicate_training_id, status')
        .eq('id', session_id)
        .single();

      if (!session?.replicate_training_id) {
        return new Response(JSON.stringify({ success: true, status: session?.status || 'pending' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const statusRes = await fetch(`https://api.replicate.com/v1/trainings/${session.replicate_training_id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      });

      if (!statusRes.ok) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to check status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const statusData = await statusRes.json();

      if (statusData.status === 'succeeded') {
        const version = statusData.output?.version || statusData.version;
        await supabase.from('flux_training_sessions')
          .update({
            status: 'completed',
            training_completed_at: new Date().toISOString(),
            replicate_model_version: version,
          })
          .eq('id', session_id);
      } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: statusData.error || 'Training failed' })
          .eq('id', session_id);
      }

      return new Response(JSON.stringify({
        success: true,
        status: statusData.status,
        logs: statusData.logs?.substring(0, 500),
        version: statusData.output?.version,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid action. Use "train" or "check_status".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('flux-trainer error:', error);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
