# YouTube Data Capability Matrix

> Which YouTube data comes from **webhook push** vs **scheduled API polling** vs **manual-only**.

Last updated: 2026-03-21

## Overview

| Source | Trigger | Cadence | Notes |
|--------|---------|---------|-------|
| **PubSubHubbub webhook** | Push from YouTube | Real-time (seconds) | Channel feed events only |
| **Scheduled API polling** | pg_cron → edge function | Daily (06:00–06:05 UTC) | Full analytics, monetisation |
| **Manual trigger** | User clicks "Refresh" | On-demand + cooldown | Respects `dataset_sync_status` lock |

---

## Per-Dataset Breakdown

| Dataset | Webhook | Scheduled Poll | Manual | Registry Key | Notes |
|---------|:-------:|:--------------:|:------:|--------------|-------|
| **New video detection** | ✅ | — | — | `youtubeVideoStats` | PubSubHubbub → `webhook_sync_queue` → processor |
| **Video metadata** (title, desc, thumbnail) | ✅ | ✅ daily | ✅ | `youtubeVideoStats` | Webhook does incremental; daily does full |
| **Video statistics** (views, likes, comments count) | ✅ | ✅ daily | ✅ | `youtubeVideoStats` | Webhook fetches single-video stats on push |
| **Video deletion** | ✅ | — | — | `youtubeVideoStats` | Logged in queue; no data purge |
| **Comment bootstrap** (new videos) | ✅ | — | — | `youtubeComments` | Top 20 comments fetched on `new_video` event |
| **Full comment sync** | — | ✅ daily | ✅ | `youtubeComments` | `youtube-comments-sync` edge function |
| **Channel analytics** (views, subs, watch time) | — | ✅ daily | ✅ | `youtubeAnalyticsApi` | YouTube Analytics API; no webhook available |
| **Channel stats** (subscriber count, video count) | — | ✅ daily | ✅ | `youtubeChannelStats` | YouTube Data API v3 |
| **Ad revenue / monetisation** | — | ✅ daily | ✅ | `youtubeMonetisation` | YouTube Analytics API; requires OAuth monetary scope |
| **Demographics** (age, gender) | — | ✅ daily | — | `youtubeAnalyticsApi` | No webhook; aggregated data |
| **Traffic sources** | — | ✅ daily | — | `youtubeAnalyticsApi` | No webhook |
| **Geography** | — | ✅ daily | — | `youtubeAnalyticsApi` | No webhook |
| **Device breakdown** | — | ✅ daily | — | `youtubeAnalyticsApi` | No webhook |
| **Audience retention curves** | — | ✅ daily | — | `youtubeAnalyticsApi` | Per-video; no webhook |
| **Comment sentiment / intelligence** | — | ✅ daily | ✅ | `commentIntelligence` | Derived from comment data |

---

## Architecture

```
YouTube Hub ──(PubSubHubbub)──► youtube-push-webhook (edge fn)
                                    │
                                    ▼
                            webhook_sync_queue (table)
                                    │
                            ┌───────┴────────┐
                            ▼                ▼
              youtube-webhook-processor   Supabase Realtime
              (edge fn, cron 5min)         │
                    │                      ▼
                    ▼                 React Query
              youtube_video_stats     cache invalidation
              youtube_comments        (targeted by entity)
```

### Webhook Flow

1. **YouTube** sends Atom XML to `/functions/v1/youtube-push-webhook`
2. Endpoint parses video ID, channel ID, and event type (`new_video`, `video_updated`, `video_deleted`)
3. Looks up workspace by channel ID in `workspace_integrations`
4. Inserts a row into `webhook_sync_queue` (with dedup check)
5. `youtube-webhook-processor` (cron every 5 min) picks up pending items
6. Fetches single-video metadata + stats via YouTube Data API v3
7. For `new_video` events, bootstraps top 20 comments
8. Marks queue item as `done`; stamps `dataset_sync_status`
9. Supabase Realtime broadcasts the queue status change → UI invalidates relevant caches

### Scheduled Polling (no webhook coverage)

These datasets have **no webhook equivalent** and rely solely on scheduled API polling:

- Channel-level analytics (views, watch time, subscriber gains/losses)
- Monetisation / ad revenue (requires Analytics API with monetary scope)
- Demographics, traffic sources, geography, devices
- Audience retention curves
- Weekly channel analytics aggregates

All run via `youtube-analytics-sync` daily at 06:05 UTC.

---

## PubSubHubbub Subscription Setup

To activate push notifications, subscribe your channel's feed to the webhook:

**Hub URL**: `https://pubsubhubbub.appspot.com/subscribe`

| Parameter | Value |
|-----------|-------|
| `hub.callback` | `https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/youtube-push-webhook` |
| `hub.topic` | `https://www.youtube.com/xml/feeds/videos.xml?channel_id=YOUR_CHANNEL_ID` |
| `hub.mode` | `subscribe` |
| `hub.verify` | `async` |
| `hub.lease_seconds` | `432000` (5 days — auto-renew via cron) |

Subscriptions can be managed programmatically or via the [PubSubHubbub subscriber UI](https://pubsubhubbub.appspot.com/subscribe).

---

## Data Freshness Registry Keys

All datasets are registered in `src/config/data-freshness.ts`. The `cadence` field determines polling behaviour:

| Cadence | Meaning | Polling |
|---------|---------|---------|
| `webhook_only` | Data arrives via push; no polling | `refetchInterval: false` |
| `daily` | Scheduled once per 24h | `refetchInterval: false` (query on mount only) |
| `hourly_active` | Poll ≥60 min when tab visible + user active | Clamped to `REFETCH_FLOOR_MS` (1h) |
| `manual_only` | User-triggered refresh only | `refetchInterval: false` |
