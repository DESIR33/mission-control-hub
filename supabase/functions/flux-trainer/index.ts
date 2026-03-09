const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TRAINING_IMAGES = 20;

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
    console.log(`[flux-trainer] action=${action} session=${session_id}`);

    async function getReplicateUsername(): Promise<string> {
      const res = await fetch('https://api.replicate.com/v1/account', {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to get Replicate account: ${res.status} ${txt}`);
      }
      const data = await res.json();
      console.log('[flux-trainer] Replicate username:', data.username);
      return data.username;
    }

    // ── ACTION: train ──
    if (action === 'train') {
      if (!session_id || !workspace_id) {
        return new Response(JSON.stringify({ success: false, error: 'session_id and workspace_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: session, error: sErr } = await supabase
        .from('flux_training_sessions')
        .select('*')
        .eq('id', session_id)
        .single();
      if (sErr || !session) {
        console.error('[flux-trainer] Session not found:', sErr);
        return new Response(JSON.stringify({ success: false, error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('[flux-trainer] Session found:', session.name, 'trigger:', session.trigger_word);

      const { data: allImages } = await supabase
        .from('flux_training_images')
        .select('storage_path, file_name')
        .eq('session_id', session_id);

      if (!allImages?.length || allImages.length < 3) {
        return new Response(JSON.stringify({ success: false, error: 'Need at least 3 training images' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Cap images to prevent memory issues
      const images = allImages.slice(0, MAX_TRAINING_IMAGES);
      console.log(`[flux-trainer] Using ${images.length} of ${allImages.length} images (max ${MAX_TRAINING_IMAGES})`);

      // Update status to training
      await supabase.from('flux_training_sessions')
        .update({ status: 'training', training_started_at: new Date().toISOString(), image_count: images.length, error_message: null })
        .eq('id', session_id);

      // Build zip from training images — download one at a time to save memory
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
      const zip = new JSZip();
      let addedCount = 0;

      for (let i = 0; i < images.length; i++) {
        try {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/training-images/${images[i].storage_path}`;
          console.log(`[flux-trainer] Downloading image ${i + 1}/${images.length}`);
          const imgRes = await fetch(publicUrl);
          if (!imgRes.ok) {
            console.warn(`[flux-trainer] Skip image ${i}: HTTP ${imgRes.status}`);
            await imgRes.text(); // consume body
            continue;
          }
          const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
          const ext = images[i].file_name.split('.').pop() || 'jpg';
          zip.file(`img_${addedCount}.${ext}`, imgBytes);
          addedCount++;
          console.log(`[flux-trainer] Added image ${addedCount} (${(imgBytes.length / 1024).toFixed(0)}KB)`);
        } catch (e) {
          console.warn(`[flux-trainer] Failed to fetch image ${i}:`, e);
        }
      }

      if (addedCount < 3) {
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: 'Could not download enough images from storage' })
          .eq('id', session_id);
        return new Response(JSON.stringify({ success: false, error: 'Could not download enough images' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`[flux-trainer] Generating zip with ${addedCount} images...`);
      const zipBlob = await zip.generateAsync({ type: "uint8array" });
      console.log(`[flux-trainer] Zip size: ${(zipBlob.length / 1024 / 1024).toFixed(2)}MB`);

      // Upload zip to Replicate Files API
      const formData = new FormData();
      formData.append('content', new Blob([zipBlob], { type: 'application/zip' }), 'training_data.zip');

      console.log('[flux-trainer] Uploading zip to Replicate...');
      const uploadRes = await fetch('https://api.replicate.com/v1/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error('[flux-trainer] File upload failed:', uploadRes.status, errText);
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: `File upload failed: ${errText}` })
          .eq('id', session_id);
        return new Response(JSON.stringify({ success: false, error: `File upload failed: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const uploadData = await uploadRes.json();
      const zipUrl = uploadData.urls?.get || uploadData.url;
      console.log('[flux-trainer] Zip uploaded to Replicate:', zipUrl);

      // Get Replicate username
      let owner: string;
      try {
        owner = await getReplicateUsername();
      } catch (e) {
        console.error('[flux-trainer] Replicate account error:', e);
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: 'Could not resolve Replicate account. Check API token.' })
          .eq('id', session_id);
        return new Response(JSON.stringify({ success: false, error: 'Invalid Replicate API token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Sanitize model name
      const modelSlug = (session.replicate_model_name || `flux-lora-${session_id.slice(0, 8)}`)
        .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 64);
      const destination = `${owner}/${modelSlug}`;
      console.log('[flux-trainer] Destination model:', destination);

      // Create the destination model (ignore 409 = already exists)
      const createModelRes = await fetch('https://api.replicate.com/v1/models', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          name: modelSlug,
          description: `Fine-tuned Flux LoRA – trigger: ${session.trigger_word}`,
          visibility: 'private',
          hardware: 'gpu-t4',
        }),
      });
      const createModelBody = await createModelRes.text();
      if (!createModelRes.ok && createModelRes.status !== 409) {
        console.warn('[flux-trainer] Model creation warning:', createModelRes.status, createModelBody);
      } else {
        console.log('[flux-trainer] Model ready (status:', createModelRes.status, ')');
      }

      // Start Flux LoRA training
      const trainBody = {
        destination,
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
      };

      console.log('[flux-trainer] Starting training with destination:', destination);

      const trainRes = await fetch(
        'https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/bb872ad6224f3e47da976bef7c3b59e8d0fd9cf1dd1fa6f919b807e3061d9ba1/trainings',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trainBody),
        }
      );

      if (!trainRes.ok) {
        const errText = await trainRes.text();
        console.error('[flux-trainer] Training API error:', trainRes.status, errText);
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: `Training API error (${trainRes.status}): ${errText}` })
          .eq('id', session_id);
        return new Response(JSON.stringify({ success: false, error: `Training failed: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const trainData = await trainRes.json();
      console.log('[flux-trainer] ✅ Training started! ID:', trainData.id, 'Status:', trainData.status);

      await supabase.from('flux_training_sessions')
        .update({
          replicate_training_id: trainData.id,
          replicate_model_name: destination,
          metadata: { ...(session.metadata || {}), zip_url: zipUrl, replicate_url: trainData.urls?.get },
        })
        .eq('id', session_id);

      return new Response(JSON.stringify({
        success: true,
        training_id: trainData.id,
        status: trainData.status,
        destination,
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
        return new Response(JSON.stringify({ success: true, status: session?.status || 'pending', message: 'No Replicate training ID found. Training may not have started.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('[flux-trainer] Checking status for training:', session.replicate_training_id);

      const statusRes = await fetch(`https://api.replicate.com/v1/trainings/${session.replicate_training_id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      });

      if (!statusRes.ok) {
        const errText = await statusRes.text();
        console.error('[flux-trainer] Status check failed:', statusRes.status, errText);
        return new Response(JSON.stringify({ success: false, error: `Failed to check status: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const statusData = await statusRes.json();
      console.log('[flux-trainer] Training status:', statusData.status, 'ID:', session.replicate_training_id);

      if (statusData.status === 'succeeded') {
        const version = statusData.output?.version || statusData.version;
        await supabase.from('flux_training_sessions')
          .update({
            status: 'completed',
            training_completed_at: new Date().toISOString(),
            replicate_model_version: version,
            error_message: null,
          })
          .eq('id', session_id);
      } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
        await supabase.from('flux_training_sessions')
          .update({ status: 'failed', error_message: statusData.error || `Training ${statusData.status}` })
          .eq('id', session_id);
      }

      return new Response(JSON.stringify({
        success: true,
        status: statusData.status,
        logs: statusData.logs?.substring(statusData.logs.length - 500),
        metrics: statusData.metrics || null,
        version: statusData.output?.version || null,
        started_at: statusData.started_at,
        completed_at: statusData.completed_at,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid action. Use "train" or "check_status".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[flux-trainer] Unhandled error:', error);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
