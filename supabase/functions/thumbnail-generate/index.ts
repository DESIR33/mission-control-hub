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

    const body = await req.json();
    const { action } = body;

    // ── ACTION: assess ──
    if (action === 'assess') {
      const { video_title, current_thumbnail_url } = body;

      const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
      if (!OPENROUTER_API_KEY) {
        // Fallback to empty template if no AI key
        const assessment = buildAssessment(video_title, current_thumbnail_url);
        return jsonResponse({ success: true, assessment });
      }

      try {
        const systemPrompt = `You are a YouTube thumbnail strategist. Analyze thumbnails using the Psychology Flow framework:

1. **Visual Stun Gun** (score 1-10): Does it stop the scroll? Does it visually pop?
2. **Title Value Hunt** (score 1-10): Does it make you curious enough to read the title? Does it create a desire loop?
3. **Visual Validation** (score 1-10): After reading the title, does the thumbnail reinforce the promise?

Also evaluate:
- Composition: element count, composition type (symmetrical/asymmetrical/a_b_split), person present, text present, text overlaps face, bottom right clear, mobile readable
- Stun Gun Elements: color_contrast, large_face_emotion, compelling_graphic, big_text_numbers, red_circles_arrows, aesthetic_imagery, design_collage
- Desire Loop: core_desire, pain_point, solution_transformation, curiosity_loop
- Recommendations: list of specific actionable improvements

Return ONLY valid JSON matching this exact structure (no markdown, no backticks):
{
  "psychology_flow": {
    "visual_stun_gun": { "score": <number>, "description": "<analysis>" },
    "title_value_hunt": { "score": <number>, "description": "<analysis>" },
    "visual_validation": { "score": <number>, "description": "<analysis>" }
  },
  "composition_check": {
    "element_count": <number>,
    "composition_type": "<string>",
    "person_present": <boolean>,
    "text_present": <boolean>,
    "text_overlaps_face": <boolean>,
    "bottom_right_clear": <boolean>,
    "mobile_readable": <boolean>
  },
  "stun_gun_elements": {
    "color_contrast": <boolean>,
    "large_face_emotion": <boolean>,
    "compelling_graphic": <boolean>,
    "big_text_numbers": <boolean>,
    "red_circles_arrows": <boolean>,
    "aesthetic_imagery": <boolean>,
    "design_collage": <boolean>
  },
  "desire_loop": {
    "core_desire": "<string>",
    "pain_point": "<string>",
    "solution_transformation": "<string>",
    "curiosity_loop": "<string>"
  },
  "recommendations": ["<string>", ...]
}`;

        const messages: Array<{ role: string; content: unknown }> = [
          { role: "system", content: systemPrompt },
        ];

        // Build user message with image if available
        if (current_thumbnail_url) {
          messages.push({
            role: "user",
            content: [
              { type: "image_url", image_url: { url: current_thumbnail_url } },
              { type: "text", text: `Analyze this YouTube thumbnail for the video titled: "${video_title}". Provide a detailed assessment.` },
            ],
          });
        } else {
          messages.push({
            role: "user",
            content: `Analyze a YouTube thumbnail for the video titled: "${video_title}". Since no image is available, provide your best assessment based on the title alone — focus on what kind of thumbnail would work best and score the hypothetical current state as average.`,
          });
        }

        console.log('[thumbnail-generate] Calling OpenRouter for assessment...');
        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages,
            max_tokens: 2000,
            temperature: 0.3,
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error('[thumbnail-generate] OpenRouter error:', aiRes.status, errText);
          // Fallback to empty template
          const assessment = buildAssessment(video_title, current_thumbnail_url);
          return jsonResponse({ success: true, assessment, ai_error: `AI analysis failed: ${aiRes.status}` });
        }

        const aiData = await aiRes.json();
        const rawContent = aiData.choices?.[0]?.message?.content || '';
        console.log('[thumbnail-generate] AI response length:', rawContent.length);

        // Parse JSON from response (strip markdown fences if present)
        const jsonStr = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsedAssessment = JSON.parse(jsonStr);

        // Merge with template to ensure all fields exist
        const assessment = {
          ...buildAssessment(video_title, current_thumbnail_url),
          ...parsedAssessment,
          current_thumbnail_url,
          video_title,
        };

        return jsonResponse({ success: true, assessment });
      } catch (err) {
        console.error('[thumbnail-generate] Assessment AI error:', err);
        // Fallback to empty template
        const assessment = buildAssessment(video_title, current_thumbnail_url);
        return jsonResponse({ success: true, assessment, ai_error: String(err) });
      }
    }

    // ── ACTION: generate (single image) ──
    if (action === 'generate') {
      const { prompt, model, proposal_id, workspace_id } = body;
      if (!prompt) {
        return jsonResponse({ success: false, error: 'Prompt is required' }, 400);
      }
      const result = await generateImage(prompt, model, REPLICATE_API_TOKEN);
      if (!result.success) {
        return jsonResponse(result, 500);
      }

      // If proposal_id provided, save thumbnail URL back to the proposal
      if (proposal_id && workspace_id) {
        await saveToProposal(proposal_id, result.image_url!, REPLICATE_API_TOKEN);
      }

      return jsonResponse(result);
    }

    // ── ACTION: generate_composite (LoRA full thumbnail + NB2 background) ──
    if (action === 'generate_composite') {
      const { thumbnail_prompt, background_prompt, lora_model, lora_version, trigger_word } = body;

      if (!thumbnail_prompt) {
        return jsonResponse({ success: false, error: 'thumbnail_prompt is required' }, 400);
      }
      if (!lora_model) {
        return jsonResponse({ success: false, error: 'lora_model is required (e.g. owner/model-name)' }, 400);
      }

      console.log('[thumbnail-generate] Composite generation starting...');
      console.log('[thumbnail-generate] LoRA model:', lora_model, 'version:', lora_version);
      console.log('[thumbnail-generate] Trigger word:', trigger_word);

      // Step 1: Generate full thumbnail with LoRA (person + scene in one image)
      console.log('[thumbnail-generate] Step 1: Generating full thumbnail with LoRA...');
      const thumbnailResult = await generateWithLora(
        thumbnail_prompt,
        lora_model,
        lora_version,
        REPLICATE_API_TOKEN
      );

      // Step 2: Generate background-only with Nano Banana 2 as alternative
      let bgResult = { success: false, image_url: undefined as string | undefined, error: undefined as string | undefined };
      if (background_prompt) {
        console.log('[thumbnail-generate] Step 2: Generating background with Nano Banana 2...');
        bgResult = await generateImage(background_prompt, 'nano-banana-2', REPLICATE_API_TOKEN);
      }

      return jsonResponse({
        success: true,
        thumbnail_url: thumbnailResult.success ? thumbnailResult.image_url : null,
        thumbnail_error: thumbnailResult.success ? null : thumbnailResult.error,
        background_url: bgResult.success ? bgResult.image_url : null,
        background_error: bgResult.success ? null : bgResult.error,
      });
    }

    return jsonResponse({ success: false, error: 'Invalid action. Use "assess", "generate", or "generate_composite".' }, 400);
  } catch (error) {
    console.error('Error in thumbnail-generate:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ success: false, error: msg }, 500);
  }
});

