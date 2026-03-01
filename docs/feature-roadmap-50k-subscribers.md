# Hustling Labs Mission Control Hub — 15 Features to Reach 50K Subscribers

## Context

Hustling Labs is at 21K subscribers targeting 50K in 10 months. The Mission Control Hub already has a strong foundation: full CRM, deals pipeline, video queue, YouTube analytics, monetization tracking, email inbox, AI proposals, and sponsor discovery. The gaps lie in **content intelligence** (no SRT/retention analysis, no video-queue-to-analytics linkage), **outreach automation** (no email sequences, no templated sponsor outreach), and **data-driven content decisions** (no A/B tracking, no content-to-subscriber correlation). The 15 features below close these gaps, ordered by impact.

---

## Feature 1: SRT Upload & Retention Drop-off Analysis

| | |
|---|---|
| **Impact** | 10/10 |
| **ROI** | High value / Medium effort — directly improves content quality which is the #1 lever for subscriber growth |

**What it does**: Upload `.srt` subtitle files per video, parse them into timestamped transcript segments, then overlay the transcript on a retention curve chart. Highlights exactly *what was being said* at each viewer drop-off point so you can identify patterns (bad hooks, slow intros, tangents).

**Claude Prompt**:
> Build an SRT retention analysis feature for Mission Control Hub. This involves:
>
> 1. **Database**: Create a new migration with two tables:
>    - `video_transcripts` (id UUID, workspace_id, video_queue_id INT FK → video_queue, youtube_video_id TEXT, srt_raw TEXT, parsed_segments JSONB, uploaded_at, created_at). The parsed_segments column stores an array of `{index, start_seconds, end_seconds, text}`.
>    - `video_retention_data` (id UUID, workspace_id, youtube_video_id TEXT, retention_points JSONB, fetched_at). retention_points is an array of `{elapsed_seconds, retention_percent}`.
>
> 2. **SRT Parser**: Create `src/lib/srt-parser.ts` — a pure function `parseSRT(raw: string): SrtSegment[]` that parses standard SRT format into `{index, startSeconds, endSeconds, text}` objects. Handle edge cases (BOM, \r\n, empty lines).
>
> 3. **Upload UI**: In `VideoQueueDetails.tsx`, add a "Transcript & Retention" tab. Include a file dropzone that accepts `.srt` files, parses them client-side, and stores both the raw SRT and parsed segments in `video_transcripts`. Show the parsed transcript as a scrollable list with timestamps.
>
> 4. **Retention Chart**: Using Recharts (already installed), create `src/components/video-queue/RetentionChart.tsx`. Render an AreaChart of retention_percent (Y) vs elapsed_seconds (X). Below the chart, show the transcript segments aligned to the timeline. When hovering over the chart, highlight the corresponding transcript segment. Color-code segments where retention drops more than 5% as red zones.
>
> 5. **Hook**: Create `src/hooks/use-video-transcripts.ts` with `useVideoTranscript(videoQueueId)`, `useUploadTranscript()`, `useRetentionData(youtubeVideoId)`.
>
> 6. **Retention Data Entry**: For now, allow manual entry of retention data points (CSV paste: seconds,percent) since YouTube Analytics API retention data requires OAuth with YouTube Studio. Add a simple paste box in the Retention tab.
>
> Reuse existing patterns: follow the hook structure from `use-video-queue.ts`, use the same Recharts patterns from `AnalyticsPage.tsx`, use the same card/tab styling from the existing codebase.

---

## Feature 2: Video Queue ↔ YouTube Stats Linking

| | |
|---|---|
| **Impact** | 9/10 |
| **ROI** | Very high value / Low effort — connects your planning to your results, enabling data-driven content decisions |

**What it does**: Links published video_queue entries to their corresponding youtube_video_stats records. Once linked, you can see real performance data (views, CTR, engagement) directly on your video queue cards and track which content *ideas* turn into the best *performers*.

