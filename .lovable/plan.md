

## Integrations System Analysis and Improvement Plan

### Current State

The integration system has 15 configured services across the UI, but most are **non-functional facades**. Here is the breakdown:

**Functional (have edge functions consuming them):**
- YouTube — full sync, analytics, comments, competitor stats, video updates
- Resend — email sending, sequence emails
- Firecrawl — company enrichment

**Partially functional (config stored but no backend):**
- All other 12 integrations (Outlook, Twitter, ConvertKit, Beehiiv, Mailchimp, Slack, Notion, GitHub, Perplexity, Stripe, PayPal, n8n) — credentials are saved to the database but nothing consumes them

### Key Issues Found

1. **Security: Secrets exposed to client** — The `config` JSONB column (containing raw API keys, tokens, secrets) is returned to the browser via `.select("*")` in `useIntegrations()`. Any workspace member can read all integration secrets. RLS allows all members SELECT access.

2. **No credential validation** — When a user clicks "Save & Connect", credentials are stored without any verification. Only YouTube has a "Test" button. Bad credentials are saved silently.

3. **No pre-fill on update** — Clicking "Update" on a connected integration opens an empty form. Existing non-secret values should be pre-populated.

4. **Duplicate code** — `IntegrationsPage` and `IntegrationsContent` are nearly identical components (lines 581-676 duplicate lines 678-781).

5. **Most integrations do nothing** — 12 of 15 integrations have no backend logic. Users can "connect" them but no features use the credentials.

### Proposed Plan

#### Phase 1: Fix Security and UX (implement now)

1. **Stop exposing secrets to the client**
   - Modify `useIntegrations()` to select only `id, workspace_id, integration_key, enabled, connected_at, created_at, updated_at` — exclude `config`
   - Create a new edge function `integration-config-read` that returns masked config (last 4 chars only) for the "Update" dialog pre-fill
   - Edge functions already read config server-side with service role, so they remain unaffected

2. **Add credential validation on connect**
   - Create an edge function `integration-test` that accepts `{ workspace_id, integration_key }` and performs a lightweight API call per service:
     - YouTube: existing test logic (channel lookup)
     - Resend: `GET /api-keys` endpoint
     - Firecrawl: `GET /v1/crawl` health check
     - Stripe: `GET /v1/balance`
     - Slack: `auth.test` API call
     - Others: basic API health/auth checks
   - Wire the "Test" button (currently YouTube-only) to all integration cards

3. **Pre-fill existing values on update**
   - When opening the ConnectDialog for an already-connected integration, fetch masked config from the edge function and show placeholders like `••••••••abcd` for secret fields, plain values for non-secret fields
   - Only overwrite fields the user actually modifies

4. **Deduplicate IntegrationsPage**
   - Remove the duplicate `IntegrationsContent` component; have both the standalone page and Settings tab use the same component

#### Phase 2: Make key integrations functional (follow-up)

Priority integrations to implement edge functions for:

1. **Slack** — Create `slack-notify` edge function for sending alerts, daily briefings, and agent action approvals
2. **Stripe** — Create `stripe-sync` edge function to pull payment/subscription data into a revenue table
3. **ConvertKit / Beehiiv / Mailchimp** — Create `newsletter-sync` edge function to pull subscriber counts and growth metrics
4. **Perplexity** — Already has an API key secret; wire it into `discover-sponsors` and `assistant-chat` for deep research
5. **Notion** — Create `notion-sync` edge function for memory/knowledge base operations

Lower priority (complex OAuth or niche): Twitter, GitHub, PayPal, n8n, MS Outlook

#### Phase 3: UX Improvements

- Add integration health status indicators (last successful API call, error count)
- Add a "Sync Now" button per integration (like YouTube already has)
- Add connection status polling/webhooks for real-time status updates
- Group integrations by category (Analytics, Email, Automation, Developer)

### Technical Details

**Database changes needed:**
- Add an `integration_health` table or columns to `workspace_integrations` for tracking last test result, last sync time, and error messages

**Edge function for credential testing:**
```
POST /integration-test
Body: { workspace_id, integration_key }
Response: { valid: boolean, details: { ... }, errors: string[] }
```

**Config masking function (server-side):**
- For each field in config, return `"••••" + value.slice(-4)` for secret fields, full value for non-secret fields

### Recommended Starting Point

I recommend starting with **Phase 1** — fixing the security issue (secrets exposure) and adding credential validation. This makes the existing integrations reliable and secure before adding new ones.

Shall I proceed with Phase 1 implementation?

