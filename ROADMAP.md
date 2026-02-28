# Hustling Labs Mission Control Hub — Strategic Feature Roadmap
## From 21K to 50K Subscribers in 10 Months

### Context

Hustling Labs has built a comprehensive business command center (React/TypeScript + Supabase) with CRM, deals pipeline, content queue, monetization tracking, AI Bridge, inbox, notifications, and integrations. The **core CRUD is solid** — contacts, companies, deals, video queue, and affiliate programs all work end-to-end with Supabase.

**The critical gap:** Most power features are UI shells with no backend. YouTube analytics falls back to a hardcoded `21000` subscriber count. The AI Bridge runs on mock data with zero LLM connectivity. The inbox has 1000+ lines of UI but sends no emails. Integrations (Firecrawl, Twitter, Outlook) have config forms but no API calls. The dashboard has duplicate overlapping code and spreads revenue evenly across months because it can't attribute by date.

This roadmap closes these gaps with 10 features ranked by impact on the 21K → 50K subscriber growth goal.

---

## The 10 Features

### 1. Live YouTube Data API Integration
**Impact: 10/10**

The `YouTubeGrowth` widget shows a hardcoded 21K fallback. The `handleSync` button toasts "YouTube sync requires a backend worker." Tables (`youtube_channel_stats`, `youtube_video_stats`) and hooks (`useYouTubeChannelStats`, `useYouTubeVideoStats`) exist and are ready — the only missing piece is a Supabase Edge Function that calls YouTube Data API v3.

**Prompt for Claude:**
> Build a Supabase Edge Function at `supabase/functions/youtube-sync/index.ts` that reads the YouTube API key and channel ID from `workspace_integrations` (integration_key='youtube'), calls `channels.list` (part=statistics,snippet) for subscriber/video/view counts, inserts into `youtube_channel_stats`, then calls `search.list` + `videos.list` for per-video stats and upserts into `youtube_video_stats`. Update `growth_goals.current_value` with the latest subscriber count. Modify `src/components/dashboard/YouTubeGrowth.tsx` to replace the placeholder `handleSync` with `supabase.functions.invoke('youtube-sync')`, invalidate query keys on success. Add a `useSyncYouTube` mutation to `src/hooks/use-youtube-analytics.ts`. Reference the schema at `supabase/migrations/20260228120000_youtube_analytics.sql`.

**ROI:** Unlocks the entire analytics feedback loop. Every feature below depends on real data. Creators who track analytics daily grow 3-5x faster than those who guess.

---

### 2. AI-Powered Content Strategy Advisor (Connect LLM to AI Bridge)
**Impact: 9.5/10**

The AI Bridge page, proposal types, approval workflow, and `ai_proposals` table are fully built — but run on mock data from `src/data/mock-proposals.ts`. Zero LLM connectivity exists anywhere in the codebase.

**Prompt for Claude:**
> Build a Supabase Edge Function at `supabase/functions/ai-generate-proposals/index.ts` that gathers context (youtube_video_stats top 20 by views, latest channel stats, active contacts, open deals, video queue, growth goals), sends it to the Anthropic API with a YouTube growth strategist system prompt, parses the response into structured proposals matching the `AiProposal` interface, and inserts them into `ai_proposals` with status='pending'. Add a new proposal_type `content_suggestion` to `src/types/proposals.ts` and the filter in `src/pages/AiBridgePage.tsx`. Add a "Generate AI Proposals" button to the AI Bridge page header that invokes the function and invalidates query keys. Store the Anthropic API key as a Supabase secret.

**ROI:** Saves 5+ hrs/week on content strategy decisions. AI analyzing real performance data identifies patterns humans miss ("your tutorials get 3x the subscriber conversion of vlogs").

---

### 3. Video Performance Analytics Dashboard
**Impact: 9/10**

`youtube_video_stats` stores views, likes, comments, watch_time, CTR, and published_at — but nothing visualizes it. The `useYouTubeVideoStats` hook exists but no page renders it meaningfully.

**Prompt for Claude:**
> Create `/src/pages/AnalyticsPage.tsx` at route `/analytics`. Add a sidebar nav item with `BarChart3` icon in `src/components/AppSidebar.tsx`. Display: (1) Channel overview with subscriber line chart over time, (2) Sortable video performance table (title, views, likes, comments, CTR%, watch time, published date), (3) Performance quadrant scatter plot (Views vs CTR% to find subscriber magnets), (4) Growth velocity metric (subscribers gained per video), (5) Content format analysis grouping videos by title patterns with aggregate stats. Use existing hooks from `src/hooks/use-youtube-analytics.ts`, recharts for charts, and follow the page pattern from `src/pages/Index.tsx`.

