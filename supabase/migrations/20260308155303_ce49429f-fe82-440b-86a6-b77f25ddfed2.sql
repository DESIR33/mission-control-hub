-- Drop existing UPDATE policy (was causing issues with soft-delete)
DROP POLICY IF EXISTS "Operators+ can update companies" ON public.companies;
-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;

-- Recreate a clean UPDATE policy (no soft-delete responsibility)
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

-- Create a security definer function for soft-delete that bypasses RLS
CREATE OR REPLACE FUNCTION public.soft_delete_company(company_id uuid, ws_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller has operator+ role in the workspace
  IF get_workspace_role(ws_id) NOT IN ('admin', 'operator', 'contributor') THEN
    RAISE EXCEPTION 'Insufficient permissions to delete company';
  END IF;

  -- Verify the company belongs to the workspace
  UPDATE companies
  SET deleted_at = now()
  WHERE id = company_id
    AND workspace_id = ws_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found or already deleted';
  END IF;
END;
$$;