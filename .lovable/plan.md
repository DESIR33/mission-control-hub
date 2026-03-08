

## Plan: Add Competitor Comparison to Video Optimizer Agent

### What it does
When the video optimizer analyzes underperforming videos, it will also fetch competitor channels from `competitor_channels`, use the YouTube API to search for similar-topic videos on those channels, and include that competitor data in the AI prompt so the optimization suggestions are informed by what's working for competitors.

### Changes

**1. Update `supabase/functions/video-optimizer-agent/index.ts`**

Between steps 2 (fetch analytics) and 3 (score & rank), add a new step:

- Query `competitor_channels` for the workspace
- Query `workspace_integrations` for the YouTube API key
- For each underperforming video batch, use the YouTube Data API `search` endpoint to find competitor videos with similar keywords (extracted from the video title)
- Fetch stats for matched competitor videos via the `videos` endpoint
- Format competitor data into the AI prompt context

Specifically:
- After line ~95, fetch competitors and YouTube API key
- In the batch loop (~line 284), for each video extract 2-3 keywords from the title, search each competitor channel for matching videos (limit 3 per competitor), fetch their view counts/stats
- Append competitor comparison data to the `videoContexts` string sent to the AI
- Update the system prompt to instruct the AI to reference competitor performance in its recommendations
- Add a `competitor_comparison` field to the tool's parameters schema and store it in the proposal `metadata`

**2. Update AI tool definition and prompt**

- Add `competitor_insights` field to `create_video_optimization` parameters (string describing how competitors handle similar topics)
- Update system prompt to include instructions like: "Compare each video against competitor videos on similar topics. Reference specific competitor performance when making recommendations."
- Store competitor insights in proposal metadata so the UI can display them

**3. Update `VideoOptimizationPanel.tsx`**

- Display competitor comparison data from `metadata.competitor_data` on each proposal card (e.g., "Competitor X's similar video got 50K views with title '...'")
- Show as a collapsible section under each proposal

### API quota consideration
- YouTube search costs 100 quota units per call; video stats cost 1 unit per call
- With 10 videos and 3 competitors, worst case = 30 search calls (3000 units) + stats calls
- To stay within the 10K daily quota: limit to top 5 underperformers for competitor search, max 2 competitors, 1 search per video
- Add a `skip_competitor_analysis` flag to allow bypassing this step

### No database changes needed
All competitor data is stored in existing proposal `metadata` jsonb field.