**Claude Prompt**:
> Add a feature to link video_queue items to youtube_video_stats in Mission Control Hub.
>
> 1. **Database**: Add a `youtube_video_id TEXT` column to the `video_queue` table via migration. Add a unique partial index on `(workspace_id, youtube_video_id) WHERE youtube_video_id IS NOT NULL`.
>
> 2. **Link UI**: In `VideoQueueDetails.tsx`, when a video's status is "published", show a "Link YouTube Video" section. Fetch available youtube_video_stats for the workspace (from `use-youtube-analytics.ts` — `useYouTubeVideoStats()`), display them in a searchable dropdown (by title), and save the selected `youtube_video_id` to the video_queue row.
>
> 3. **Performance Badge**: On `VideoQueuePage.tsx` list/card views, for linked videos show a small performance badge with views count and engagement rate pulled from `youtube_video_stats`.
>
> 4. **Content Performance Report**: On `AnalyticsPage.tsx`, add a new section "Content Pipeline → Performance" that joins video_queue (planning data: time in each stage, priority, platform targets) with youtube_video_stats (outcome data: views, CTR, engagement). Show a table with columns: Title, Days in Pipeline, Priority, Views, CTR, Engagement Rate, Subs/Video estimate.
>
> 5. **Update hooks**: Extend `useUpdateVideo` in `use-video-queue.ts` to accept `youtubeVideoId`. Extend `VideoQueueItem` interface accordingly.
>
> Reuse: `useYouTubeVideoStats()` from `src/hooks/use-youtube-analytics.ts`, existing video queue CRUD from `src/hooks/use-video-queue.ts`.

---

## Feature 3: Sponsor Outreach Email Sequences

| | |
|---|---|
| **Impact** | 9/10 |
| **ROI** | High value / Medium effort — automates the most time-consuming part of monetization which funds better content |

**What it does**: Create multi-step email sequences for sponsor outreach. Define a template sequence (e.g., Day 0: intro pitch, Day 3: follow-up, Day 7: value add, Day 14: final check-in), attach it to a deal or contact, and track opens/replies. Integrates with existing Resend email sending.

**Claude Prompt**:
> Build an email sequence system for sponsor outreach in Mission Control Hub.
>
> 1. **Database migration** — two tables:
>    - `email_sequences` (id UUID PK, workspace_id, name, description, steps JSONB, status 'active'|'paused'|'archived', created_at, updated_at). `steps` is an array of `{step_number, delay_days, subject_template, body_template, send_time_preference}`.
>    - `email_sequence_enrollments` (id UUID PK, workspace_id, sequence_id FK, contact_id FK, deal_id FK nullable, current_step INT default 0, status 'active'|'paused'|'completed'|'replied', enrolled_at, next_send_at, completed_at). Add RLS policies matching existing patterns.
>
> 2. **Sequence Builder UI**: Create `src/pages/EmailSequencesPage.tsx` with a list of sequences and a builder dialog. The builder lets you add steps with delay (days), subject line (with `{{first_name}}`, `{{company_name}}` merge tags), and body (rich text with merge tags). Use existing Dialog and form patterns.
>
> 3. **Enrollment**: From `ContactDetailSheet.tsx` and `DealDetailSheet.tsx`, add an "Enroll in Sequence" button that shows available sequences and enrolls the contact. Show enrollment status in the activity timeline.
>
> 4. **Sequence Dashboard**: Show active enrollments with next-send dates, allow pause/resume/cancel. Track which step each contact is on.
>
> 5. **Sending**: Create a Supabase Edge Function `process-sequences` that runs on a cron schedule, finds enrollments where `next_send_at <= now()` and status='active', renders templates with merge tags from contact/company data, sends via the existing `send-email` function, advances the step, and logs an activity.
>
> 6. **Auto-pause on reply**: When an email reply is detected (via inbox integration), automatically pause the sequence for that contact and create a notification.
>
> Reuse: `send-email` Edge Function, `ComposeEmailDialog.tsx` patterns, `useContacts()`, `useDeals()`, activity logging patterns from `use-contacts.ts`.

---

## Feature 4: Deal Pipeline Velocity & Stage Analytics

| | |
|---|---|
| **Impact** | 8/10 |
| **ROI** | High value / Low effort — know exactly where deals stall so you can fix your sales process |