**ROI:** Tells the creator exactly which topics and formats drive growth. Estimated 20-40% faster growth through data-informed content decisions.

---

### 4. Content Calendar with Publishing Cadence Tracking
**Impact: 8.5/10**

The video queue tracks videos through statuses with `scheduled_date` support, but has no calendar view. Publishing consistency is the #1 predictor of YouTube growth.

**Prompt for Claude:**
> Add a calendar view mode to `/src/pages/VideoQueuePage.tsx` (third option alongside list/grid). Build `src/components/video-queue/ContentCalendar.tsx` rendering a monthly grid with video cards placed on scheduled dates, color-coded by status. Include: drag-to-reschedule (updates `targetPublishDate` via `useUpdateVideo`), gap-day highlighting in red, a "Publishing Streak" counter (consecutive weeks with 1+ videos), week navigation with date-fns, a configurable weekly target indicator, and an "Unscheduled" sidebar panel for videos without dates.

**ROI:** YouTube's algorithm rewards consistency. Visual calendar makes gaps impossible to ignore. Publishing streak gamification drives accountability. 15-25% growth acceleration from improved consistency.

---

### 5. Brand Deal Outreach Email System
**Impact: 8/10**

The inbox has full UI (folders, rules, AI detection) but zero backend email connectivity. Brand deals are the primary revenue driver and outreach speed directly impacts close rates.

**Prompt for Claude:**
> Build `supabase/functions/send-email/index.ts` using the Resend API (key from `workspace_integrations` where integration_key='resend'). Accepts `{ to, subject, body_html, workspace_id, contact_id?, deal_id? }`, sends the email, logs an activity (activity_type='email'), and updates `contacts.last_contact_date`. Create `src/components/inbox/ComposeEmailDialog.tsx` with pre-fillable to/subject/body props. Wire it into: (1) AI Bridge — "Approve & Send" on outreach proposals in `src/components/ai-bridge/ProposalCard.tsx`, (2) Contact Detail Sheet — "Send Email" button, (3) Deal Detail Sheet — "Send Email" button. Add a "Resend" integration entry to `src/pages/IntegrationsPage.tsx`.

**ROI:** Sponsorship inquiries lose 40% value per day of delayed response. Eliminating context-switching from CRM to email closes 1+ additional deals per quarter.

---

### 6. Content-to-Revenue Attribution Tracker
**Impact: 7.5/10**

Revenue and content data are disconnected. `video_queue` has `metadata.isSponsored` fields and `deals` has values, but no way to see "Video X generated $Y."

**Prompt for Claude:**
> Create a migration adding `video_queue_id` (UUID, nullable, FK) to `deals` and `affiliate_transactions`. Update `src/components/deals/AddDealDialog.tsx` with an "Associated Video" select dropdown using `useVideoQueue`. In `src/components/video-queue/VideoQueueDetails.tsx`, add a Revenue section querying linked deals/transactions. Add a `revenuePerVideo` KPI to `src/hooks/use-dashboard-stats.ts` and display it on the dashboard. If YouTube stats are available, calculate RPM (Revenue Per Mille) per video.

**ROI:** Reveals that 20% of content drives 80% of revenue. When the creator sees "tutorials = $800/video vs. vlogs = $50/video," they can 10x revenue without working harder.

---

### 7. Automated Contact Enrichment via Firecrawl
**Impact: 7/10**

CRM has rich enrichment JSONB fields (`enrichment_firecrawl`, `enrichment_clay`, `enrichment_ai`) that are all null. Firecrawl config UI exists but makes no API calls.

**Prompt for Claude:**
> Build `supabase/functions/enrich-company/index.ts` that reads Firecrawl API key from `workspace_integrations`, scrapes the company's website URL via `POST https://api.firecrawl.dev/v1/scrape`, extracts company description/size/industry/social links, and updates `enrichment_firecrawl` JSONB + null fields. Add an "Enrich" button to `src/components/crm/CompanyDetailSheet.tsx`. Build `supabase/functions/enrich-contact/index.ts` for contact-level enrichment (YouTube channel stats, social profile scraping). Add "Bulk Enrich" to `src/components/crm/BulkActionsBar.tsx`.

**ROI:** Saves 15-30 min of manual research per company. With 50+ companies in pipeline, that's 12-25 hours saved. Better data also improves AI proposal quality and deal close rates by 20-30%.

---

### 8. Deal Pipeline Automation (Stage-Triggered Actions)
**Impact: 6.5/10**

