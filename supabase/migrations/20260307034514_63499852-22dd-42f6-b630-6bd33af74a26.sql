UPDATE agent_definitions SET model = 'minimax/minimax-m2.5' WHERE model = 'anthropic/claude-3.5-sonnet';
ALTER TABLE agent_definitions ALTER COLUMN model SET DEFAULT 'minimax/minimax-m2.5';