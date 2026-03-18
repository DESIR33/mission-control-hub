
-- 1. Add webhook_secret column to workspaces for subscriber webhook auth
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS webhook_secret text DEFAULT encode(gen_random_bytes(32), 'hex');

-- 2. Restrict workspace_integrations SELECT to admin-only (protects config secrets)
DROP POLICY IF EXISTS "Members can view workspace_integrations" ON public.workspace_integrations;
CREATE POLICY "Admins can view workspace_integrations" ON public.workspace_integrations
  FOR SELECT TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

DROP POLICY IF EXISTS "Admins can insert workspace_integrations" ON public.workspace_integrations;
CREATE POLICY "Admins can insert workspace_integrations" ON public.workspace_integrations
  FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) = 'admin');

DROP POLICY IF EXISTS "Admins can update workspace_integrations" ON public.workspace_integrations;
CREATE POLICY "Admins can update workspace_integrations" ON public.workspace_integrations
  FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

DROP POLICY IF EXISTS "Admins can delete workspace_integrations" ON public.workspace_integrations;
CREATE POLICY "Admins can delete workspace_integrations" ON public.workspace_integrations
  FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- 3. Change all remaining public-role policies to authenticated

-- activities
DROP POLICY IF EXISTS "Members can view activities" ON public.activities;
CREATE POLICY "Members can view activities" ON public.activities FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert activities" ON public.activities;
CREATE POLICY "Operators+ can insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- affiliate_programs
DROP POLICY IF EXISTS "Members can view affiliate_programs" ON public.affiliate_programs;
CREATE POLICY "Members can view affiliate_programs" ON public.affiliate_programs FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert affiliate_programs" ON public.affiliate_programs;
CREATE POLICY "Operators+ can insert affiliate_programs" ON public.affiliate_programs FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update affiliate_programs" ON public.affiliate_programs;
CREATE POLICY "Operators+ can update affiliate_programs" ON public.affiliate_programs FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete affiliate_programs" ON public.affiliate_programs;
CREATE POLICY "Admins can delete affiliate_programs" ON public.affiliate_programs FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- agent_ab_tests
DROP POLICY IF EXISTS "Members can view agent_ab_tests" ON public.agent_ab_tests;
CREATE POLICY "Members can view agent_ab_tests" ON public.agent_ab_tests FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can manage agent_ab_tests" ON public.agent_ab_tests;
CREATE POLICY "Operators+ can manage agent_ab_tests" ON public.agent_ab_tests FOR ALL TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor')) WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- agent_collaboration_messages
DROP POLICY IF EXISTS "Members can manage collab_messages" ON public.agent_collaboration_messages;
CREATE POLICY "Members can manage collab_messages" ON public.agent_collaboration_messages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM agent_collaboration_threads t WHERE t.id = agent_collaboration_messages.thread_id AND is_workspace_member(t.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM agent_collaboration_threads t WHERE t.id = agent_collaboration_messages.thread_id AND is_workspace_member(t.workspace_id)));
DROP POLICY IF EXISTS "Members can view collab_messages" ON public.agent_collaboration_messages;
CREATE POLICY "Members can view collab_messages" ON public.agent_collaboration_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM agent_collaboration_threads t WHERE t.id = agent_collaboration_messages.thread_id AND is_workspace_member(t.workspace_id)));

-- agent_collaboration_threads
DROP POLICY IF EXISTS "Members can manage collaboration_threads" ON public.agent_collaboration_threads;
CREATE POLICY "Members can manage collaboration_threads" ON public.agent_collaboration_threads FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can view collaboration_threads" ON public.agent_collaboration_threads;
CREATE POLICY "Members can view collaboration_threads" ON public.agent_collaboration_threads FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- agent_custom_triggers
DROP POLICY IF EXISTS "Admins can manage agent_custom_triggers" ON public.agent_custom_triggers;
CREATE POLICY "Admins can manage agent_custom_triggers" ON public.agent_custom_triggers FOR ALL TO authenticated USING (get_workspace_role(workspace_id) = 'admin') WITH CHECK (get_workspace_role(workspace_id) = 'admin');
DROP POLICY IF EXISTS "Members can view agent_custom_triggers" ON public.agent_custom_triggers;
CREATE POLICY "Members can view agent_custom_triggers" ON public.agent_custom_triggers FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- agent_feedback
DROP POLICY IF EXISTS "Members can insert agent_feedback" ON public.agent_feedback;
CREATE POLICY "Members can insert agent_feedback" ON public.agent_feedback FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can view agent_feedback" ON public.agent_feedback;
CREATE POLICY "Members can view agent_feedback" ON public.agent_feedback FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- agent_workflow_steps
DROP POLICY IF EXISTS "Admins can manage workflow_steps" ON public.agent_workflow_steps;
CREATE POLICY "Admins can manage workflow_steps" ON public.agent_workflow_steps FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM agent_workflows w WHERE w.id = agent_workflow_steps.workflow_id AND get_workspace_role(w.workspace_id) = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM agent_workflows w WHERE w.id = agent_workflow_steps.workflow_id AND get_workspace_role(w.workspace_id) = 'admin'));
DROP POLICY IF EXISTS "Members can view workflow_steps" ON public.agent_workflow_steps;
CREATE POLICY "Members can view workflow_steps" ON public.agent_workflow_steps FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM agent_workflows w WHERE w.id = agent_workflow_steps.workflow_id AND is_workspace_member(w.workspace_id)));