**What it does**: Track how long deals spend in each pipeline stage. Show average days per stage, identify bottlenecks, and forecast revenue timing. Critical for optimizing sponsor deal flow.

**Claude Prompt**:
> Add deal velocity analytics to the Deals page in Mission Control Hub.
>
> 1. **Database**: Create a `deal_stage_history` table via migration (id UUID, workspace_id, deal_id FK, from_stage TEXT, to_stage TEXT, changed_at TIMESTAMPTZ DEFAULT now(), changed_by UUID). Add a database trigger on the `deals` table that inserts a row into `deal_stage_history` whenever the `stage` column changes (use the existing `handle_deal_stage_change` trigger pattern from `20260228150000_deal_automation_and_attribution.sql` as reference).
>
> 2. **Velocity Metrics Component**: Create `src/components/deals/PipelineVelocity.tsx`. Query `deal_stage_history` and calculate:
>    - Average days in each stage (for closed_won deals)
>    - Current average deal cycle time (prospecting → closed_won)
>    - Conversion rate between each stage
>    - Bottleneck identification (longest average stage)
>    Display as a horizontal funnel visualization with days labeled.
>
> 3. **Integration**: Add the velocity component as a collapsible section at the top of `DealsPage.tsx`, below the existing pipeline value/forecast metrics.
>
> 4. **Per-Deal Timeline**: In `DealDetailSheet.tsx`, show a mini timeline of stage transitions with dates and duration in each stage.
>
> 5. **Hook**: Create `src/hooks/use-deal-velocity.ts` with `useDealVelocity()` and `useDealStageHistory(dealId)`.
>
> Reuse: Recharts bar/funnel charts (already in `AnalyticsPage.tsx`), deal hook patterns from `src/hooks/use-deals.ts`, existing deal stage constants.

---

## Feature 5: AI Content Suggestions Engine

| | |
|---|---|
| **Impact** | 8/10 |
| **ROI** | High value / Medium effort — uses your own analytics data to tell you what to create next |

**What it does**: Analyzes your youtube_video_stats (top performing formats, CTR patterns, engagement trends), current video_queue (gaps in pipeline), and growth_goals to generate AI-powered content suggestions. Suggests titles, identifies trending formats in your niche, and recommends optimal publish timing.

**Claude Prompt**:
> Extend the existing AI proposal system to generate content suggestions in Mission Control Hub.
>
> 1. **Extend AI Edge Function**: Modify `supabase/functions/ai-generate-proposals/index.ts` to include a new proposal type `content_suggestion`. When generating, include the following context for the AI:
>    - Top 10 performing videos (by views, engagement, CTR) from `youtube_video_stats`
>    - Content format analysis (which formats get most views — already computed in AnalyticsPage)
>    - Current video_queue items (to avoid duplicates)
>    - Growth goal and current subscriber count
>    - Publishing cadence data
>    The AI prompt should ask: "Based on this channel's performance data, suggest 3-5 video ideas that would maximize subscriber growth. For each, provide: title, format type, estimated impact, reasoning based on the data, and suggested priority."
>
> 2. **Content Suggestions Tab**: On `VideoQueuePage.tsx`, add an "AI Suggestions" button in the header that opens a dialog showing content_suggestion proposals from `ai_proposals`. Each suggestion card shows the proposed title, format, reasoning, and an "Add to Queue" button that creates a new video_queue entry pre-filled with the suggestion data.
>
> 3. **One-Click Add**: The "Add to Queue" action creates a video_queue item with status "idea", populates title/description from the AI suggestion, and marks the proposal as "approved".
>
> Reuse: `ai_proposals` table and `useProposals()` hook from `src/hooks/use-proposals.ts`, `ProposalCard` component from `src/components/ai-bridge/ProposalCard.tsx`, `useCreateVideo()` from `src/hooks/use-video-queue.ts`, existing AI Edge Function structure.

---

## Feature 6: Contact Engagement Scoring Model

| | |
|---|---|
| **Impact** | 8/10 |
| **ROI** | High value / Low effort — prioritize outreach to contacts most likely to convert |

