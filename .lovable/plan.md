

## Fix Company Deletion & Related `deals.video_queue_id` Errors

### Root Cause

The `deals` table in the database does **not** have a `video_queue_id` column. However, multiple hooks reference `deals.video_queue_id` in their Supabase queries, causing 400 errors (`column deals.video_queue_id does not exist`). These errors are visible in the network logs right now on the Network page. The user likely sees error toasts from these failing queries when interacting with the page, including when attempting to delete a company.

Additionally, the `useCreateDeal` and `useUpdateDeal` mutations accept `video_queue_id` in their payloads -- inserting/updating deals with this field will also fail with a 400.

### Affected Files & Queries

1. **`src/hooks/use-sponsor-attribution.ts`** (line 42) -- `select("...video_queue_id...")` and `.not("video_queue_id", "is", null)` on deals. **400 error confirmed in network logs.**
2. **`src/hooks/use-content-revenue.ts`** (line 40) -- Same pattern: selects `video_queue_id` from deals and filters on it.
3. **`src/hooks/use-contact-impact.ts`** (line 34) -- Selects `video_queue_id` from deals.
4. **`src/hooks/use-deals.ts`** (lines 27, 79, 124) -- Interface and mutation payloads include `video_queue_id`.
5. **`src/hooks/use-video-deals.ts`** (line 39-56) -- Comments reference `video_queue_id` FK path but the actual query uses `notes` text search (this one works, just has misleading comments).
6. **`src/components/deals/AddDealDialog.tsx`** (line 54) -- Passes `video_queue_id` in deal creation payload.

### Plan

#### 1. Remove `video_queue_id` from Deal interface and mutations
- Remove `video_queue_id` from the `Deal` interface in `use-deals.ts`
- Remove it from `useCreateDeal` and `useUpdateDeal` input types
- Remove it from `AddDealDialog.tsx` payload

#### 2. Fix `use-sponsor-attribution.ts`
- Remove `video_queue_id` from the select and filter
- Instead, link deals to videos through `video_companies` table (company_id match) or notes text search

#### 3. Fix `use-content-revenue.ts`
- Remove `video_queue_id` select/filter from deals query
- Link deals to video_queue entries via company_id or notes

#### 4. Fix `use-contact-impact.ts`
- Remove `video_queue_id` from deals select
- Adjust video linking logic

#### 5. Clean up `use-video-deals.ts` comments
- Remove misleading references to `video_queue_id` FK path

#### 6. Verify company delete flow works
- The `useDeleteCompany` soft-delete (UPDATE) should work once the 400 errors from related queries stop interfering

### Files to Edit
- `src/hooks/use-deals.ts`
- `src/hooks/use-sponsor-attribution.ts`
- `src/hooks/use-content-revenue.ts`
- `src/hooks/use-contact-impact.ts`
- `src/hooks/use-video-deals.ts`
- `src/components/deals/AddDealDialog.tsx`