Deals support 6-stage kanban with drag-drop, but stage changes trigger no automated actions. No activity logging, no notifications, no status updates on contacts.

**Prompt for Claude:**
> Create a migration with a PostgreSQL trigger function `AFTER UPDATE ON deals WHEN (OLD.stage != NEW.stage)` that: inserts an activity record for every stage change, creates a notification when entering 'negotiation', sets `closed_at=now()` and updates contact status to 'customer' on 'closed_won', sets `closed_at=now()` on 'closed_lost'. Create `supabase/functions/stale-deal-check/index.ts` that finds deals with `updated_at > 14 days` in early stages and generates notifications + AI proposals. Update `src/hooks/use-deals.ts` to invalidate notifications/activities/dashboard-stats query keys after mutations. Add a "Stage History" timeline to `src/components/deals/DealDetailSheet.tsx`.

**ROI:** Eliminates "forgot to follow up" problem. Each recovered stale deal at this subscriber level = $500-$2000. Saving 2 deals/quarter from going cold pays for itself immediately.

---

### 9. Dashboard Consolidation + Weekly Growth Report
**Impact: 6/10**

`use-dashboard-stats.ts` has two competing implementations stacked on top of each other. Revenue is distributed evenly across months (line 451-454: "Spread evenly as we don't have closed_at granularity"). The dashboard page and RevenueChart also have duplicate overlapping code.

**Prompt for Claude:**
> Merge the duplicate interfaces and functions in `src/hooks/use-dashboard-stats.ts` into a single clean `useDashboardStats` hook using the more complete version (with `contactsByStatus`, `videosByStatus`, `dealsByStage`, `revenueByMonth`, `attentionItems`, `briefingItems`). Fix revenue attribution to use `deals.closed_at` for proper monthly grouping. Clean up duplicate code in `src/pages/Index.tsx` and `src/components/dashboard/RevenueChart.tsx`. Create `supabase/functions/weekly-report/index.ts` that generates and emails a weekly HTML growth report (subscriber delta, videos published, deals closed, revenue, top video, AI recommendation).

**ROI:** Clean data eliminates false signals. Weekly email digest forces regular reflection and accountability toward the 50K goal. Zero creator time required.

---

### 10. Sponsor Prospect Discovery Pipeline
**Impact: 5.5/10**

The creator must manually find and add sponsor contacts. At 21K subs, proactive sponsor outreach is essential. This combines CRM + Firecrawl + AI + Email into a discovery engine.

**Prompt for Claude:**
> Create `/src/pages/SponsorDiscoveryPage.tsx` at route `/discover` with a `Compass` icon nav item. Build a page where the creator pastes competitor YouTube channel URLs. A Supabase Edge Function (`supabase/functions/discover-sponsors/index.ts`) scrapes video descriptions via Firecrawl to extract sponsor mentions ("sponsored by", discount codes, affiliate links). Display sponsors as cards with company name, website, frequency, and an AI match score. "Add to CRM" button creates a company + prospecting deal + outreach AI proposal. Track discovery source on the company record.

**ROI:** Channels in the 20-50K range can command $500-$3000 per sponsored video. Identifying and closing 2 additional sponsors per month = $24K additional annual revenue.

---

## Build Order (Dependency-Aware)

| Phase | Features | Rationale |
|-------|----------|-----------|
| 1 | **#1** (YouTube API) + **#4** (Calendar) | No dependencies, parallel. Foundation for everything. |
| 2 | **#2** (AI Advisor) + **#5** (Email) | Depend on #1 data. Parallel. |
| 3 | **#3** (Analytics) + **#8** (Deal Automation) | #3 needs #1 data. #8 is standalone. Parallel. |
| 4 | **#7** (Enrichment) + **#9** (Dashboard Fix) | #9 needs #1. Parallel. |
| 5 | **#6** (Attribution) + **#10** (Discovery) | Depend on multiple prior features. |

## Critical Files

| File | Features Affected |
|------|-------------------|
| `src/hooks/use-youtube-analytics.ts` | 1, 3, 6, 9 |
| `src/hooks/use-dashboard-stats.ts` | 6, 9 (has duplicate code needing merge) |
| `src/pages/AiBridgePage.tsx` | 2, 5 |
| `src/components/dashboard/YouTubeGrowth.tsx` | 1 |
| `src/pages/IntegrationsPage.tsx` | 1, 5, 7 |
| `src/hooks/use-integrations.ts` | 5, 7 (needs new integration types) |
| `supabase/migrations/20260228120000_youtube_analytics.sql` | 1, 3 (reference schema) |