-- agent_workflows
DROP POLICY IF EXISTS "Admins can manage agent_workflows" ON public.agent_workflows;
CREATE POLICY "Admins can manage agent_workflows" ON public.agent_workflows FOR ALL TO authenticated USING (get_workspace_role(workspace_id) = 'admin') WITH CHECK (get_workspace_role(workspace_id) = 'admin');
DROP POLICY IF EXISTS "Members can view agent_workflows" ON public.agent_workflows;
CREATE POLICY "Members can view agent_workflows" ON public.agent_workflows FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- ai_proposals
DROP POLICY IF EXISTS "Admins can delete ai_proposals" ON public.ai_proposals;
CREATE POLICY "Admins can delete ai_proposals" ON public.ai_proposals FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');
DROP POLICY IF EXISTS "Members can view ai_proposals" ON public.ai_proposals;
CREATE POLICY "Members can view ai_proposals" ON public.ai_proposals FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert ai_proposals" ON public.ai_proposals;
CREATE POLICY "Operators+ can insert ai_proposals" ON public.ai_proposals FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update ai_proposals" ON public.ai_proposals;
CREATE POLICY "Operators+ can update ai_proposals" ON public.ai_proposals FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- assistant tables
DROP POLICY IF EXISTS "Members can manage conversations" ON public.assistant_conversations;
CREATE POLICY "Members can manage conversations" ON public.assistant_conversations FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can manage daily_logs" ON public.assistant_daily_logs;
CREATE POLICY "Members can manage daily_logs" ON public.assistant_daily_logs FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can manage memory" ON public.assistant_memory;
CREATE POLICY "Members can manage memory" ON public.assistant_memory FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can manage snapshots" ON public.assistant_service_snapshots;
CREATE POLICY "Members can manage snapshots" ON public.assistant_service_snapshots FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

-- auto_execution_rules
DROP POLICY IF EXISTS "Admins can manage auto_execution_rules" ON public.auto_execution_rules;
CREATE POLICY "Admins can manage auto_execution_rules" ON public.auto_execution_rules FOR ALL TO authenticated USING (get_workspace_role(workspace_id) = 'admin') WITH CHECK (get_workspace_role(workspace_id) = 'admin');
DROP POLICY IF EXISTS "Members can view auto_execution_rules" ON public.auto_execution_rules;
CREATE POLICY "Members can view auto_execution_rules" ON public.auto_execution_rules FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- companies
DROP POLICY IF EXISTS "Members can view companies" ON public.companies;
CREATE POLICY "Members can view companies" ON public.companies FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert companies" ON public.companies;
CREATE POLICY "Operators+ can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- contacts
DROP POLICY IF EXISTS "Members can view contacts" ON public.contacts;
CREATE POLICY "Members can view contacts" ON public.contacts FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert contacts" ON public.contacts;
CREATE POLICY "Operators+ can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update contacts" ON public.contacts;
CREATE POLICY "Operators+ can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;
CREATE POLICY "Admins can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- content_decay_alerts
DROP POLICY IF EXISTS "Members can manage content_decay_alerts" ON public.content_decay_alerts;
CREATE POLICY "Members can manage content_decay_alerts" ON public.content_decay_alerts FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can view content_decay_alerts" ON public.content_decay_alerts;
CREATE POLICY "Members can view content_decay_alerts" ON public.content_decay_alerts FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- deals
DROP POLICY IF EXISTS "Members can view deals" ON public.deals;
CREATE POLICY "Members can view deals" ON public.deals FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert deals" ON public.deals;
CREATE POLICY "Operators+ can insert deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update deals" ON public.deals;
CREATE POLICY "Operators+ can update deals" ON public.deals FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;
CREATE POLICY "Admins can delete deals" ON public.deals FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- email_follow_ups
DROP POLICY IF EXISTS "Members can manage email_follow_ups" ON public.email_follow_ups;
CREATE POLICY "Members can manage email_follow_ups" ON public.email_follow_ups FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can view email_follow_ups" ON public.email_follow_ups;
CREATE POLICY "Members can view email_follow_ups" ON public.email_follow_ups FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- entity_tags (uses tags.workspace_id via subquery)
DROP POLICY IF EXISTS "Members can view entity_tags" ON public.entity_tags;
CREATE POLICY "Members can view entity_tags" ON public.entity_tags FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM tags t WHERE t.id = entity_tags.tag_id AND is_workspace_member(t.workspace_id)));
DROP POLICY IF EXISTS "Operators+ can delete entity_tags" ON public.entity_tags;
CREATE POLICY "Operators+ can delete entity_tags" ON public.entity_tags FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM tags t WHERE t.id = entity_tags.tag_id AND get_workspace_role(t.workspace_id) IN ('admin','operator')));
DROP POLICY IF EXISTS "Operators+ can manage entity_tags" ON public.entity_tags;
CREATE POLICY "Operators+ can manage entity_tags" ON public.entity_tags FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM tags t WHERE t.id = entity_tags.tag_id AND get_workspace_role(t.workspace_id) IN ('admin','operator','contributor')));