**What it does**: Replaces the static lead score with a dynamic engagement score calculated from real activity data: email interactions, deal progression, follow-up completion, recency of contact. Surfaces the hottest leads on the dashboard.

**Claude Prompt**:
> Build a dynamic contact engagement scoring system in Mission Control Hub.
>
> 1. **Scoring Function**: Create `src/lib/engagement-score.ts` with a `calculateEngagementScore(contact, activities, deals)` function. Score based on:
>    - Recency: +20 pts if contacted in last 7 days, +10 if last 30 days, 0 if older
>    - Activity volume: +5 pts per activity in last 30 days (cap at 30)
>    - Deal status: +20 if has open deal in negotiation/proposal, +10 if qualification
>    - Email engagement: +10 if replied to email, +5 per email sent
>    - Follow-up compliance: +10 if all reminders completed on time
>    - VIP tier bonus: platinum +15, gold +10, silver +5
>    Return a score 0-100 with a label: "Hot" (80+), "Warm" (50-79), "Cool" (20-49), "Cold" (<20).
>
> 2. **Score Display**: Update `ContactsTable.tsx` to show the engagement score as a colored badge. Add sorting by score. Update `ContactDetailSheet.tsx` to show score breakdown.
>
> 3. **Dashboard Widget**: Update `NeedsAttention.tsx` (in `src/components/dashboard/NeedsAttention.tsx`) to include a "Hot Leads" section showing top 5 contacts by engagement score.
>
> 4. **Hook**: Create `src/hooks/use-engagement-scores.ts` that computes scores for all contacts by joining contacts + activities + deals data (all already available via existing hooks).
>
> Reuse: `useContacts()`, `useActivities()` from `src/hooks/use-contacts.ts`, `useDeals()` from `src/hooks/use-deals.ts`, `LeadScore.tsx` component pattern from `src/components/crm/LeadScore.tsx`.

---

## Feature 7: Content Repurposing Tracker

| | |
|---|---|
| **Impact** | 7/10 |
| **ROI** | High value / Low effort — multiply reach from each video across platforms to accelerate subscriber growth |

**What it does**: Track repurposed content derived from each YouTube video (clips for TikTok, threads for X, carousels for Instagram, etc.). Shows repurposing status per video and ensures maximum distribution from every piece of content.

**Claude Prompt**:
> Add content repurposing tracking to the video queue in Mission Control Hub.
>
> 1. **Database**: Create migration with a `content_repurposes` table (id UUID, workspace_id, source_video_id INT FK → video_queue, platform TEXT, format TEXT CHECK IN ('clip', 'short', 'reel', 'thread', 'carousel', 'post', 'newsletter', 'blog', 'other'), title TEXT, status TEXT CHECK IN ('planned', 'in_progress', 'published'), published_url TEXT, published_at TIMESTAMPTZ, notes TEXT, created_at, updated_at). Add RLS policies.
>
> 2. **Repurposing Panel**: In `VideoQueueDetails.tsx`, add a "Repurpose" tab showing all repurposes for that video. Include an "Add Repurpose" form with platform dropdown (TikTok, Instagram, X, LinkedIn, Facebook, Newsletter, Blog), format, title, and status. Show a checklist-style view of planned repurposes.
>
> 3. **Repurpose Status on Cards**: On `VideoQueuePage.tsx`, for published videos, show a small indicator like "3/5 repurposed" showing how many repurposes are published vs planned.
>
> 4. **Repurposing Dashboard**: Add a summary widget on the dashboard (`Index.tsx`) or analytics page showing: total repurposes this month, repurpose rate (% of videos fully repurposed), platforms distribution.
>
> 5. **Hook**: Create `src/hooks/use-repurposes.ts` with CRUD operations following existing patterns.
>
> Reuse: Platform icons from `VideoQueuePage.tsx` (`getPlatformIcon`), status badge styling, existing tab patterns from `VideoQueueDetails.tsx`.

---

## Feature 8: Automated Follow-up Generation

