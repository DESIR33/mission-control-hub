

## Outlook Integration & Inbox: Remaining Issues

### Issue 1: Dead Legacy Components Still in Codebase

Three inbox components are **orphaned** -- never imported by the rewritten `InboxPage.tsx`:

- **`InboxRuleBuilderDialog.tsx`** -- Still uses `axios.post("/api/inbox/rules")` and `useCsrf()`. Will 404 if ever rendered. Dead code.
- **`InboxCommandPalette.tsx`** -- Uses a legacy `EmailMessage` interface (with `dbId: number`, etc.) incompatible with `SmartEmail`. All `onSelect` handlers are no-ops (just close the palette). Dead code.
- **`SequenceDeliveryStats.tsx`** -- Queries a non-existent `email_send_logs` table (cast `as any`). Will error if rendered.

**Fix**: Delete all three files since they are unused. If rule-builder or command palette functionality is desired later, rebuild them against the Supabase-backed hooks.

### Issue 2: Duplicate Compose Email Paths

Two separate compose implementations exist:
- **`ComposeEmailDialog.tsx`** -- Uses the `send-email` edge function (Resend API). Used by `ContactDetailSheet` and `DealDetailSheet`.
- **InboxPage inline compose** -- Uses `useOutlookSend()` hook (Microsoft Graph API).

These use **different email providers** (Resend vs Outlook) with no user-facing distinction. A user composing from the Inbox sends via Outlook; composing from a Contact detail sends via Resend. This is confusing and inconsistent.

**Fix**: Unify `ComposeEmailDialog` to detect whether Outlook is connected and prefer `outlook-send` when available, falling back to `send-email` (Resend). Alternatively, have `ComposeEmailDialog` use the same `useOutlookSend` hook.

### Issue 3: OAuth Flow Has No Frontend Trigger

The `outlook-auth-url` and `outlook-auth-callback` edge functions exist but are **never invoked** from the frontend. There is no button, page, or route that:
1. Calls `outlook-auth-url` to get the Microsoft authorization URL
2. Handles the redirect callback with the `code` parameter
3. Calls `outlook-auth-callback` to exchange the code for tokens

Users currently have no way to complete the OAuth flow from within the app.

**Fix**: Add an "Authorize Outlook" button on the InboxPage (or IntegrationsPage) that invokes `outlook-auth-url` and opens the returned URL. Create a small callback route (e.g., `/auth/outlook/callback`) that reads the `code` and `state` query params and invokes `outlook-auth-callback`.

### Issue 4: Refresh Token Not Rotated on Sync

In `outlook-sync/index.ts`, the token refresh response from Microsoft may include a **new refresh token** (token rotation). The comment on line 173 acknowledges this but does nothing. If Microsoft rotates the token, the stored one becomes stale and all future syncs will fail.

**Fix**: After `refreshAccessToken`, check if `data.refresh_token` is present and differs from the stored one. If so, update `workspace_integrations.config.refresh_token`.

### Issue 5: XSS Vulnerability in Email Body Rendering

`EmailPreview.tsx` line 128 renders `email.body_html` via `dangerouslySetInnerHTML` with no sanitization. Malicious emails could execute arbitrary JavaScript in the user's browser session.

**Fix**: Sanitize HTML using DOMPurify before rendering. Install `dompurify` and wrap: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}`.

### Issue 6: Outlook Sync Upserts One-by-One (N+1)

The sync function upserts emails in a loop (one DB call per message). For 50 emails, that's 50 separate round-trips to Supabase.

**Fix**: Batch the upsert into a single call: build an array of all rows and call `.upsert(rows, { onConflict: ... })` once.

### Issue 7: `useFolderCounts` Makes 6 Sequential Queries

`FolderSidebar` calls `useFolderCounts()` which runs 6 separate `SELECT COUNT(*)` queries sequentially in a `for` loop.

**Fix**: Replace with a single RPC or a single query that groups by folder: `SELECT folder, count(*) FROM inbox_emails WHERE workspace_id = $1 GROUP BY folder`.

---

### Implementation Plan

1. **Delete dead files**: Remove `InboxRuleBuilderDialog.tsx`, `InboxCommandPalette.tsx`, `SequenceDeliveryStats.tsx`
2. **Add DOMPurify sanitization** to `EmailPreview.tsx`
3. **Unify ComposeEmailDialog** to use Outlook when available
4. **Add OAuth flow frontend**: Create callback route + "Authorize Outlook" button
5. **Fix refresh token rotation** in `outlook-sync` and `outlook-send` edge functions
6. **Batch upserts** in `outlook-sync`
7. **Optimize folder counts** with a single grouped query (create DB function or inline query)

