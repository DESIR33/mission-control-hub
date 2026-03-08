

## Video Optimization Agent — Per-Video Analysis with Priority Scoring

### What We're Building

A new edge function `video-optimizer-agent` that:
1. Fetches ALL videos with their analytics from the last 30 days
2. Scores and ranks videos by performance (prioritizing dying/below-average videos)
3. For each underperforming video, sends its full analytics to the AI agent asking whether title, thumbnail, tags, or description should be optimized
4. Creates actionable proposals (title options, new descriptions, tag sets, thumbnail concepts) in the existing `ai_proposals` table
5. Can be triggered manually from the UI or scheduled via cron

We also need to store video descriptions and tags, which are currently missing from `youtube_video_stats`.

### Architecture

```text
┌──────────────────────────┐
│  UI: "Optimize Videos"   │
│  button on Agent Hub     │
└────────┬─────────────────┘
         │ invoke
         ▼
┌──────────────────────────┐
│ video-optimizer-agent    │
│ Edge Function            │
│                          │
│ 1. Fetch all videos +    │
│    30-day analytics      │
│ 2. Score & rank videos   │
│ 3. Select bottom 50%    │
│ 4. For each: send to AI │
│    with full context     │
│ 5. AI returns proposals  │
│    via tool calls        │
│ 6. Save proposals to DB │
└──────────────────────────┘
```

### Database Changes

**Migration**: Add `description` and `tags` columns to `youtube_video_stats`, plus add these to the YouTube sync function so they get populated.

```sql
ALTER TABLE public.youtube_video_stats
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS tags text[];
```

### Edge Function: `video-optimizer-agent`

This is a dedicated function (not routed through the general orchestrator) for reliability and clarity:

1. **Fetch data**: Pull all videos from `youtube_video_stats` + aggregate 30-day analytics from `youtube_video_analytics`
2. **Score videos**: Calculate a composite "health score" per video based on:
   - Views in last 30 days vs channel average
   - CTR vs channel average
   - View velocity trend (declining = worse)
   - Subscriber gain/loss ratio
3. **Prioritize**: Sort by health score ascending (worst first), take top 10-15 underperformers
4. **AI analysis**: For each video, send to OpenRouter with full context (title, description, tags, thumbnail URL, all metrics, percentile rank) and a prompt asking for specific optimization recommendations
5. **Create proposals**: Use tool calling to create `ai_proposals` with types: `video_title_optimization`, `video_description_optimization`, `video_tags_optimization`, `video_thumbnail_optimization`
6. **Save insights**: Store findings to memory for future reference

The AI prompt will instruct the model to:
- Provide 3-5 alternative title options with rationale
- Write a full optimized description with timestamps, keywords, CTAs
- Suggest a complete tag set (30 tags)
- Describe 2-3 thumbnail concepts with composition, text overlay, and emotional hook

### Frontend Changes

**`AgentHubContent.tsx`**: Add an "Optimize Videos" button next to "Run All Agents" that invokes the new edge function.

**`use-agents.ts`**: Add a `useRunVideoOptimizer` hook that calls the new edge function.

### YouTube Sync Update

**`youtube-sync/index.ts`**: Update the sync function to also store `description` and `tags` from the YouTube Data API response into `youtube_video_stats`.

### Files to Create/Edit

| File | Change |
|------|--------|
| New migration | Add `description`, `tags` columns to `youtube_video_stats` |
| `supabase/functions/video-optimizer-agent/index.ts` | New edge function |
| `supabase/config.toml` | Register new function |
| `supabase/functions/youtube-sync/index.ts` | Store description + tags during sync |
| `src/hooks/use-agents.ts` | Add `useRunVideoOptimizer` hook |
| `src/components/ai-hub/AgentHubContent.tsx` | Add "Optimize Videos" button |