| | |
|---|---|
| **Impact** | 7/10 |
| **ROI** | Medium value / Low effort — prevents deals and contacts from going cold |

**What it does**: Automatically creates follow-up reminders when deals sit in a stage too long or contacts haven't been reached in a configurable period. Reduces manual tracking and ensures no opportunity falls through the cracks.

**Claude Prompt**:
> Add automated follow-up generation to Mission Control Hub.
>
> 1. **Configuration**: Add a `automation_rules` table via migration (id UUID, workspace_id, rule_type TEXT CHECK IN ('deal_stale', 'contact_inactive', 'post_publish_followup'), config JSONB, enabled BOOLEAN DEFAULT true, created_at). Config examples:
>    - deal_stale: `{stage: "proposal", max_days: 5, reminder_title: "Follow up on proposal"}`
>    - contact_inactive: `{max_days_since_contact: 14, contact_statuses: ["active","lead"]}`
>
> 2. **Automation Settings UI**: Add a "Follow-up Automation" section in `SettingsPage.tsx`. Let users configure rules: "Create reminder when a deal sits in [stage] for more than [N] days", "Create reminder when a contact hasn't been contacted in [N] days".
>
> 3. **Edge Function**: Create `supabase/functions/auto-followups/index.ts` that runs on a cron schedule (daily). For each enabled rule, query for matching conditions (deals in stage X for >N days without a pending reminder, contacts with last_contact_date older than N days). Create `follow_up_reminders` entries and `notifications` using existing table structures.
>
> 4. **Dashboard Integration**: The auto-generated reminders will automatically appear in the existing `FollowUpReminders.tsx` component and `NeedsAttention.tsx` dashboard widget since they use the same table.
>
> Reuse: `follow_up_reminders` table, `useReminders()` from `src/hooks/use-reminders.ts`, `notifications` table, existing Edge Function patterns from `stale-deal-check/index.ts`.

---

## Feature 9: Sponsor Discovery → Outreach Templates

| | |
|---|---|
| **Impact** | 7/10 |
| **ROI** | High value / Low effort — completes the sponsor discovery → outreach pipeline |

**What it does**: When sponsors are discovered via the existing Sponsor Discovery page, auto-generate personalized outreach email templates based on the sponsor's brand, the creator's channel stats, and audience overlap. One-click to load into compose email.

**Claude Prompt**:
> Extend the Sponsor Discovery flow to generate outreach templates in Mission Control Hub.
>
> 1. **Template Generation**: In `SponsorDiscoveryPage.tsx`, after a sponsor is discovered and added to CRM, add a "Draft Outreach" button on each discovered sponsor card. When clicked, call the existing `ai-generate-proposals` Edge Function with a new proposal_type `sponsor_outreach` that includes: the sponsor's company name/industry, the channel's subscriber count and niche, top performing video stats, and audience demographics context. The AI generates a personalized pitch email.
>
> 2. **Template Preview**: Show the generated outreach in a preview dialog with editable subject and body fields. Include merge tags for personalization.
>
> 3. **Send or Save**: "Send Now" opens `ComposeEmailDialog` pre-filled with the template and the sponsor contact's email. "Save as Sequence" saves it as step 1 of a new email sequence (ties into Feature 3). "Save as Draft" stores it as an ai_proposal with type `sponsor_outreach`.
>
> 4. **Context Data**: Pull channel stats from `useChannelStats()`, top videos from `useYouTubeVideoStats()`, and video queue (upcoming content) to include in the pitch context.
>
> Reuse: `SponsorDiscoveryPage.tsx`, `ComposeEmailDialog.tsx`, `ai-generate-proposals` Edge Function, `useChannelStats()` and `useYouTubeVideoStats()` from `src/hooks/use-youtube-analytics.ts`.

---

## Feature 10: Weekly Performance Report UI

| | |
|---|---|
| **Impact** | 7/10 |
| **ROI** | Very high value / Very low effort — the Edge Function already exists, just needs a UI |

**What it does**: The `weekly-report` Edge Function already exists but has no UI. Build a report viewer that shows weekly snapshots: subscriber growth, video performance, deal pipeline changes, revenue, and content published. Essential for tracking progress toward 50K.

