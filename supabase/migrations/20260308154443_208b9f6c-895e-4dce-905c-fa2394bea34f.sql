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