-- growth_goals
DROP POLICY IF EXISTS "Members can view growth_goals" ON public.growth_goals;
CREATE POLICY "Members can view growth_goals" ON public.growth_goals FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert growth_goals" ON public.growth_goals;
CREATE POLICY "Operators+ can insert growth_goals" ON public.growth_goals FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update growth_goals" ON public.growth_goals;
CREATE POLICY "Operators+ can update growth_goals" ON public.growth_goals FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- inbox_feedback
DROP POLICY IF EXISTS "Workspace members can manage inbox_feedback" ON public.inbox_feedback;
CREATE POLICY "Workspace members can manage inbox_feedback" ON public.inbox_feedback FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

-- notifications
DROP POLICY IF EXISTS "Members can view notifications" ON public.notifications;
CREATE POLICY "Members can view notifications" ON public.notifications FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can update notifications" ON public.notifications;
CREATE POLICY "Members can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert notifications" ON public.notifications;
CREATE POLICY "Operators+ can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- tags
DROP POLICY IF EXISTS "Members can view tags" ON public.tags;
CREATE POLICY "Members can view tags" ON public.tags FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can delete tags" ON public.tags;
CREATE POLICY "Operators+ can delete tags" ON public.tags FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can manage tags" ON public.tags;
CREATE POLICY "Operators+ can manage tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- thumbnail_ab_tests
DROP POLICY IF EXISTS "Members can manage thumbnail_ab_tests" ON public.thumbnail_ab_tests;
CREATE POLICY "Members can manage thumbnail_ab_tests" ON public.thumbnail_ab_tests FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can view thumbnail_ab_tests" ON public.thumbnail_ab_tests;
CREATE POLICY "Members can view thumbnail_ab_tests" ON public.thumbnail_ab_tests FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- video_companies
DROP POLICY IF EXISTS "Members can view video_companies" ON public.video_companies;
CREATE POLICY "Members can view video_companies" ON public.video_companies FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can delete video_companies" ON public.video_companies;
CREATE POLICY "Operators+ can delete video_companies" ON public.video_companies FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can insert video_companies" ON public.video_companies;
CREATE POLICY "Operators+ can insert video_companies" ON public.video_companies FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- video_experiments
DROP POLICY IF EXISTS "Members can view video_experiments" ON public.video_experiments;
CREATE POLICY "Members can view video_experiments" ON public.video_experiments FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert video_experiments" ON public.video_experiments;
CREATE POLICY "Operators+ can insert video_experiments" ON public.video_experiments FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update video_experiments" ON public.video_experiments;
CREATE POLICY "Operators+ can update video_experiments" ON public.video_experiments FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete video_experiments" ON public.video_experiments;
CREATE POLICY "Admins can delete video_experiments" ON public.video_experiments FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- video_hourly_stats
DROP POLICY IF EXISTS "Members can view video_hourly_stats" ON public.video_hourly_stats;
CREATE POLICY "Members can view video_hourly_stats" ON public.video_hourly_stats FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can manage video_hourly_stats" ON public.video_hourly_stats;
CREATE POLICY "Service can manage video_hourly_stats" ON public.video_hourly_stats FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