**Claude Prompt**:
> Build a Weekly Report viewer UI for Mission Control Hub. The `supabase/functions/weekly-report/index.ts` Edge Function already exists.
>
> 1. **Database**: Create a `weekly_reports` table via migration (id UUID, workspace_id, report_date DATE, report_data JSONB, created_at). The report_data stores: subscriber_change, views_gained, videos_published, deals_closed, revenue_earned, top_video, engagement_avg, content_pipeline_status.
>
> 2. **Report Page**: Create `src/pages/WeeklyReportPage.tsx` with a list of past reports (card per week) and a detailed view. Each report card shows: week date range, subscriber delta, revenue, videos published. Clicking opens a detailed breakdown with charts.
>
> 3. **Detailed Report View**: Show sections for:
>    - Subscriber Growth (delta + trend mini-chart)
>    - Video Performance (published videos with views/engagement)
>    - Deal Pipeline (new deals, stage changes, closed deals)
>    - Revenue Summary (by source)
>    - Content Pipeline Health (items per stage)
>    - Goal Progress (% toward 50K target)
>
> 4. **Auto-generation**: Modify the `weekly-report` Edge Function to store its output in the `weekly_reports` table. Add a "Generate Report" button on the page that triggers the function manually.
>
> 5. **Navigation**: Add "Weekly Reports" to the navigation in `src/config/navigation.ts` under the Insights section.
>
> Reuse: Chart patterns from `AnalyticsPage.tsx`, KPI card from `src/components/dashboard/KpiCard.tsx`, existing Edge Function `weekly-report/index.ts`, navigation config from `src/config/navigation.ts`.

---

## Feature 11: A/B Title & Thumbnail Testing Tracker

| | |
|---|---|
| **Impact** | 7/10 |
| **ROI** | Medium value / Low effort — CTR is the #1 factor YouTube algorithm weighs for recommendations |

**What it does**: Track title and thumbnail variations for each video. Log when you change a title/thumbnail post-publish, record CTR before and after, and build a knowledge base of what title patterns and thumbnail styles perform best for your channel.

**Claude Prompt**:
> Add A/B title and thumbnail tracking to the video queue in Mission Control Hub.
>
> 1. **Database**: Create migration with `video_ab_tests` table (id UUID, workspace_id, video_queue_id INT FK, youtube_video_id TEXT, test_type TEXT CHECK IN ('title', 'thumbnail'), variant_a TEXT, variant_b TEXT, variant_a_ctr NUMERIC(5,2), variant_b_ctr NUMERIC(5,2), variant_a_views INT, variant_b_views INT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ, winner TEXT CHECK IN ('a', 'b', 'inconclusive'), notes TEXT, created_at). Add RLS policies.
>
> 2. **A/B Test Tab**: In `VideoQueueDetails.tsx`, add an "A/B Tests" tab for published videos. Show a form to log a test: original title/thumbnail (variant A), new title/thumbnail (variant B), CTR for each, date range, and winner selection.
>
> 3. **Insights Aggregation**: Create a "Title & Thumbnail Insights" section on `AnalyticsPage.tsx` that shows: total tests run, average CTR improvement, most successful title patterns (keyword analysis), thumbnail style wins.
>
> 4. **Hook**: Create `src/hooks/use-ab-tests.ts` with CRUD operations.
>
> Reuse: Tab patterns from `VideoQueueDetails.tsx`, Recharts from `AnalyticsPage.tsx`, form patterns from the codebase.

---

## Feature 12: Content-to-Subscriber Correlation Dashboard

| | |
|---|---|
| **Impact** | 6/10 |
| **ROI** | Medium value / Low effort — answers "which videos actually grow the channel?" |

**What it does**: Correlates video publish dates with subscriber growth spikes. Shows which videos drove the most subscriber growth by comparing subscriber count changes around publish dates. Identifies your "subscriber magnet" content patterns.