// ── Helpers ──

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateImage(
  prompt: string,
  model: string | undefined,
  token: string
): Promise<{ success: boolean; image_url?: string; error?: string; prediction_id?: string }> {
  const useNanoBanana = model === 'nano-banana-2';

  const modelInput: Record<string, unknown> = {
    prompt,
    aspect_ratio: '16:9',
    num_outputs: 1,
    output_format: 'png',
    output_quality: 90,
  };

  const modelEndpoint = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';

  const createRes = await fetch(modelEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({ input: modelInput }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Replicate API error:', errText);
    return { success: false, error: `Replicate API error [${createRes.status}]: ${errText}` };
  }

  const prediction = await createRes.json();

  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return { success: true, image_url: outputUrl, prediction_id: prediction.id };
  }

  // Poll if still processing
  if (prediction.status === 'processing' || prediction.status === 'starting') {
    return await pollPrediction(prediction, token);
  }

  return { success: false, error: `Unexpected status: ${prediction.status}` };
}

async function generateWithLora(
  prompt: string,
  loraModel: string,
  loraVersion: string | undefined,
  token: string
): Promise<{ success: boolean; image_url?: string; error?: string }> {
  // If we have a specific version, use the versioned predictions endpoint
  // Otherwise, use the model-based endpoint
  let endpoint: string;
  let body: Record<string, unknown>;

  if (loraVersion) {
    endpoint = 'https://api.replicate.com/v1/predictions';
    body = {
      version: loraVersion,
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: '16:9',
        output_format: 'png',
        guidance_scale: 3.5,
        output_quality: 90,
        num_inference_steps: 28,
      },
    };
  } else {
    endpoint = `https://api.replicate.com/v1/models/${loraModel}/predictions`;
    body = {
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: '16:9',
        output_format: 'png',
        guidance_scale: 3.5,
        output_quality: 90,
        num_inference_steps: 28,
      },
    };
  }

  console.log('[thumbnail-generate] LoRA endpoint:', endpoint);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[thumbnail-generate] LoRA generation error:', res.status, errText);
    return { success: false, error: `LoRA generation error [${res.status}]: ${errText}` };
  }

  const prediction = await res.json();

  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return { success: true, image_url: outputUrl };
  }

  if (prediction.status === 'processing' || prediction.status === 'starting') {
    return await pollPrediction(prediction, token);
  }

  return { success: false, error: `LoRA prediction status: ${prediction.status}` };
}

async function pollPrediction(
  prediction: Record<string, any>,
  token: string
): Promise<{ success: boolean; image_url?: string; error?: string; prediction_id?: string }> {
  const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
  let result = prediction;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    result = await pollRes.json();
    if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') break;
  }

  if (result.status === 'succeeded' && result.output) {
    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    return { success: true, image_url: outputUrl, prediction_id: result.id };
  }

  return { success: false, error: `Prediction ${result.status}: ${result.error || 'Unknown'}` };
}

async function saveToProposal(proposalId: string, imageUrl: string, _token: string) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: existing } = await supabase
      .from('ai_proposals')
      .select('thumbnail_urls')
      .eq('id', proposalId)
      .single();
    const urls = existing?.thumbnail_urls || [];
    urls.push(imageUrl);
    await supabase
      .from('ai_proposals')
      .update({ thumbnail_urls: urls, requires_thumbnail_generation: false })
      .eq('id', proposalId);
  } catch (e) {
    console.error('Failed to update proposal with thumbnail URL:', e);
  }
}

function buildAssessment(videoTitle: string, thumbnailUrl: string | undefined) {
  return {
    psychology_flow: {
      visual_stun_gun: {
        score: null,
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
      composition_type: null,
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
