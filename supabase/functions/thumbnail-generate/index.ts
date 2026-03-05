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

    const { action, video_title, current_thumbnail_url, prompt, model } = await req.json();

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

      // Default to Flux Schnell for speed, allow override
      const modelId = model || 'black-forest-labs/flux-schnell';

      // Create prediction
      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          model: modelId,
          input: {
            prompt,
            aspect_ratio: '16:9',
            num_outputs: 1,
            output_format: 'png',
            output_quality: 90,
          },
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
