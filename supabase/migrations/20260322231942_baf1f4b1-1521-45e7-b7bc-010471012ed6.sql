DELETE FROM expense_categories a
USING expense_categories b
WHERE a.workspace_id = b.workspace_id
  AND a.name = b.name
  AND a.created_at > b.created_at;

ALTER TABLE expense_categories ADD CONSTRAINT uq_expense_categories_ws_name UNIQUE (workspace_id, name);