**Claude Prompt**:
> Build a content-to-subscriber correlation view in the Analytics page of Mission Control Hub.
>
> 1. **New Section in AnalyticsPage.tsx**: Add a "Subscriber Impact" section after the existing charts. For each video in `youtube_video_stats`, calculate the subscriber delta from the channel stats snapshots in the 7 days following its `published_at` date. Show a bar chart with video titles on X-axis and estimated subscriber impact on Y-axis.
>
> 2. **Correlation Table**: Below the chart, show a table: Video Title, Published Date, Views (first 7 days), Subscriber Delta (7 days post-publish), CTR, Engagement Rate, Format Type. Sort by subscriber impact.
>
> 3. **Pattern Detection**: Add a summary card that highlights: "Your best subscriber-generating format is [X] with avg +[N] subs per video" by grouping videos by the format analysis categories already computed in `AnalyticsPage.tsx`.
>
> 4. **Data Source**: Join `youtube_video_stats.published_at` with `youtube_channel_stats.fetched_at` to estimate subscriber deltas. This is an approximation but directionally valuable.
>
> Reuse: `useYouTubeVideoStats()`, `useYouTubeChannelStats()` from `src/hooks/use-youtube-analytics.ts`, existing `formatAnalysis` computed value in `AnalyticsPage.tsx`, Recharts BarChart patterns already in the page.

---

## Feature 13: Script & Notes Workspace

| | |
|---|---|
| **Impact** | 6/10 |
| **ROI** | Medium value / Medium effort — keeps all content planning in one place |

**What it does**: Adds a rich-text script editor to each video queue item. Write scripts, add notes, structure outlines — all within the video detail view. No more switching between Google Docs and the command center.

