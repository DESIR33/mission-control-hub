

## Root Cause

The PATCH request to soft-delete a company returns **403**: `"new row violates row-level security policy for table companies"`.

The companies table has only **restrictive** RLS policies (no permissive ones). The UPDATE policy's `USING` clause checks the role, but there is no explicit `WITH CHECK` on the UPDATE policy. PostgreSQL then implicitly uses the `USING` expression as the `WITH CHECK`. However, because restrictive policies are ANDed, the **SELECT** policy's condition `deleted_at IS NULL` is also evaluated against the new row state — and since the soft-delete sets `deleted_at` to a non-null value, the row fails this check.

**In short**: setting `deleted_at` causes the updated row to violate the SELECT policy's `deleted_at IS NULL` condition, which blocks the UPDATE.

## Fix

Add an explicit `WITH CHECK (true)` to the UPDATE policy for operators+, so the new row state is always allowed when the user has the correct role. Alternatively, we can convert the SELECT policy to a permissive one or adjust its condition for UPDATE operations.

The cleanest fix is to **drop and recreate the UPDATE policy** with an explicit `WITH CHECK` that doesn't enforce the `deleted_at IS NULL` constraint on the new row:

```sql
DROP POLICY "Operators+ can update companies" ON public.companies;

CREATE POLICY "Operators+ can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  get_workspace_role(workspace_id) = ANY (ARRAY['admin'::text, 'operator'::text, 'contributor'::text])
)
WITH CHECK (
  get_workspace_role(workspace_id) = ANY (ARRAY['admin'::text, 'operator'::text, 'contributor'::text])
);
```

This ensures the `WITH CHECK` only validates the user's role, not the `deleted_at` value of the updated row.

### Files to Edit
- **Database migration only** — no code changes needed. The `useDeleteCompany` hook and UI components are correct.