-- video_note_entries
DROP POLICY IF EXISTS "Members can view video_note_entries" ON public.video_note_entries;
CREATE POLICY "Members can view video_note_entries" ON public.video_note_entries FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert video_note_entries" ON public.video_note_entries;
CREATE POLICY "Operators+ can insert video_note_entries" ON public.video_note_entries FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete video_note_entries" ON public.video_note_entries;
CREATE POLICY "Admins can delete video_note_entries" ON public.video_note_entries FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- video_notes
DROP POLICY IF EXISTS "Members can view video_notes" ON public.video_notes;
CREATE POLICY "Members can view video_notes" ON public.video_notes FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert video_notes" ON public.video_notes;
CREATE POLICY "Operators+ can insert video_notes" ON public.video_notes FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update video_notes" ON public.video_notes;
CREATE POLICY "Operators+ can update video_notes" ON public.video_notes FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete video_notes" ON public.video_notes;
CREATE POLICY "Admins can delete video_notes" ON public.video_notes FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- video_performance_alerts
DROP POLICY IF EXISTS "Members can view video_performance_alerts" ON public.video_performance_alerts;
CREATE POLICY "Members can view video_performance_alerts" ON public.video_performance_alerts FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can update video_performance_alerts" ON public.video_performance_alerts;
CREATE POLICY "Members can update video_performance_alerts" ON public.video_performance_alerts FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert video_performance_alerts" ON public.video_performance_alerts;
CREATE POLICY "Service can insert video_performance_alerts" ON public.video_performance_alerts FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));

-- video_queue
DROP POLICY IF EXISTS "Members can view video_queue" ON public.video_queue;
CREATE POLICY "Members can view video_queue" ON public.video_queue FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert video_queue" ON public.video_queue;
CREATE POLICY "Operators+ can insert video_queue" ON public.video_queue FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update video_queue" ON public.video_queue;
CREATE POLICY "Operators+ can update video_queue" ON public.video_queue FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete video_queue" ON public.video_queue;
CREATE POLICY "Admins can delete video_queue" ON public.video_queue FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- video_repurposes
DROP POLICY IF EXISTS "Members can view video_repurposes" ON public.video_repurposes;
CREATE POLICY "Members can view video_repurposes" ON public.video_repurposes FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can insert video_repurposes" ON public.video_repurposes;
CREATE POLICY "Operators+ can insert video_repurposes" ON public.video_repurposes FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Operators+ can update video_repurposes" ON public.video_repurposes;
CREATE POLICY "Operators+ can update video_repurposes" ON public.video_repurposes FOR UPDATE TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
DROP POLICY IF EXISTS "Admins can delete video_repurposes" ON public.video_repurposes;
CREATE POLICY "Admins can delete video_repurposes" ON public.video_repurposes FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- video_sponsor_segments
DROP POLICY IF EXISTS "Members can view video_sponsor_segments" ON public.video_sponsor_segments;
CREATE POLICY "Members can view video_sponsor_segments" ON public.video_sponsor_segments FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Operators+ can manage video_sponsor_segments" ON public.video_sponsor_segments;
CREATE POLICY "Operators+ can manage video_sponsor_segments" ON public.video_sponsor_segments FOR ALL TO authenticated USING (get_workspace_role(workspace_id) IN ('admin','operator','contributor')) WITH CHECK (get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- video_subtitles
DROP POLICY IF EXISTS "Members can manage video_subtitles" ON public.video_subtitles;
CREATE POLICY "Members can manage video_subtitles" ON public.video_subtitles FOR ALL TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can view video_subtitles" ON public.video_subtitles;
CREATE POLICY "Members can view video_subtitles" ON public.video_subtitles FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- workspace_identity
DROP POLICY IF EXISTS "Admins can manage workspace_identity" ON public.workspace_identity;
CREATE POLICY "Admins can manage workspace_identity" ON public.workspace_identity FOR ALL TO authenticated USING (get_workspace_role(workspace_id) = 'admin') WITH CHECK (get_workspace_role(workspace_id) = 'admin');
DROP POLICY IF EXISTS "Members can view workspace_identity" ON public.workspace_identity;
CREATE POLICY "Members can view workspace_identity" ON public.workspace_identity FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

-- workspace_members
DROP POLICY IF EXISTS "Members can view members" ON public.workspace_members;
CREATE POLICY "Members can view members" ON public.workspace_members FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Admins can insert members" ON public.workspace_members;
CREATE POLICY "Admins can insert members" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (get_workspace_role(workspace_id) = 'admin');
DROP POLICY IF EXISTS "Admins can delete members" ON public.workspace_members;
CREATE POLICY "Admins can delete members" ON public.workspace_members FOR DELETE TO authenticated USING (get_workspace_role(workspace_id) = 'admin');

-- workspaces
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
CREATE POLICY "Members can view workspace" ON public.workspaces FOR SELECT TO authenticated USING (is_workspace_member(id));
DROP POLICY IF EXISTS "Admins can update workspace" ON public.workspaces;
CREATE POLICY "Admins can update workspace" ON public.workspaces FOR UPDATE TO authenticated USING (get_workspace_role(id) = 'admin');
DROP POLICY IF EXISTS "Authenticated users can create workspace" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspace" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);

-- youtube_channel_analytics
DROP POLICY IF EXISTS "Members can view youtube_channel_analytics" ON public.youtube_channel_analytics;
CREATE POLICY "Members can view youtube_channel_analytics" ON public.youtube_channel_analytics FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_channel_analytics" ON public.youtube_channel_analytics;
CREATE POLICY "Service can insert youtube_channel_analytics" ON public.youtube_channel_analytics FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can update youtube_channel_analytics" ON public.youtube_channel_analytics;
CREATE POLICY "Service can update youtube_channel_analytics" ON public.youtube_channel_analytics FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));