**Claude Prompt**:
> Add a script/notes workspace to video queue items in Mission Control Hub.
>
> 1. **Database**: Add a `script_content TEXT` column to the `video_queue` table via migration. This stores markdown-formatted script content.
>
> 2. **Script Tab**: In `VideoQueueDetails.tsx`, add a "Script" tab with a textarea/editor for writing scripts. Use a simple markdown-capable textarea (no need for a heavy WYSIWYG — keep it lightweight). Include a character/word count display.
>
> 3. **Script Sections**: Support a simple outline format with headers (## Hook, ## Intro, ## Main Content, ## CTA, ## Outro) that auto-generates a table of contents sidebar.
>
> 4. **Auto-Save**: Debounced auto-save (500ms after last keystroke) using `useUpdateVideo` from `use-video-queue.ts`.
>
> 5. **Script in Form**: Also add the script field to `VideoQueueFormPage.tsx` for the create/edit flow.
>
> Reuse: `useUpdateVideo()` from `src/hooks/use-video-queue.ts`, existing tab patterns from `VideoQueueDetails.tsx`, textarea component from `src/components/ui/textarea.tsx`.

---

## Feature 14: Bulk Contact Import from Sponsor Discovery

| | |
|---|---|
| **Impact** | 6/10 |
| **ROI** | Medium value / Low effort — scales outreach volume |

**What it does**: Extends the existing Sponsor Discovery page to bulk-import all discovered sponsors into the CRM at once (currently one at a time). Adds smart duplicate detection and auto-creates deals in "prospecting" stage for each.

**Claude Prompt**:
> Enhance the Sponsor Discovery page with bulk import capabilities in Mission Control Hub.
>
> 1. **Bulk Selection**: In `SponsorDiscoveryPage.tsx`, add checkboxes to each discovered sponsor card and a "Select All" option. Add a "Bulk Import to CRM" button in the header that appears when any sponsors are selected.
>
> 2. **Duplicate Detection**: Before importing, check each sponsor against existing companies in the workspace (match by name similarity and website domain). Show a preview dialog listing: new companies to create, potential duplicates found, and deals to create.
>
> 3. **Bulk Import Action**: On confirm, for each non-duplicate:
>    - Create a company via `useCreateCompany()` from `src/hooks/use-companies.ts`
>    - Create a deal in "prospecting" stage via `useCreateDeal()` from `src/hooks/use-deals.ts` with the discovery metadata
>    - Log an activity noting the discovery source
>
> 4. **Import Summary**: After import, show a toast summary: "Imported X companies, created X deals, skipped X duplicates".
>
> Reuse: `useCreateCompany()` from `src/hooks/use-companies.ts`, `useCreateDeal()` from `src/hooks/use-deals.ts`, `useCreateActivity()` from `src/hooks/use-contacts.ts`, `DuplicateWarning.tsx` pattern from `src/components/crm/DuplicateWarning.tsx`.

---

## Feature 15: Video Queue Data Integrity Fix

| | |
|---|---|
| **Impact** | 5/10 |
| **ROI** | High value / Low effort — fixes a technical debt issue that causes data inconsistency |

**What it does**: The video_queue table has proper relational columns (`platforms`, `is_sponsored`, `company_id`, `sponsoring_company_id`, `assigned_to`) but the hooks in `use-video-queue.ts` ignore them and store everything in a `metadata` JSONB blob instead. This fix migrates the hooks to use the actual columns, improving query performance, data integrity, and enabling proper foreign key joins.

**Claude Prompt**:
> Fix the video queue data layer in Mission Control Hub to use relational columns instead of JSONB metadata.
>
> 1. **Audit**: The `video_queue` table (migration `20260226000000_video_queue.sql`) has columns: `platforms TEXT[]`, `is_sponsored BOOLEAN`, `company_id UUID FK`, `sponsoring_company_id UUID FK`, `assigned_to UUID`. But `src/hooks/use-video-queue.ts` stores these values inside a `metadata JSONB` column instead.
>
> 2. **Migration**: Add a `scheduled_date` column alias or verify it exists. Add a `metadata JSONB DEFAULT '{}'` column if not already present (check the actual table definition). Create a data migration that moves `metadata.platforms` → `platforms`, `metadata.isSponsored` → `is_sponsored`, `metadata.company.id` → `company_id`, etc. for existing rows.
>
> 3. **Update Hooks**: Rewrite `useCreateVideo()` and `useUpdateVideo()` in `src/hooks/use-video-queue.ts` to write directly to the relational columns instead of stuffing everything into metadata. Keep metadata only for truly flexible data (checklists, assignedTo display info).
>
> 4. **Update mapRow**: Update the `mapRow` function to read from the proper columns with fallback to metadata for backward compatibility.
>
> 5. **Update Queries**: Update `useVideoQueue()` to use `.select("*, companies!company_id(id, name, logo_url), sponsors:companies!sponsoring_company_id(id, name, logo_url)")` for proper joins instead of reading from JSONB.
>
> Reuse: All changes are in `src/hooks/use-video-queue.ts` and a new migration file.

---

## Implementation Priority Order

For maximum impact on the 21K → 50K journey, implement in this order:

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| 1 | SRT Upload & Retention Analysis | 10/10 | Medium |
| 2 | Video Queue ↔ YouTube Stats Linking | 9/10 | Low |
| 3 | Sponsor Outreach Email Sequences | 9/10 | Medium |
| 4 | Deal Pipeline Velocity | 8/10 | Low |
| 5 | AI Content Suggestions | 8/10 | Medium |
| 6 | Contact Engagement Scoring | 8/10 | Low |
| 7 | Content Repurposing Tracker | 7/10 | Low |
| 8 | Automated Follow-up Generation | 7/10 | Low |
| 9 | Sponsor Discovery → Outreach Templates | 7/10 | Low |
| 10 | Weekly Report UI | 7/10 | Very Low |
| 11 | A/B Title & Thumbnail Tracker | 7/10 | Low |
| 12 | Content-to-Subscriber Correlation | 6/10 | Low |
| 13 | Script & Notes Workspace | 6/10 | Medium |
| 14 | Bulk Sponsor Import | 6/10 | Low |
| 15 | Video Queue Data Integrity Fix | 5/10 | Low |

## Verification

After implementing any feature:
1. Run `npm run build` to verify no TypeScript errors
2. Run `npm run lint` to check for linting issues
3. Run `npm test` if tests exist for modified modules
4. Manual test the feature in the browser at `localhost:5173`
5. Verify Supabase migrations apply cleanly: `npx supabase db push`
