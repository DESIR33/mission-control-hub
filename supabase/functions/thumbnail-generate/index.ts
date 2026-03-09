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
      return new Response(
        JSON.stringify({ success: false, error: 'REPLICATE_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, video_title, current_thumbnail_url, prompt, model, proposal_id, workspace_id } = await req.json();

    if (action === 'assess') {
      // Use the thumbnail URL to build an assessment based on the strategy doc principles
      const assessment = buildAssessment(video_title, current_thumbnail_url);
      return new Response(
        JSON.stringify({ success: true, assessment }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate') {
      if (!prompt) {
        return new Response(
          JSON.stringify({ success: false, error: 'Prompt is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Model selection
      const useNanoBanana = model === 'nano-banana-2';
      // Replicate requires version hashes, not model names
      const NANO_BANANA_VERSION = "408160b9879ab5572e8409b2648b45bf55e86b2a2d7e24b4a9e4fba5a5e9744e";
      const FLUX_SCHNELL_VERSION = "5599ed30703defd1d160a25a63321b4b945d488d68c18fbec8f6bc4d59118cc5";

      const versionId = useNanoBanana ? NANO_BANANA_VERSION : FLUX_SCHNELL_VERSION;

      // Build input based on model
      const modelInput: Record<string, unknown> = useNanoBanana
        ? {
            prompt,
            width: 1280,
            height: 720,
            num_outputs: 1,
          }
        : {
            prompt,
            aspect_ratio: '16:9',
            num_outputs: 1,
            output_format: 'png',
            output_quality: 90,
          };

      // Create prediction
      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          version: versionId,
          input: modelInput,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('Replicate API error:', errText);
        return new Response(
          JSON.stringify({ success: false, error: `Replicate API error [${createRes.status}]: ${errText}` }),
          { status: createRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const prediction = await createRes.json();

      // If using Prefer: wait, the prediction should be complete
      if (prediction.status === 'succeeded' && prediction.output) {
        const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

        // If proposal_id provided, save thumbnail URL back to the proposal
        if (proposal_id && workspace_id) {
          try {
            const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );
            const { data: existing } = await supabase
              .from('ai_proposals')
              .select('thumbnail_urls')
              .eq('id', proposal_id)
              .single();
            const urls = existing?.thumbnail_urls || [];
            urls.push(outputUrl);
            await supabase
              .from('ai_proposals')
              .update({ thumbnail_urls: urls, requires_thumbnail_generation: false })
              .eq('id', proposal_id);
          } catch (e) {
            console.error('Failed to update proposal with thumbnail URL:', e);
          }
        }

        return new Response(
          JSON.stringify({ success: true, image_url: outputUrl, prediction_id: prediction.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If still processing, poll
      if (prediction.status === 'processing' || prediction.status === 'starting') {
        const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
        let result = prediction;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const pollRes = await fetch(pollUrl, {
            headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
          });
          result = await pollRes.json();
          if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') break;
        }

        if (result.status === 'succeeded' && result.output) {
          const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
          return new Response(
            JSON.stringify({ success: true, image_url: outputUrl, prediction_id: result.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: `Prediction ${result.status}`, details: result.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Unexpected status: ${prediction.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use "assess" or "generate".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in thumbnail-generate:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildAssessment(videoTitle: string, thumbnailUrl: string | undefined) {
  // Structured assessment framework based on the thumbnail strategy doc
  return {
    psychology_flow: {
      visual_stun_gun: {
        score: null, // Will be filled by AI or manual review
        description: 'Does the thumbnail stop the scroll? Does it visually pop enough to trigger active comprehension?',
      },
      title_value_hunt: {
        score: null,
        description: 'Does the thumbnail make you curious enough to read the title? Does it create a desire loop?',
      },
      visual_validation: {
        score: null,
        description: 'After reading the title, does the thumbnail reinforce the promise?',
      },
    },
    composition_check: {
      element_count: null,
      composition_type: null, // symmetrical, asymmetrical, a_b_split
      person_present: null,
      text_present: null,
      text_overlaps_face: null,
      bottom_right_clear: null,
      mobile_readable: null,
    },
    stun_gun_elements: {
      color_contrast: false,
      large_face_emotion: false,
      compelling_graphic: false,
      big_text_numbers: false,
      red_circles_arrows: false,
      aesthetic_imagery: false,
      design_collage: false,
    },
    desire_loop: {
      core_desire: '',
      pain_point: '',
      solution_transformation: '',
      curiosity_loop: '',
    },
    recommendations: [],
    current_thumbnail_url: thumbnailUrl,
    video_title: videoTitle,
  };
}