-- youtube_channel_stats
DROP POLICY IF EXISTS "Members can view youtube_channel_stats" ON public.youtube_channel_stats;
CREATE POLICY "Members can view youtube_channel_stats" ON public.youtube_channel_stats FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_channel_stats" ON public.youtube_channel_stats;
CREATE POLICY "Service can insert youtube_channel_stats" ON public.youtube_channel_stats FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));

-- youtube_demographics
DROP POLICY IF EXISTS "Members can view youtube_demographics" ON public.youtube_demographics;
CREATE POLICY "Members can view youtube_demographics" ON public.youtube_demographics FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_demographics" ON public.youtube_demographics;
CREATE POLICY "Service can insert youtube_demographics" ON public.youtube_demographics FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can update youtube_demographics" ON public.youtube_demographics;
CREATE POLICY "Service can update youtube_demographics" ON public.youtube_demographics FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));

-- youtube_device_types
DROP POLICY IF EXISTS "Members can view youtube_device_types" ON public.youtube_device_types;
CREATE POLICY "Members can view youtube_device_types" ON public.youtube_device_types FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_device_types" ON public.youtube_device_types;
CREATE POLICY "Service can insert youtube_device_types" ON public.youtube_device_types FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can update youtube_device_types" ON public.youtube_device_types;
CREATE POLICY "Service can update youtube_device_types" ON public.youtube_device_types FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));

-- youtube_geography
DROP POLICY IF EXISTS "Members can view youtube_geography" ON public.youtube_geography;
CREATE POLICY "Members can view youtube_geography" ON public.youtube_geography FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_geography" ON public.youtube_geography;
CREATE POLICY "Service can insert youtube_geography" ON public.youtube_geography FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can update youtube_geography" ON public.youtube_geography;
CREATE POLICY "Service can update youtube_geography" ON public.youtube_geography FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));

-- youtube_traffic_sources
DROP POLICY IF EXISTS "Members can view youtube_traffic_sources" ON public.youtube_traffic_sources;
CREATE POLICY "Members can view youtube_traffic_sources" ON public.youtube_traffic_sources FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_traffic_sources" ON public.youtube_traffic_sources;
CREATE POLICY "Service can insert youtube_traffic_sources" ON public.youtube_traffic_sources FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can update youtube_traffic_sources" ON public.youtube_traffic_sources;
CREATE POLICY "Service can update youtube_traffic_sources" ON public.youtube_traffic_sources FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));

-- youtube_video_analytics
DROP POLICY IF EXISTS "Members can view youtube_video_analytics" ON public.youtube_video_analytics;
CREATE POLICY "Members can view youtube_video_analytics" ON public.youtube_video_analytics FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_video_analytics" ON public.youtube_video_analytics;
CREATE POLICY "Service can insert youtube_video_analytics" ON public.youtube_video_analytics FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can update youtube_video_analytics" ON public.youtube_video_analytics;
CREATE POLICY "Service can update youtube_video_analytics" ON public.youtube_video_analytics FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));

-- youtube_video_stats
DROP POLICY IF EXISTS "Members can view youtube_video_stats" ON public.youtube_video_stats;
CREATE POLICY "Members can view youtube_video_stats" ON public.youtube_video_stats FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can insert youtube_video_stats" ON public.youtube_video_stats;
CREATE POLICY "Service can insert youtube_video_stats" ON public.youtube_video_stats FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Service can update youtube_video_stats" ON public.youtube_video_stats;
CREATE POLICY "Service can update youtube_video_stats" ON public.youtube_video_stats FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
