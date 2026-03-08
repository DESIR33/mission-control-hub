

## Analysis: Microsoft Outlook Integration and Inbox Page

### Core Problem

The entire Inbox page is built around a **REST API backend** (`/api/inbox/*`, `/api/integrations/outlook/*`) that **does not exist**. There is no backend server running at these paths. The axios instance in `axios-config.ts` has no `baseURL` configured, so all calls go to the Lovable preview origin and return 404s.

Every single feature on the InboxPage is non-functional:
- **Email listing** (`/api/inbox/messages`) -- 404
- **Email body** (`/api/inbox/messages/:id/body`) -- 404
- **Folder listing** (`/api/inbox/folders-list`) -- 404
- **Stats** (`/api/inbox/stats`) -- 404
- **Outlook OAuth** (`/api/integrations/outlook/auth`) -- 404
- **Outlook status** (`/api/integrations/outlook/status`) -- 404
- **Sync** (`/api/inbox/sync`) -- 404
- **Send/reply/forward** -- 404
- **Automations, playbooks, search, drafts** -- all 404

Meanwhile, there is a separate `use-smart-inbox.ts` hook that queries an `inbox_emails` Supabase table (which doesn't exist in the schema either) and a `useSyncOutlook` hook that invokes an `outlook-sync` edge function (which also doesn't exist).

The two systems (REST API inbox vs Supabase inbox) are completely disconnected. The InboxPage never uses `use-smart-inbox.ts`.

### What Needs to Happen

Rebuild the Inbox page to work with Supabase edge functions instead of a non-existent REST API. This is a large undertaking with ~30+ API endpoints to replace.

### Proposed Plan

#### Phase 1: Database Foundation

Create the `inbox_emails` table that `use-smart-inbox.ts` already expects:

```sql
CREATE TABLE public.inbox_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  message_id text NOT NULL,
  conversation_id text,
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  preview text NOT NULL DEFAULT '',
  body_html text,
  received_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  importance text NOT NULL DEFAULT 'normal',
  has_attachments boolean NOT NULL DEFAULT false,
  folder text NOT NULL DEFAULT 'inbox',
  labels text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, message_id)
);
-- RLS + policies for workspace members
```

#### Phase 2: Outlook Sync Edge Function

Create `supabase/functions/outlook-sync/index.ts` that:
1. Reads the `ms_outlook` config from `workspace_integrations` (client_id, client_secret, refresh_token, tenant_id)
2. Uses Microsoft Graph API to fetch emails from `/me/mailFolders/inbox/messages`
3. Upserts results into `inbox_emails`
4. Returns sync stats

This requires the user to have registered an Azure AD app and stored OAuth credentials.

#### Phase 3: Rewrite InboxPage to Use Supabase

Replace all `axios.get/post("/api/inbox/...")` calls with Supabase queries and edge function invocations:

1. **Email listing**: Replace `EmailList`'s axios query with a direct Supabase query on `inbox_emails`, applying filters via `.eq()`, `.ilike()`, etc.
2. **Email body**: Store body in `inbox_emails.body_html`; read directly from Supabase instead of a separate API call.
3. **Folder sidebar**: Derive folders from `SELECT DISTINCT folder FROM inbox_emails` or use a static list.
4. **Stats**: Compute from `inbox_emails` counts via Supabase queries.
5. **Outlook status**: Check if `ms_outlook` integration exists and is enabled via `useIntegrations()`.
6. **Sync**: Invoke the `outlook-sync` edge function via `supabase.functions.invoke()`.
7. **Mark read/unread**: Direct Supabase update on `inbox_emails.is_read`.
8. **Pin/archive/delete/move**: Direct Supabase updates on `inbox_emails.folder` and `is_pinned`.
9. **Send/reply/forward**: Create an `outlook-send` edge function that uses Microsoft Graph to send emails.
10. **Compose/drafts**: Store drafts in `inbox_emails` with `folder = 'drafts'`, send via edge function.

#### Phase 4: Remove Non-Functional Features

Strip out features that require complex backend infrastructure not feasible in Supabase:
- AI draft generation (requires LLM pipeline)
- Automation runs, bot roles, ledger, approval queue
- Natural language search parsing
- Opportunity detection
- Founder control tower
- Playbook execution
- Snippet expansion system
- CSRF token handling (not needed with Supabase auth)

These can be re-added later as edge functions, but shipping a working inbox first is the priority.

#### Phase 5: Connect Outlook OAuth

The MS Outlook integration currently stores `client_id`, `client_secret`, `tenant_id`, `redirect_uri` in workspace_integrations config. A proper OAuth flow needs:
1. An edge function `outlook-auth-url` that generates the Microsoft OAuth authorization URL
2. An edge function `outlook-auth-callback` that exchanges the auth code for tokens and stores the refresh_token
3. The "Connect" button on the Inbox page links to the auth URL

### Files Affected

- `src/pages/InboxPage.tsx` -- Major rewrite (1621 lines), replace all axios calls
- `src/components/inbox/EmailList.tsx` -- Replace axios query with Supabase
- `src/components/inbox/EmailPreview.tsx` -- Replace axios body fetch with Supabase
- `src/components/inbox/FolderSidebar.tsx` -- Replace axios query with Supabase
- `src/hooks/use-smart-inbox.ts` -- Already partially correct, extend it
- New: `supabase/functions/outlook-sync/index.ts`
- New: `supabase/functions/outlook-send/index.ts`
- New: `supabase/functions/outlook-auth-url/index.ts`
- New: `supabase/functions/outlook-auth-callback/index.ts`
- New: Database migration for `inbox_emails` table

### Implementation Order

Given the scope, I recommend implementing in this order:
1. Create `inbox_emails` table with RLS
2. Create `outlook-sync` edge function
3. Rewrite `EmailList` to query Supabase directly
4. Rewrite `EmailPreview` to read body from Supabase
5. Rewrite `FolderSidebar` to derive from Supabase
6. Simplify `InboxPage` -- remove dead features, wire up Supabase mutations for read/pin/archive/delete
7. Create `outlook-send` edge function for compose/reply/forward
8. Add Outlook OAuth flow edge functions

This is a substantial rewrite. I will implement it incrementally, starting with the database and core email display, then adding send capabilities.

