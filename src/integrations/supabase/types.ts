export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          performed_at: string
          performed_by: string | null
          title: string | null
          workspace_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          title?: string | null
          workspace_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          title?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_programs: {
        Row: {
          affiliate_links: Json | null
          commission_percentage: number
          company_id: string | null
          created_at: string
          created_by: string | null
          dashboard_url: string | null
          id: string
          minimum_payout: number
          next_payout_date: string | null
          notes: string | null
          payment_methods: Json | null
          payout_frequency: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          affiliate_links?: Json | null
          commission_percentage?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dashboard_url?: string | null
          id?: string
          minimum_payout?: number
          next_payout_date?: string | null
          notes?: string | null
          payment_methods?: Json | null
          payout_frequency?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          affiliate_links?: Json | null
          commission_percentage?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dashboard_url?: string | null
          id?: string
          minimum_payout?: number
          next_payout_date?: string | null
          notes?: string | null
          payment_methods?: Json | null
          payout_frequency?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_programs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_transactions: {
        Row: {
          affiliate_program_id: string | null
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          sale_amount: number | null
          status: string
          transaction_date: string | null
          video_queue_id: string | null
          workspace_id: string
        }
        Insert: {
          affiliate_program_id?: string | null
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          sale_amount?: number | null
          status?: string
          transaction_date?: string | null
          video_queue_id?: string | null
          workspace_id: string
        }
        Update: {
          affiliate_program_id?: string | null
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          sale_amount?: number | null
          status?: string
          transaction_date?: string | null
          video_queue_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_transactions_affiliate_program_id_fkey"
            columns: ["affiliate_program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_ab_tests: {
        Row: {
          agent_slug: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          status: string
          test_input: string
          variant_a_model: string
          variant_a_output: string | null
          variant_a_prompt: string
          variant_b_model: string
          variant_b_output: string | null
          variant_b_prompt: string
          winner: string | null
          workspace_id: string
        }
        Insert: {
          agent_slug: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          status?: string
          test_input?: string
          variant_a_model?: string
          variant_a_output?: string | null
          variant_a_prompt?: string
          variant_b_model?: string
          variant_b_output?: string | null
          variant_b_prompt?: string
          winner?: string | null
          workspace_id: string
        }
        Update: {
          agent_slug?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          status?: string
          test_input?: string
          variant_a_model?: string
          variant_a_output?: string | null
          variant_a_prompt?: string
          variant_b_model?: string
          variant_b_output?: string | null
          variant_b_prompt?: string
          winner?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_ab_tests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_alert_thresholds: {
        Row: {
          agent_slug: string
          condition: string
          cooldown_hours: number
          created_at: string
          enabled: boolean
          id: string
          last_triggered_at: string | null
          metric_name: string
          threshold_value: number
          trigger_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_slug: string
          condition?: string
          cooldown_hours?: number
          created_at?: string
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          metric_name: string
          threshold_value: number
          trigger_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_slug?: string
          condition?: string
          cooldown_hours?: number
          created_at?: string
          enabled?: boolean
          id?: string
          last_triggered_at?: string | null
          metric_name?: string
          threshold_value?: number
          trigger_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_alert_thresholds_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_collaboration_messages: {
        Row: {
          agent_slug: string
          content: string
          created_at: string
          handoff_to: string | null
          id: string
          metadata: Json | null
          thread_id: string
        }
        Insert: {
          agent_slug: string
          content?: string
          created_at?: string
          handoff_to?: string | null
          id?: string
          metadata?: Json | null
          thread_id: string
        }
        Update: {
          agent_slug?: string
          content?: string
          created_at?: string
          handoff_to?: string | null
          id?: string
          metadata?: Json | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_collaboration_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_collaboration_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_collaboration_threads: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_collaboration_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_custom_triggers: {
        Row: {
          agent_slug: string
          created_at: string
          created_by: string | null
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          name: string
          natural_language_rule: string
          parsed_condition: Json | null
          skill_slug: string | null
          trigger_count: number | null
          workspace_id: string
        }
        Insert: {
          agent_slug: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          name: string
          natural_language_rule: string
          parsed_condition?: Json | null
          skill_slug?: string | null
          trigger_count?: number | null
          workspace_id: string
        }
        Update: {
          agent_slug?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          natural_language_rule?: string
          parsed_condition?: Json | null
          skill_slug?: string | null
          trigger_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_custom_triggers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_definitions: {
        Row: {
          config: Json
          created_at: string
          description: string
          enabled: boolean
          id: string
          is_system: boolean
          model: string
          name: string
          skills: string[]
          slug: string
          system_prompt: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          is_system?: boolean
          model?: string
          name: string
          skills?: string[]
          slug: string
          system_prompt?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          is_system?: boolean
          model?: string
          name?: string
          skills?: string[]
          slug?: string
          system_prompt?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_definitions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_executions: {
        Row: {
          agent_id: string | null
          agent_slug: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json
          output: Json | null
          proposals_created: number
          skill_slug: string | null
          started_at: string | null
          status: string
          trigger_type: string
          workspace_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_slug: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json
          output?: Json | null
          proposals_created?: number
          skill_slug?: string | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string | null
          agent_slug?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json
          output?: Json | null
          proposals_created?: number
          skill_slug?: string | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_feedback: {
        Row: {
          action: string
          agent_slug: string
          created_at: string
          created_by: string | null
          edited_content: Json | null
          id: string
          original_content: Json | null
          proposal_id: string | null
          user_notes: string | null
          workspace_id: string
        }
        Insert: {
          action?: string
          agent_slug: string
          created_at?: string
          created_by?: string | null
          edited_content?: Json | null
          id?: string
          original_content?: Json | null
          proposal_id?: string | null
          user_notes?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          agent_slug?: string
          created_at?: string
          created_by?: string | null
          edited_content?: Json | null
          id?: string
          original_content?: Json | null
          proposal_id?: string | null
          user_notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_learning_preferences: {
        Row: {
          agent_slug: string
          created_at: string
          id: string
          learned_from_count: number
          preference_type: string
          preference_value: string
          updated_at: string
          weight: number
          workspace_id: string
        }
        Insert: {
          agent_slug: string
          created_at?: string
          id?: string
          learned_from_count?: number
          preference_type?: string
          preference_value: string
          updated_at?: string
          weight?: number
          workspace_id: string
        }
        Update: {
          agent_slug?: string
          created_at?: string
          id?: string
          learned_from_count?: number
          preference_type?: string
          preference_value?: string
          updated_at?: string
          weight?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_roi_snapshots: {
        Row: {
          acceptance_rate: number
          agent_slug: string
          avg_confidence: number
          created_at: string
          errors_count: number
          id: string
          operations_executed: number
          operations_proposed: number
          operations_rejected: number
          operations_rolled_back: number
          period_end: string
          period_start: string
          revenue_influenced: number
          time_saved_minutes: number
          workspace_id: string
        }
        Insert: {
          acceptance_rate?: number
          agent_slug: string
          avg_confidence?: number
          created_at?: string
          errors_count?: number
          id?: string
          operations_executed?: number
          operations_proposed?: number
          operations_rejected?: number
          operations_rolled_back?: number
          period_end: string
          period_start: string
          revenue_influenced?: number
          time_saved_minutes?: number
          workspace_id: string
        }
        Update: {
          acceptance_rate?: number
          agent_slug?: string
          avg_confidence?: number
          created_at?: string
          errors_count?: number
          id?: string
          operations_executed?: number
          operations_proposed?: number
          operations_rejected?: number
          operations_rolled_back?: number
          period_end?: string
          period_start?: string
          revenue_influenced?: number
          time_saved_minutes?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_roi_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_scorecards: {
        Row: {
          accepted_proposals: number
          agent_slug: string
          avg_confidence: number | null
          created_at: string
          id: string
          outcome_success_rate: number | null
          outcomes_tracked: number
          period_end: string
          period_start: string
          rejected_proposals: number
          total_proposals: number
          workspace_id: string
        }
        Insert: {
          accepted_proposals?: number
          agent_slug: string
          avg_confidence?: number | null
          created_at?: string
          id?: string
          outcome_success_rate?: number | null
          outcomes_tracked?: number
          period_end: string
          period_start: string
          rejected_proposals?: number
          total_proposals?: number
          workspace_id: string
        }
        Update: {
          accepted_proposals?: number
          agent_slug?: string
          avg_confidence?: number | null
          created_at?: string
          id?: string
          outcome_success_rate?: number | null
          outcomes_tracked?: number
          period_end?: string
          period_start?: string
          rejected_proposals?: number
          total_proposals?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_scorecards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          category: string
          created_at: string
          description: string
          enabled: boolean
          handler_code: string | null
          id: string
          input_schema: Json
          is_system: boolean
          name: string
          skill_type: string
          slug: string
          tool_definitions: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          handler_code?: string | null
          id?: string
          input_schema?: Json
          is_system?: boolean
          name: string
          skill_type?: string
          slug: string
          tool_definitions?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          handler_code?: string | null
          id?: string
          input_schema?: Json
          is_system?: boolean
          name?: string
          skill_type?: string
          slug?: string
          tool_definitions?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflow_steps: {
        Row: {
          agent_slug: string
          condition: Json | null
          created_at: string
          id: string
          input_template: Json | null
          skill_slug: string | null
          step_order: number
          workflow_id: string
        }
        Insert: {
          agent_slug: string
          condition?: Json | null
          created_at?: string
          id?: string
          input_template?: Json | null
          skill_slug?: string | null
          step_order?: number
          workflow_id: string
        }
        Update: {
          agent_slug?: string
          condition?: Json | null
          created_at?: string
          id?: string
          input_template?: Json | null
          skill_slug?: string | null
          step_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "agent_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflows: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          trigger_config: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          trigger_config?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          trigger_config?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_proposals: {
        Row: {
          company_id: string | null
          confidence: number | null
          contact_id: string | null
          content: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          execution_status: string | null
          id: string
          metadata: Json | null
          optimization_proof: Json | null
          proposal_type: string | null
          proposed_changes: Json | null
          requires_thumbnail_generation: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string | null
          thumbnail_prompts: string[] | null
          thumbnail_urls: string[] | null
          title: string
          type: string
          updated_at: string
          video_id: string | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          confidence?: number | null
          contact_id?: string | null
          content?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          execution_status?: string | null
          id?: string
          metadata?: Json | null
          optimization_proof?: Json | null
          proposal_type?: string | null
          proposed_changes?: Json | null
          requires_thumbnail_generation?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string | null
          thumbnail_prompts?: string[] | null
          thumbnail_urls?: string[] | null
          title: string
          type?: string
          updated_at?: string
          video_id?: string | null
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          confidence?: number | null
          contact_id?: string | null
          content?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          execution_status?: string | null
          id?: string
          metadata?: Json | null
          optimization_proof?: Json | null
          proposal_type?: string | null
          proposed_changes?: Json | null
          requires_thumbnail_generation?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string | null
          thumbnail_prompts?: string[] | null
          thumbnail_urls?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          video_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_usage_log: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[]
          rate_limit_per_minute: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          rate_limit_per_minute?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          rate_limit_per_minute?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_actions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          proposal_id: string | null
          status: string
          task_id: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          proposal_id?: string | null
          status?: string
          task_id?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          proposal_id?: string | null
          status?: string
          task_id?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_actions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          tool_name: string | null
          tool_result: Json | null
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          tool_name?: string | null
          tool_result?: Json | null
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          tool_name?: string | null
          tool_result?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_daily_logs: {
        Row: {
          content: string
          created_at: string
          id: string
          log_date: string
          source: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          log_date?: string
          source?: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          log_date?: string
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_daily_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_memory: {
        Row: {
          access_count: number | null
          agent_id: string
          confidence_score: number | null
          content: string
          created_at: string
          decay_rate: number | null
          edit_history: Json | null
          embedding: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          importance_score: number | null
          is_pinned: boolean | null
          last_accessed_at: string | null
          memory_type: string | null
          origin: string
          related_memory_ids: string[] | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_session_id: string | null
          source_type: string | null
          status: string
          tags: string[] | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          visibility: string
          workspace_id: string
        }
        Insert: {
          access_count?: number | null
          agent_id?: string
          confidence_score?: number | null
          content: string
          created_at?: string
          decay_rate?: number | null
          edit_history?: Json | null
          embedding?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          importance_score?: number | null
          is_pinned?: boolean | null
          last_accessed_at?: string | null
          memory_type?: string | null
          origin?: string
          related_memory_ids?: string[] | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_session_id?: string | null
          source_type?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          visibility?: string
          workspace_id: string
        }
        Update: {
          access_count?: number | null
          agent_id?: string
          confidence_score?: number | null
          content?: string
          created_at?: string
          decay_rate?: number | null
          edit_history?: Json | null
          embedding?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          importance_score?: number | null
          is_pinned?: boolean | null
          last_accessed_at?: string | null
          memory_type?: string | null
          origin?: string
          related_memory_ids?: string[] | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_session_id?: string | null
          source_type?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_service_snapshots: {
        Row: {
          created_at: string
          id: string
          raw_data: Json | null
          service: string
          snapshot_date: string
          summary: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_data?: Json | null
          service: string
          snapshot_date?: string
          summary: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_data?: Json | null
          service?: string
          snapshot_date?: string
          summary?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_service_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_overlap_reports: {
        Row: {
          created_at: string
          id: string
          overlap_score: number
          overlap_type: string
          recommendation: string | null
          shared_keywords: string[] | null
          status: string
          video_a_id: string
          video_b_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          overlap_score?: number
          overlap_type?: string
          recommendation?: string | null
          shared_keywords?: string[] | null
          status?: string
          video_a_id: string
          video_b_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          overlap_score?: number
          overlap_type?: string
          recommendation?: string | null
          shared_keywords?: string[] | null
          status?: string
          video_a_id?: string
          video_b_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_overlap_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_bcc_rules: {
        Row: {
          bcc_email: string
          condition_type: string
          condition_value: string | null
          created_at: string
          id: string
          is_active: boolean
          workspace_id: string
        }
        Insert: {
          bcc_email: string
          condition_type?: string
          condition_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          workspace_id: string
        }
        Update: {
          bcc_email?: string
          condition_type?: string
          condition_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_bcc_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_execution_rules: {
        Row: {
          agent_slug: string
          auto_executed_count: number
          confidence_threshold: number
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_slug: string
          auto_executed_count?: number
          confidence_threshold?: number
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_slug?: string
          auto_executed_count?: number
          confidence_threshold?: number
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_execution_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_approval_policies: {
        Row: {
          agent_slug: string | null
          auto_approve: boolean
          confidence_threshold: number
          created_at: string
          domain: string | null
          enabled: boolean
          id: string
          max_auto_executions_per_day: number
          require_human_review: boolean
          risk_level: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_slug?: string | null
          auto_approve?: boolean
          confidence_threshold?: number
          created_at?: string
          domain?: string | null
          enabled?: boolean
          id?: string
          max_auto_executions_per_day?: number
          require_human_review?: boolean
          risk_level?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_slug?: string | null
          auto_approve?: boolean
          confidence_threshold?: number
          created_at?: string
          domain?: string | null
          enabled?: boolean
          id?: string
          max_auto_executions_per_day?: number
          require_human_review?: boolean
          risk_level?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_approval_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_operations_log: {
        Row: {
          agent_slug: string
          approved_at: string | null
          approved_by: string | null
          confidence: number
          created_at: string
          domain: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          executed_at: string | null
          execution_error: string | null
          id: string
          operation_type: string
          payload: Json
          rationale: string | null
          result: Json | null
          risk_level: string
          rollback_payload: Json | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          source_proposal_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_slug: string
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number
          created_at?: string
          domain?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          executed_at?: string | null
          execution_error?: string | null
          id?: string
          operation_type: string
          payload?: Json
          rationale?: string | null
          result?: Json | null
          risk_level?: string
          rollback_payload?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          source_proposal_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_slug?: string
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number
          created_at?: string
          domain?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          executed_at?: string | null
          execution_error?: string | null
          id?: string
          operation_type?: string
          payload?: Json
          rationale?: string | null
          result?: Json | null
          risk_level?: string
          rollback_payload?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          source_proposal_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_operations_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      beehiiv_post_link_clicks: {
        Row: {
          beehiiv_post_id: string
          created_at: string
          id: string
          newsletter_issue_id: string | null
          total_clicks: number | null
          total_unique_clicks: number | null
          unique_clicks: number | null
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          beehiiv_post_id: string
          created_at?: string
          id?: string
          newsletter_issue_id?: string | null
          total_clicks?: number | null
          total_unique_clicks?: number | null
          unique_clicks?: number | null
          updated_at?: string
          url: string
          workspace_id: string
        }
        Update: {
          beehiiv_post_id?: string
          created_at?: string
          id?: string
          newsletter_issue_id?: string | null
          total_clicks?: number | null
          total_unique_clicks?: number | null
          unique_clicks?: number | null
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beehiiv_post_link_clicks_newsletter_issue_id_fkey"
            columns: ["newsletter_issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beehiiv_post_link_clicks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      beehiiv_publication_snapshots: {
        Row: {
          acquisition_sources: Json | null
          active_subscribers: number
          all_time_click_rate: number | null
          all_time_open_rate: number | null
          churned_subscribers: number | null
          created_at: string
          id: string
          net_subscribers: number | null
          new_subscribers: number | null
          publication_id: string
          snapshot_date: string
          workspace_id: string
        }
        Insert: {
          acquisition_sources?: Json | null
          active_subscribers?: number
          all_time_click_rate?: number | null
          all_time_open_rate?: number | null
          churned_subscribers?: number | null
          created_at?: string
          id?: string
          net_subscribers?: number | null
          new_subscribers?: number | null
          publication_id: string
          snapshot_date?: string
          workspace_id: string
        }
        Update: {
          acquisition_sources?: Json | null
          active_subscribers?: number
          all_time_click_rate?: number | null
          all_time_open_rate?: number | null
          churned_subscribers?: number | null
          created_at?: string
          id?: string
          net_subscribers?: number | null
          new_subscribers?: number | null
          publication_id?: string
          snapshot_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beehiiv_publication_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      beehiiv_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          new_subscribers_count: number | null
          started_at: string
          status: string
          status_changes_count: number | null
          subscribers_synced: number | null
          sync_type: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          new_subscribers_count?: number | null
          started_at?: string
          status?: string
          status_changes_count?: number | null
          subscribers_synced?: number | null
          sync_type?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          new_subscribers_count?: number | null
          started_at?: string
          status?: string
          status_changes_count?: number | null
          subscribers_synced?: number | null
          sync_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beehiiv_sync_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_recovery_outcomes: {
        Row: {
          created_at: string
          critical_risk_count: number
          high_risk_count: number
          id: string
          incremental_retained: number
          journeys_completed: number
          journeys_triggered: number
          low_risk_count: number
          medium_risk_count: number
          period_end: string
          period_start: string
          saved_rate: number
          subscribers_lost: number
          subscribers_saved: number
          total_at_risk: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          critical_risk_count?: number
          high_risk_count?: number
          id?: string
          incremental_retained?: number
          journeys_completed?: number
          journeys_triggered?: number
          low_risk_count?: number
          medium_risk_count?: number
          period_end: string
          period_start: string
          saved_rate?: number
          subscribers_lost?: number
          subscribers_saved?: number
          total_at_risk?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          critical_risk_count?: number
          high_risk_count?: number
          id?: string
          incremental_retained?: number
          journeys_completed?: number
          journeys_triggered?: number
          low_risk_count?: number
          medium_risk_count?: number
          period_end?: string
          period_start?: string
          saved_rate?: number
          subscribers_lost?: number
          subscribers_saved?: number
          total_at_risk?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_recovery_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          competitor_group: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          enrichment_brandfetch: Json | null
          enrichment_clay: Json | null
          enrichment_firecrawl: Json | null
          founded_year: number | null
          founder_names: string | null
          funding_stage: string | null
          id: string
          industry: string | null
          is_agency: boolean
          last_contact_date: string | null
          last_funding_date: string | null
          location: string | null
          logo_url: string | null
          name: string
          notes: string | null
          outreach_status: string | null
          phone: string | null
          pricing_model: string | null
          primary_email: string | null
          response_sla_minutes: number | null
          revenue: string | null
          secondary_email: string | null
          size: string | null
          social_crunchbase: string | null
          social_discord: string | null
          social_facebook: string | null
          social_github: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_producthunt: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_whatsapp: string | null
          social_youtube: string | null
          sponsor_fit_score: number | null
          state: string | null
          tech_stack: string | null
          total_funding: number | null
          updated_at: string
          vip_tier: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          city?: string | null
          competitor_group?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enrichment_brandfetch?: Json | null
          enrichment_clay?: Json | null
          enrichment_firecrawl?: Json | null
          founded_year?: number | null
          founder_names?: string | null
          funding_stage?: string | null
          id?: string
          industry?: string | null
          is_agency?: boolean
          last_contact_date?: string | null
          last_funding_date?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          pricing_model?: string | null
          primary_email?: string | null
          response_sla_minutes?: number | null
          revenue?: string | null
          secondary_email?: string | null
          size?: string | null
          social_crunchbase?: string | null
          social_discord?: string | null
          social_facebook?: string | null
          social_github?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_producthunt?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          sponsor_fit_score?: number | null
          state?: string | null
          tech_stack?: string | null
          total_funding?: number | null
          updated_at?: string
          vip_tier?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          city?: string | null
          competitor_group?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enrichment_brandfetch?: Json | null
          enrichment_clay?: Json | null
          enrichment_firecrawl?: Json | null
          founded_year?: number | null
          founder_names?: string | null
          funding_stage?: string | null
          id?: string
          industry?: string | null
          is_agency?: boolean
          last_contact_date?: string | null
          last_funding_date?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          pricing_model?: string | null
          primary_email?: string | null
          response_sla_minutes?: number | null
          revenue?: string | null
          secondary_email?: string | null
          size?: string | null
          social_crunchbase?: string | null
          social_discord?: string | null
          social_facebook?: string | null
          social_github?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_producthunt?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          sponsor_fit_score?: number | null
          state?: string | null
          tech_stack?: string | null
          total_funding?: number | null
          updated_at?: string
          vip_tier?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_agency_links: {
        Row: {
          agency_id: string
          client_company_id: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agency_id: string
          client_company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agency_id?: string
          client_company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_agency_links_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_agency_links_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_agency_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_health_scores: {
        Row: {
          company_id: string
          created_at: string
          deal_velocity_score: number
          engagement_score: number
          id: string
          last_calculated_at: string
          overall_score: number
          recency_score: number
          response_score: number
          revenue_score: number
          risk_factors: Json | null
          risk_level: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deal_velocity_score?: number
          engagement_score?: number
          id?: string
          last_calculated_at?: string
          overall_score?: number
          recency_score?: number
          response_score?: number
          revenue_score?: number
          risk_factors?: Json | null
          risk_level?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deal_velocity_score?: number
          engagement_score?: number
          id?: string
          last_calculated_at?: string
          overall_score?: number
          recency_score?: number
          response_score?: number
          revenue_score?: number
          risk_factors?: Json | null
          risk_level?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_health_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_health_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_intel: {
        Row: {
          company_id: string
          created_at: string
          detected_at: string
          id: string
          intel_type: string
          is_read: boolean
          metadata: Json | null
          relevance_score: number | null
          source: string
          source_url: string | null
          summary: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          detected_at?: string
          id?: string
          intel_type?: string
          is_read?: boolean
          metadata?: Json | null
          relevance_score?: number | null
          source?: string
          source_url?: string | null
          summary?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          detected_at?: string
          id?: string
          intel_type?: string
          is_read?: boolean
          metadata?: Json | null
          relevance_score?: number | null
          source?: string
          source_url?: string | null
          summary?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_intel_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_intel_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_people: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          email: string | null
          id: string
          is_founder: boolean | null
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          twitter_handle: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_founder?: boolean | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          twitter_handle?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_founder?: boolean | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          twitter_handle?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_people_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_people_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pricing: {
        Row: {
          company_id: string
          created_at: string
          currency: string | null
          features: string | null
          id: string
          is_most_popular: boolean | null
          last_verified_at: string | null
          notes: string | null
          price_monthly: number | null
          price_yearly: number | null
          sort_order: number | null
          tier_name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string | null
          features?: string | null
          id?: string
          is_most_popular?: boolean | null
          last_verified_at?: string | null
          notes?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          tier_name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string | null
          features?: string | null
          id?: string
          is_most_popular?: boolean | null
          last_verified_at?: string | null
          notes?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          tier_name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pricing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pricing_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_relationships: {
        Row: {
          company_a_id: string
          company_b_id: string
          created_at: string
          id: string
          notes: string | null
          relationship_type: string
          workspace_id: string
        }
        Insert: {
          company_a_id: string
          company_b_id: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type: string
          workspace_id: string
        }
        Update: {
          company_a_id?: string
          company_b_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_relationships_company_a_id_fkey"
            columns: ["company_a_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_company_b_id_fkey"
            columns: ["company_b_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_channels: {
        Row: {
          avg_ctr: number | null
          avg_views_per_video: number | null
          channel_name: string
          channel_url: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          notes: string | null
          primary_niche: string | null
          subscriber_count: number | null
          total_view_count: number | null
          updated_at: string
          upload_frequency: string | null
          video_count: number | null
          workspace_id: string
          youtube_channel_id: string | null
        }
        Insert: {
          avg_ctr?: number | null
          avg_views_per_video?: number | null
          channel_name: string
          channel_url?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          primary_niche?: string | null
          subscriber_count?: number | null
          total_view_count?: number | null
          updated_at?: string
          upload_frequency?: string | null
          video_count?: number | null
          workspace_id: string
          youtube_channel_id?: string | null
        }
        Update: {
          avg_ctr?: number | null
          avg_views_per_video?: number | null
          channel_name?: string
          channel_url?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          primary_niche?: string | null
          subscriber_count?: number | null
          total_view_count?: number | null
          updated_at?: string
          upload_frequency?: string | null
          video_count?: number | null
          workspace_id?: string
          youtube_channel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_sponsors: {
        Row: {
          company_id: string | null
          competitor_channels: string[] | null
          created_at: string | null
          deal_id: string | null
          detection_method: string | null
          dismissed: boolean | null
          first_detected_at: string | null
          id: string
          last_detected_at: string | null
          mention_count: number | null
          outreach_status: string | null
          outreach_suggestion: string | null
          sponsor_name: string
          sponsor_url: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          competitor_channels?: string[] | null
          created_at?: string | null
          deal_id?: string | null
          detection_method?: string | null
          dismissed?: boolean | null
          first_detected_at?: string | null
          id?: string
          last_detected_at?: string | null
          mention_count?: number | null
          outreach_status?: string | null
          outreach_suggestion?: string | null
          sponsor_name: string
          sponsor_url?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          competitor_channels?: string[] | null
          created_at?: string | null
          deal_id?: string | null
          detection_method?: string | null
          dismissed?: boolean | null
          first_detected_at?: string | null
          id?: string
          last_detected_at?: string | null
          mention_count?: number | null
          outreach_status?: string | null
          outreach_suggestion?: string | null
          sponsor_name?: string
          sponsor_url?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_sponsors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_sponsors_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_stats_history: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          recorded_at: string
          subscriber_count: number | null
          total_views: number | null
          video_count: number | null
          workspace_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          recorded_at?: string
          subscriber_count?: number | null
          total_views?: number | null
          video_count?: number | null
          workspace_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          recorded_at?: string
          subscriber_count?: number | null
          total_views?: number | null
          video_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_stats_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_interactions: {
        Row: {
          contact_id: string
          created_at: string
          deal_id: string | null
          direction: string
          email_id: string | null
          id: string
          interaction_date: string
          interaction_type: string
          notes: string | null
          subject: string | null
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          deal_id?: string | null
          direction?: string
          email_id?: string | null
          id?: string
          interaction_date?: string
          interaction_type: string
          notes?: string | null
          subject?: string | null
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          deal_id?: string | null
          direction?: string
          email_id?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          subject?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_interactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          city: string | null
          company_id: string | null
          contact_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          deleted_at: string | null
          department: string | null
          email: string | null
          enrichment_ai: Json | null
          enrichment_hunter: Json | null
          enrichment_youtube: Json | null
          escalation_owner_id: string | null
          first_name: string
          id: string
          is_decision_maker: boolean | null
          job_title: string | null
          last_contact_date: string | null
          last_name: string | null
          last_outreach_date: string | null
          last_response_date: string | null
          lead_score: number | null
          next_follow_up_date: string | null
          notes: string | null
          outreach_count: number | null
          owner_id: string | null
          payment_terms: string | null
          phone: string | null
          preferred_channel: string | null
          preferred_deal_type: string | null
          referral_source: string | null
          reports_to: string | null
          response_sla_minutes: number | null
          role: string | null
          role_id: string | null
          secondary_email: string | null
          social_discord: string | null
          social_facebook: string | null
          social_github: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_telegram: string | null
          social_twitter: string | null
          social_whatsapp: string | null
          social_youtube: string | null
          source: string | null
          source_detail: string | null
          state: string | null
          status: string
          timezone: string | null
          typical_budget_range: string | null
          updated_at: string
          vip_tier: string | null
          warmth: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          company_id?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          enrichment_ai?: Json | null
          enrichment_hunter?: Json | null
          enrichment_youtube?: Json | null
          escalation_owner_id?: string | null
          first_name: string
          id?: string
          is_decision_maker?: boolean | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          last_outreach_date?: string | null
          last_response_date?: string | null
          lead_score?: number | null
          next_follow_up_date?: string | null
          notes?: string | null
          outreach_count?: number | null
          owner_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_channel?: string | null
          preferred_deal_type?: string | null
          referral_source?: string | null
          reports_to?: string | null
          response_sla_minutes?: number | null
          role?: string | null
          role_id?: string | null
          secondary_email?: string | null
          social_discord?: string | null
          social_facebook?: string | null
          social_github?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_telegram?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          source?: string | null
          source_detail?: string | null
          state?: string | null
          status?: string
          timezone?: string | null
          typical_budget_range?: string | null
          updated_at?: string
          vip_tier?: string | null
          warmth?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          company_id?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          enrichment_ai?: Json | null
          enrichment_hunter?: Json | null
          enrichment_youtube?: Json | null
          escalation_owner_id?: string | null
          first_name?: string
          id?: string
          is_decision_maker?: boolean | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          last_outreach_date?: string | null
          last_response_date?: string | null
          lead_score?: number | null
          next_follow_up_date?: string | null
          notes?: string | null
          outreach_count?: number | null
          owner_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_channel?: string | null
          preferred_deal_type?: string | null
          referral_source?: string | null
          reports_to?: string | null
          response_sla_minutes?: number | null
          role?: string | null
          role_id?: string | null
          secondary_email?: string | null
          social_discord?: string | null
          social_facebook?: string | null
          social_github?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_telegram?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          source?: string | null
          source_detail?: string | null
          state?: string | null
          status?: string
          timezone?: string | null
          typical_budget_range?: string | null
          updated_at?: string
          vip_tier?: string | null
          warmth?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contacts_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_decay_alerts: {
        Row: {
          actioned_at: string | null
          created_at: string
          current_value: number | null
          decay_type: string
          decline_percent: number | null
          id: string
          previous_value: number | null
          status: string
          suggested_actions: Json | null
          video_title: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          actioned_at?: string | null
          created_at?: string
          current_value?: number | null
          decay_type?: string
          decline_percent?: number | null
          id?: string
          previous_value?: number | null
          status?: string
          suggested_actions?: Json | null
          video_title?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          actioned_at?: string | null
          created_at?: string
          current_value?: number | null
          decay_type?: string
          decline_percent?: number | null
          id?: string
          previous_value?: number | null
          status?: string
          suggested_actions?: Json | null
          video_title?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_decay_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sponsor_taxonomy: {
        Row: {
          affinity_score: number
          content_category: string
          created_at: string
          id: string
          notes: string | null
          sponsor_vertical: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          affinity_score?: number
          content_category: string
          created_at?: string
          id?: string
          notes?: string | null
          sponsor_vertical: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          affinity_score?: number
          content_category?: string
          created_at?: string
          id?: string
          notes?: string | null
          sponsor_vertical?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sponsor_taxonomy_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_extraction_log: {
        Row: {
          created_at: string
          id: string
          memories_extracted: number
          message_count: number
          model_used: string | null
          session_id: string
          skipped_reason: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memories_extracted?: number
          message_count?: number
          model_used?: string | null
          session_id: string
          skipped_reason?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memories_extracted?: number
          message_count?: number
          model_used?: string | null
          session_id?: string
          skipped_reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_extraction_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_sync_status: {
        Row: {
          created_at: string
          dataset_key: string
          id: string
          last_error: string | null
          last_successful_sync_at: string | null
          last_sync_triggered_by: string | null
          next_eligible_sync_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_key: string
          id?: string
          last_error?: string | null
          last_successful_sync_at?: string | null
          last_sync_triggered_by?: string | null
          next_eligible_sync_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_key?: string
          id?: string
          last_error?: string | null
          last_successful_sync_at?: string | null
          last_sync_triggered_by?: string | null
          next_eligible_sync_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_sync_status_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_videos: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_videos_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_videos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          expected_close_date: string | null
          forecast_category: string | null
          id: string
          notes: string | null
          owner_id: string | null
          stage: string
          title: string
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          expected_close_date?: string | null
          forecast_category?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          stage?: string
          title: string
          updated_at?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          expected_close_date?: string | null
          forecast_category?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          stage?: string
          title?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_history: {
        Row: {
          content_json: Json
          created_at: string
          generated_at: string
          id: string
          settings_snapshot: Json
          workspace_id: string
        }
        Insert: {
          content_json?: Json
          created_at?: string
          generated_at?: string
          id?: string
          settings_snapshot?: Json
          workspace_id: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          generated_at?: string
          id?: string
          settings_snapshot?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_settings: {
        Row: {
          agent_scope: string[]
          created_at: string
          delivery_time: string
          frequency: string
          id: string
          include_conflicts: boolean
          include_consolidations: boolean
          include_health_score: boolean
          include_new_memories: boolean
          include_stale: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_scope?: string[]
          created_at?: string
          delivery_time?: string
          frequency?: string
          id?: string
          include_conflicts?: boolean
          include_consolidations?: boolean
          include_health_score?: boolean
          include_new_memories?: boolean
          include_stale?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_scope?: string[]
          created_at?: string
          delivery_time?: string
          frequency?: string
          id?: string
          include_conflicts?: boolean
          include_consolidations?: boolean
          include_health_score?: boolean
          include_new_memories?: boolean
          include_stale?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_auto_labels: {
        Row: {
          color: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          label_name: string
          natural_language_rule: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          label_name: string
          natural_language_rule: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          label_name?: string
          natural_language_rule?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_auto_labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_comments: {
        Row: {
          content: string
          created_at: string
          email_id: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          email_id: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          email_id?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_deal_suggestions: {
        Row: {
          actioned_at: string | null
          confidence: number | null
          contact_id: string | null
          context_snippet: string | null
          created_at: string
          deal_id: string | null
          email_id: string | null
          id: string
          status: string
          suggested_stage: string | null
          suggested_value: number | null
          suggestion_type: string
          workspace_id: string
        }
        Insert: {
          actioned_at?: string | null
          confidence?: number | null
          contact_id?: string | null
          context_snippet?: string | null
          created_at?: string
          deal_id?: string | null
          email_id?: string | null
          id?: string
          status?: string
          suggested_stage?: string | null
          suggested_value?: number | null
          suggestion_type?: string
          workspace_id: string
        }
        Update: {
          actioned_at?: string | null
          confidence?: number | null
          contact_id?: string | null
          context_snippet?: string | null
          created_at?: string
          deal_id?: string | null
          email_id?: string | null
          id?: string
          status?: string
          suggested_stage?: string | null
          suggested_value?: number | null
          suggestion_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_deal_suggestions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_deal_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_deal_suggestions_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "inbox_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_deal_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_follow_ups: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          due_date: string | null
          email_id: string | null
          id: string
          priority: string
          reason: string
          suggested_action: string | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          due_date?: string | null
          email_id?: string | null
          id?: string
          priority?: string
          reason?: string
          suggested_action?: string | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          due_date?: string | null
          email_id?: string | null
          id?: string
          priority?: string
          reason?: string
          suggested_action?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_follow_ups_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_follow_ups_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "inbox_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_follow_ups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_template: string
          category: string
          created_at: string
          id: string
          name: string
          subject_template: string
          updated_at: string
          usage_count: number
          variables: Json
          workspace_id: string
        }
        Insert: {
          body_template?: string
          category?: string
          created_at?: string
          id?: string
          name: string
          subject_template?: string
          updated_at?: string
          usage_count?: number
          variables?: Json
          workspace_id: string
        }
        Update: {
          body_template?: string
          category?: string
          created_at?: string
          id?: string
          name?: string
          subject_template?: string
          updated_at?: string
          usage_count?: number
          variables?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          expense_date: string
          id: string
          is_recurring: boolean
          is_tax_deductible: boolean
          notes: string | null
          receipt_url: string | null
          recurring_end_date: string | null
          recurring_interval: string | null
          tax_deductible_reason: string | null
          tax_review_status: string | null
          title: string
          updated_at: string
          vendor: string | null
          workspace_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          is_tax_deductible?: boolean
          notes?: string | null
          receipt_url?: string | null
          recurring_end_date?: string | null
          recurring_interval?: string | null
          tax_deductible_reason?: string | null
          tax_review_status?: string | null
          title: string
          updated_at?: string
          vendor?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          is_tax_deductible?: boolean
          notes?: string | null
          receipt_url?: string | null
          recurring_end_date?: string | null
          recurring_interval?: string | null
          tax_deductible_reason?: string | null
          tax_review_status?: string | null
          title?: string
          updated_at?: string
          vendor?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flux_generation_feedback: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          is_positive: boolean
          prompt: string | null
          session_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          is_positive: boolean
          prompt?: string | null
          session_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          is_positive?: boolean
          prompt?: string | null
          session_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flux_generation_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "flux_training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flux_generation_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flux_training_images: {
        Row: {
          caption: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          id: string
          session_id: string
          storage_path: string
          workspace_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          session_id: string
          storage_path: string
          workspace_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          session_id?: string
          storage_path?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flux_training_images_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "flux_training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flux_training_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flux_training_sessions: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          image_count: number | null
          metadata: Json | null
          name: string
          replicate_model_name: string | null
          replicate_model_version: string | null
          replicate_training_id: string | null
          status: string
          training_completed_at: string | null
          training_started_at: string | null
          trigger_word: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_count?: number | null
          metadata?: Json | null
          name?: string
          replicate_model_name?: string | null
          replicate_model_version?: string | null
          replicate_training_id?: string | null
          status?: string
          training_completed_at?: string | null
          training_started_at?: string | null
          trigger_word?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_count?: number | null
          metadata?: Json | null
          name?: string
          replicate_model_name?: string | null
          replicate_model_version?: string | null
          replicate_training_id?: string | null
          status?: string
          training_completed_at?: string | null
          training_started_at?: string | null
          trigger_word?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flux_training_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rounds: {
        Row: {
          amount: number | null
          company_id: string
          created_at: string
          date: string | null
          id: string
          lead_investor: string | null
          notes: string | null
          other_investors: string | null
          round_type: string
          source_url: string | null
          updated_at: string
          valuation_post: number | null
          valuation_pre: number | null
          workspace_id: string
        }
        Insert: {
          amount?: number | null
          company_id: string
          created_at?: string
          date?: string | null
          id?: string
          lead_investor?: string | null
          notes?: string | null
          other_investors?: string | null
          round_type: string
          source_url?: string | null
          updated_at?: string
          valuation_post?: number | null
          valuation_pre?: number | null
          workspace_id: string
        }
        Update: {
          amount?: number | null
          company_id?: string
          created_at?: string
          date?: string | null
          id?: string
          lead_investor?: string | null
          notes?: string | null
          other_investors?: string | null
          round_type?: string
          source_url?: string | null
          updated_at?: string
          valuation_post?: number | null
          valuation_pre?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_rounds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_rounds_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_goals: {
        Row: {
          created_at: string
          current_value: number
          id: string
          metric: string
          start_date: string | null
          status: string
          target_date: string | null
          target_value: number
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          metric?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_value?: number
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          metric?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_value?: number
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_emails: {
        Row: {
          ai_category: string | null
          ai_intent: string | null
          ai_priority: string | null
          ai_suggested_action: string | null
          ai_summary: string | null
          body_html: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          folder: string
          from_email: string
          from_name: string
          has_attachments: boolean
          id: string
          importance: string
          is_muted: boolean
          is_pinned: boolean
          is_read: boolean
          labels: string[] | null
          message_id: string
          metadata: Json | null
          open_count: number | null
          opened_at: string | null
          preview: string
          received_at: string
          scheduled_send_at: string | null
          send_status: string | null
          snoozed_until: string | null
          subject: string
          to_recipients: Json | null
          tracking_pixel_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_category?: string | null
          ai_intent?: string | null
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          body_html?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          folder?: string
          from_email?: string
          from_name?: string
          has_attachments?: boolean
          id?: string
          importance?: string
          is_muted?: boolean
          is_pinned?: boolean
          is_read?: boolean
          labels?: string[] | null
          message_id: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          preview?: string
          received_at?: string
          scheduled_send_at?: string | null
          send_status?: string | null
          snoozed_until?: string | null
          subject?: string
          to_recipients?: Json | null
          tracking_pixel_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_category?: string | null
          ai_intent?: string | null
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          body_html?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          folder?: string
          from_email?: string
          from_name?: string
          has_attachments?: boolean
          id?: string
          importance?: string
          is_muted?: boolean
          is_pinned?: boolean
          is_read?: boolean
          labels?: string[] | null
          message_id?: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          preview?: string
          received_at?: string
          scheduled_send_at?: string | null
          send_status?: string | null
          snoozed_until?: string | null
          subject?: string
          to_recipients?: Json | null
          tracking_pixel_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_feedback: {
        Row: {
          created_at: string
          email_address: string
          feedback_type: string
          id: string
          source: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email_address: string
          feedback_type?: string
          id?: string
          source?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email_address?: string
          feedback_type?: string
          id?: string
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_review_queue: {
        Row: {
          confidence: number
          created_at: string
          email_id: string
          extracted_data: Json
          id: string
          resolved_at: string | null
          resolved_by: string | null
          review_type: string
          status: string
          suggested_matches: Json
          workspace_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          email_id: string
          extracted_data?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_type?: string
          status?: string
          suggested_matches?: Json
          workspace_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          email_id?: string
          extracted_data?: Json
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_type?: string
          status?: string
          suggested_matches?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_review_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_route_actions: {
        Row: {
          action_type: string
          confidence: number
          created_at: string
          email_id: string
          id: string
          payload: Json
          rationale: string | null
          resolved_at: string | null
          resolved_by: string | null
          result_entity_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_type: string
          confidence?: number
          created_at?: string
          email_id: string
          id?: string
          payload?: Json
          rationale?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result_entity_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_type?: string
          confidence?: number
          created_at?: string
          email_id?: string
          id?: string
          payload?: Json
          rationale?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result_entity_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_route_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_token_health: {
        Row: {
          created_at: string
          error_message: string | null
          expires_in_seconds: number | null
          id: string
          integration_key: string
          last_checked_at: string
          last_healthy_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expires_in_seconds?: number | null
          id?: string
          integration_key: string
          last_checked_at?: string
          last_healthy_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expires_in_seconds?: number | null
          id?: string
          integration_key?: string
          last_checked_at?: string
          last_healthy_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_token_health_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          brand_address: string | null
          brand_logo_url: string | null
          brand_name: string | null
          client_address: string | null
          client_email: string | null
          client_name: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          deal_id: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          line_items: Json | null
          notes: string | null
          paid_date: string | null
          payment_terms: string | null
          sent_at: string | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_url: string | null
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string | null
          viewed_at: string | null
          workspace_id: string
        }
        Insert: {
          amount?: number
          brand_address?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          sent_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_url?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
          viewed_at?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          brand_address?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          payment_terms?: string | null
          sent_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_url?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
          viewed_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_adsense_revenue: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          month: string
          notes: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          notes?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          notes?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_adsense_revenue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_access_log: {
        Row: {
          accessed_at: string
          accessed_by: string
          id: string
          memory_id: string
          query_context: string | null
          workspace_id: string
        }
        Insert: {
          accessed_at?: string
          accessed_by?: string
          id?: string
          memory_id: string
          query_context?: string | null
          workspace_id: string
        }
        Update: {
          accessed_at?: string
          accessed_by?: string
          id?: string
          memory_id?: string
          query_context?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_access_log_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_access_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_conflicts: {
        Row: {
          conflict_type: Database["public"]["Enums"]["conflict_type"]
          created_at: string
          detected_at: string
          id: string
          memory_a_id: string
          memory_b_id: string
          resolution_type: string | null
          resolved_at: string | null
          resolved_by_memory_id: string | null
          status: Database["public"]["Enums"]["conflict_status"]
          workspace_id: string
        }
        Insert: {
          conflict_type?: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          detected_at?: string
          id?: string
          memory_a_id: string
          memory_b_id: string
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by_memory_id?: string | null
          status?: Database["public"]["Enums"]["conflict_status"]
          workspace_id: string
        }
        Update: {
          conflict_type?: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          detected_at?: string
          id?: string
          memory_a_id?: string
          memory_b_id?: string
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by_memory_id?: string | null
          status?: Database["public"]["Enums"]["conflict_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_conflicts_memory_a_id_fkey"
            columns: ["memory_a_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_conflicts_memory_b_id_fkey"
            columns: ["memory_b_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_conflicts_resolved_by_memory_id_fkey"
            columns: ["resolved_by_memory_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_conflicts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_edges: {
        Row: {
          created_at: string
          edge_type: Database["public"]["Enums"]["memory_edge_type"]
          from_id: string
          id: string
          to_id: string
          weight: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          edge_type?: Database["public"]["Enums"]["memory_edge_type"]
          from_id: string
          id?: string
          to_id: string
          weight?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          edge_type?: Database["public"]["Enums"]["memory_edge_type"]
          from_id?: string
          id?: string
          to_id?: string
          weight?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_edges_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_edges_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_edges_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_pipeline_config: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          pipeline_key: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          pipeline_key: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          pipeline_key?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_pipeline_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_ratings: {
        Row: {
          created_at: string
          id: string
          memory_id: string
          query_used: string | null
          rated_at: string
          rating: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_id: string
          query_used?: string | null
          rated_at?: string
          rating: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_id?: string
          query_used?: string | null
          rated_at?: string
          rating?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_ratings_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_ratings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_relationships: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          relationship_type: string
          source_memory_id: string
          strength: number
          target_memory_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_memory_id: string
          strength?: number
          target_memory_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_memory_id?: string
          strength?: number
          target_memory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_relationships_source_memory_id_fkey"
            columns: ["source_memory_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_relationships_target_memory_id_fkey"
            columns: ["target_memory_id"]
            isOneToOne: false
            referencedRelation: "assistant_memory"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_conversations: {
        Row: {
          conversation_id: string | null
          created_at: string
          from_email: string | null
          id: string
          workspace_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          from_email?: string | null
          id?: string
          workspace_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          from_email?: string | null
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muted_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_click_events: {
        Row: {
          contact_id: string | null
          created_at: string
          deal_id: string | null
          event_type: string
          id: string
          issue_id: string
          link_url: string | null
          subscriber_email: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          event_type?: string
          id?: string
          issue_id: string
          link_url?: string | null
          subscriber_email: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          event_type?: string
          id?: string
          issue_id?: string
          link_url?: string | null
          subscriber_email?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_click_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_click_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_click_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_issues: {
        Row: {
          ab_test_config: Json | null
          audience: string | null
          beehiiv_created_at: string | null
          beehiiv_last_synced_at: string | null
          beehiiv_post_id: string | null
          beehiiv_status: string | null
          beehiiv_sync_error: string | null
          beehiiv_updated_at: string | null
          body: string
          bounced_count: number
          clicked_count: number
          conversion_to_deal: number
          conversion_to_lead: number
          created_at: string
          email_bounce_rate: number | null
          email_click_count: number | null
          email_click_rate: number | null
          email_click_rate_verified: number | null
          email_delivered_count: number | null
          email_delivery_rate: number | null
          email_hard_bounced: number | null
          email_open_count: number | null
          email_open_rate: number | null
          email_sent_count: number | null
          email_soft_bounced: number | null
          email_spam_reported: number | null
          email_suppressions: number | null
          email_total_clicks_raw: number | null
          email_total_clicks_verified: number | null
          email_unique_click_count: number | null
          email_unique_clicks_raw: number | null
          email_unique_clicks_verified: number | null
          email_unique_open_count: number | null
          email_unsubscribe_rate: number | null
          id: string
          name: string
          opened_count: number
          preview_url: string | null
          publish_date: string | null
          replied_count: number
          scheduled_at: string | null
          segment_filter: Json | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          topic_tags: string[] | null
          total_recipients: number
          unsubscribed_count: number
          updated_at: string
          web_click_count: number | null
          web_unique_click_count: number | null
          web_upgrades: number | null
          web_url: string | null
          web_view_count: number | null
          workspace_id: string
        }
        Insert: {
          ab_test_config?: Json | null
          audience?: string | null
          beehiiv_created_at?: string | null
          beehiiv_last_synced_at?: string | null
          beehiiv_post_id?: string | null
          beehiiv_status?: string | null
          beehiiv_sync_error?: string | null
          beehiiv_updated_at?: string | null
          body?: string
          bounced_count?: number
          clicked_count?: number
          conversion_to_deal?: number
          conversion_to_lead?: number
          created_at?: string
          email_bounce_rate?: number | null
          email_click_count?: number | null
          email_click_rate?: number | null
          email_click_rate_verified?: number | null
          email_delivered_count?: number | null
          email_delivery_rate?: number | null
          email_hard_bounced?: number | null
          email_open_count?: number | null
          email_open_rate?: number | null
          email_sent_count?: number | null
          email_soft_bounced?: number | null
          email_spam_reported?: number | null
          email_suppressions?: number | null
          email_total_clicks_raw?: number | null
          email_total_clicks_verified?: number | null
          email_unique_click_count?: number | null
          email_unique_clicks_raw?: number | null
          email_unique_clicks_verified?: number | null
          email_unique_open_count?: number | null
          email_unsubscribe_rate?: number | null
          id?: string
          name: string
          opened_count?: number
          preview_url?: string | null
          publish_date?: string | null
          replied_count?: number
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          topic_tags?: string[] | null
          total_recipients?: number
          unsubscribed_count?: number
          updated_at?: string
          web_click_count?: number | null
          web_unique_click_count?: number | null
          web_upgrades?: number | null
          web_url?: string | null
          web_view_count?: number | null
          workspace_id: string
        }
        Update: {
          ab_test_config?: Json | null
          audience?: string | null
          beehiiv_created_at?: string | null
          beehiiv_last_synced_at?: string | null
          beehiiv_post_id?: string | null
          beehiiv_status?: string | null
          beehiiv_sync_error?: string | null
          beehiiv_updated_at?: string | null
          body?: string
          bounced_count?: number
          clicked_count?: number
          conversion_to_deal?: number
          conversion_to_lead?: number
          created_at?: string
          email_bounce_rate?: number | null
          email_click_count?: number | null
          email_click_rate?: number | null
          email_click_rate_verified?: number | null
          email_delivered_count?: number | null
          email_delivery_rate?: number | null
          email_hard_bounced?: number | null
          email_open_count?: number | null
          email_open_rate?: number | null
          email_sent_count?: number | null
          email_soft_bounced?: number | null
          email_spam_reported?: number | null
          email_suppressions?: number | null
          email_total_clicks_raw?: number | null
          email_total_clicks_verified?: number | null
          email_unique_click_count?: number | null
          email_unique_clicks_raw?: number | null
          email_unique_clicks_verified?: number | null
          email_unique_open_count?: number | null
          email_unsubscribe_rate?: number | null
          id?: string
          name?: string
          opened_count?: number
          preview_url?: string | null
          publish_date?: string | null
          replied_count?: number
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          topic_tags?: string[] | null
          total_recipients?: number
          unsubscribed_count?: number
          updated_at?: string
          web_click_count?: number | null
          web_unique_click_count?: number | null
          web_upgrades?: number | null
          web_url?: string | null
          web_view_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_issues_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_segment_stats: {
        Row: {
          click_count: number
          created_at: string
          id: string
          issue_id: string
          open_count: number
          recipient_count: number
          segment_name: string
          unsubscribe_count: number
          workspace_id: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          id?: string
          issue_id: string
          open_count?: number
          recipient_count?: number
          segment_name: string
          unsubscribe_count?: number
          workspace_id: string
        }
        Update: {
          click_count?: number
          created_at?: string
          id?: string
          issue_id?: string
          open_count?: number
          recipient_count?: number
          segment_name?: string
          unsubscribe_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_segment_stats_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_segment_stats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_topic_pipeline: {
        Row: {
          avg_click_rate: number
          avg_open_rate: number
          closed_revenue: number
          deals_generated: number
          id: string
          issues_count: number
          last_calculated_at: string
          leads_generated: number
          pipeline_per_send: number
          pipeline_value: number
          revenue_per_send: number
          topic: string
          total_clicked: number
          total_opened: number
          total_replied: number
          total_sent: number
          workspace_id: string
        }
        Insert: {
          avg_click_rate?: number
          avg_open_rate?: number
          closed_revenue?: number
          deals_generated?: number
          id?: string
          issues_count?: number
          last_calculated_at?: string
          leads_generated?: number
          pipeline_per_send?: number
          pipeline_value?: number
          revenue_per_send?: number
          topic: string
          total_clicked?: number
          total_opened?: number
          total_replied?: number
          total_sent?: number
          workspace_id: string
        }
        Update: {
          avg_click_rate?: number
          avg_open_rate?: number
          closed_revenue?: number
          deals_generated?: number
          id?: string
          issues_count?: number
          last_calculated_at?: string
          leads_generated?: number
          pipeline_per_send?: number
          pipeline_value?: number
          revenue_per_send?: number
          topic?: string
          total_clicked?: number
          total_opened?: number
          total_replied?: number
          total_sent?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_topic_pipeline_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_topic_retention: {
        Row: {
          avg_click_rate: number | null
          avg_open_rate: number | null
          id: string
          last_calculated_at: string
          retention_score: number | null
          topic: string
          total_clicked: number
          total_opened: number
          total_sent: number
          total_unsubscribed: number
          workspace_id: string
        }
        Insert: {
          avg_click_rate?: number | null
          avg_open_rate?: number | null
          id?: string
          last_calculated_at?: string
          retention_score?: number | null
          topic: string
          total_clicked?: number
          total_opened?: number
          total_sent?: number
          total_unsubscribed?: number
          workspace_id: string
        }
        Update: {
          avg_click_rate?: number | null
          avg_open_rate?: number | null
          id?: string
          last_calculated_at?: string
          retention_score?: number | null
          topic?: string
          total_clicked?: number
          total_opened?: number
          total_sent?: number
          total_unsubscribed?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_topic_retention_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_completion_outcomes: {
        Row: {
          acted_at: string
          action_taken: string
          created_at: string
          id: string
          metadata: Json | null
          ops_item_id: string | null
          outcome_quality: string | null
          source_id: string
          source_type: string
          time_to_action_minutes: number | null
          urgency_score_at_action: number | null
          workspace_id: string
        }
        Insert: {
          acted_at?: string
          action_taken: string
          created_at?: string
          id?: string
          metadata?: Json | null
          ops_item_id?: string | null
          outcome_quality?: string | null
          source_id: string
          source_type: string
          time_to_action_minutes?: number | null
          urgency_score_at_action?: number | null
          workspace_id: string
        }
        Update: {
          acted_at?: string
          action_taken?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          ops_item_id?: string | null
          outcome_quality?: string | null
          source_id?: string
          source_type?: string
          time_to_action_minutes?: number | null
          urgency_score_at_action?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_completion_outcomes_ops_item_id_fkey"
            columns: ["ops_item_id"]
            isOneToOne: false
            referencedRelation: "ops_daily_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_completion_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_daily_items: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          metadata: Json | null
          scored_at: string
          snoozed_until: string | null
          source_id: string
          source_type: string
          status: string
          subtitle: string | null
          time_block: string | null
          title: string
          updated_at: string
          urgency_factors: Json | null
          urgency_score: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          scored_at?: string
          snoozed_until?: string | null
          source_id: string
          source_type: string
          status?: string
          subtitle?: string | null
          time_block?: string | null
          title: string
          updated_at?: string
          urgency_factors?: Json | null
          urgency_score?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          scored_at?: string
          snoozed_until?: string | null
          source_id?: string
          source_type?: string
          status?: string
          subtitle?: string | null
          time_block?: string | null
          title?: string
          updated_at?: string
          urgency_factors?: Json | null
          urgency_score?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_daily_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_transactions: {
        Row: {
          approximate_payout_date: string | null
          commission: number | null
          created_at: string
          id: string
          is_paid: boolean | null
          net_amount: number
          payment_method: string | null
          platform: string | null
          product_id: string | null
          product_name: string
          quantity: number
          total_amount: number
          transaction_date: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approximate_payout_date?: string | null
          commission?: number | null
          created_at?: string
          id?: string
          is_paid?: boolean | null
          net_amount?: number
          payment_method?: string | null
          platform?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approximate_payout_date?: string | null
          commission?: number | null
          created_at?: string
          id?: string
          is_paid?: boolean | null
          net_amount?: number
          payment_method?: string | null
          platform?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          commission: number
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          marketplace: string | null
          name: string
          net_amount: number
          price: number
          recurring_price: number | null
          sale_price: number
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          commission?: number
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          marketplace?: string | null
          name: string
          net_amount?: number
          price?: number
          recurring_price?: number | null
          sale_price?: number
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          commission?: number
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          marketplace?: string | null
          name?: string
          net_amount?: number
          price?: number
          recurring_price?: number | null
          sale_price?: number
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_card_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_type: string
          name: string
          price: number
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_card_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_card_terms: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_card_terms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          end_date: string | null
          id: string
          is_tax_deductible: boolean
          name: string
          next_billing_date: string | null
          notes: string | null
          start_date: string
          status: string
          updated_at: string
          url: string | null
          vendor: string | null
          workspace_id: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          is_tax_deductible?: boolean
          name: string
          next_billing_date?: string | null
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          url?: string | null
          vendor?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          is_tax_deductible?: boolean
          name?: string
          next_billing_date?: string | null
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          url?: string | null
          vendor?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reengagement_ab_tests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          sequence_id: string | null
          status: string
          variant_a_opened: number
          variant_a_sent: number
          variant_a_subject: string
          variant_b_opened: number
          variant_b_sent: number
          variant_b_subject: string
          winner: string | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          sequence_id?: string | null
          status?: string
          variant_a_opened?: number
          variant_a_sent?: number
          variant_a_subject: string
          variant_b_opened?: number
          variant_b_sent?: number
          variant_b_subject: string
          winner?: string | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          sequence_id?: string | null
          status?: string
          variant_a_opened?: number
          variant_a_sent?: number
          variant_a_subject?: string
          variant_b_opened?: number
          variant_b_sent?: number
          variant_b_subject?: string
          winner?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reengagement_ab_tests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          description: string | null
          external_created_at: string | null
          external_id: string
          id: string
          interval: string | null
          metadata: Json | null
          price_id: string | null
          product_name: string | null
          source: string
          status: string
          subscription_id: string | null
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          external_created_at?: string | null
          external_id: string
          id?: string
          interval?: string | null
          metadata?: Json | null
          price_id?: string | null
          product_name?: string | null
          source?: string
          status?: string
          subscription_id?: string | null
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          description?: string | null
          external_created_at?: string | null
          external_id?: string
          id?: string
          interval?: string | null
          metadata?: Json | null
          price_id?: string | null
          product_name?: string | null
          source?: string
          status?: string
          subscription_id?: string | null
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_drafts: {
        Row: {
          body_html: string
          created_at: string
          created_by: string
          email_id: string | null
          id: string
          shared_with: string[] | null
          status: string
          subject: string
          to_email: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          created_by: string
          email_id?: string | null
          id?: string
          shared_with?: string[] | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string
          email_id?: string | null
          id?: string
          shared_with?: string[] | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_drafts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_opportunity_board: {
        Row: {
          avg_deal_value: number
          company_id: string | null
          company_name: string
          content_categories: string[]
          created_at: string
          historical_win_rate: number
          id: string
          match_score: number
          month: string
          notes: string | null
          outreach_status: string
          package_rationale: string | null
          past_deal_count: number
          sponsor_vertical: string
          suggested_outreach_week: number
          suggested_package: string
          total_past_revenue: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avg_deal_value?: number
          company_id?: string | null
          company_name: string
          content_categories?: string[]
          created_at?: string
          historical_win_rate?: number
          id?: string
          match_score?: number
          month: string
          notes?: string | null
          outreach_status?: string
          package_rationale?: string | null
          past_deal_count?: number
          sponsor_vertical?: string
          suggested_outreach_week?: number
          suggested_package?: string
          total_past_revenue?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avg_deal_value?: number
          company_id?: string | null
          company_name?: string
          content_categories?: string[]
          created_at?: string
          historical_win_rate?: number
          id?: string
          match_score?: number
          month?: string
          notes?: string | null
          outreach_status?: string
          package_rationale?: string | null
          past_deal_count?: number
          sponsor_vertical?: string
          suggested_outreach_week?: number
          suggested_package?: string
          total_past_revenue?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_opportunity_board_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_opportunity_board_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_package_experiments: {
        Row: {
          accepted_package: string | null
          accepted_value: number | null
          avg_ctr: number
          avg_view_duration: number
          channel_subscribers: number
          channel_video_count: number
          channel_views: number
          company_id: string | null
          company_name: string
          created_at: string
          historical_avg_deal: number
          historical_win_rate: number
          id: string
          match_score: number
          opportunity_id: string | null
          outcome: string
          outcome_notes: string | null
          package_rationale: string | null
          past_deal_count: number
          recommended_package: string
          recommended_value: number
          rejection_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          sponsor_vertical: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_package?: string | null
          accepted_value?: number | null
          avg_ctr?: number
          avg_view_duration?: number
          channel_subscribers?: number
          channel_video_count?: number
          channel_views?: number
          company_id?: string | null
          company_name: string
          created_at?: string
          historical_avg_deal?: number
          historical_win_rate?: number
          id?: string
          match_score?: number
          opportunity_id?: string | null
          outcome?: string
          outcome_notes?: string | null
          package_rationale?: string | null
          past_deal_count?: number
          recommended_package: string
          recommended_value?: number
          rejection_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sponsor_vertical?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_package?: string | null
          accepted_value?: number | null
          avg_ctr?: number
          avg_view_duration?: number
          channel_subscribers?: number
          channel_video_count?: number
          channel_views?: number
          company_id?: string | null
          company_name?: string
          created_at?: string
          historical_avg_deal?: number
          historical_win_rate?: number
          id?: string
          match_score?: number
          opportunity_id?: string | null
          outcome?: string
          outcome_notes?: string | null
          package_rationale?: string | null
          past_deal_count?: number
          recommended_package?: string
          recommended_value?: number
          rejection_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sponsor_vertical?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_package_experiments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_package_experiments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      strategist_daily_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string | null
          id: string
          proposal_ids: string[]
          recommendations_count: number
          run_date: string
          started_at: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          proposal_ids?: string[]
          recommendations_count?: number
          run_date?: string
          started_at?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          proposal_ids?: string[]
          recommendations_count?: number
          run_date?: string
          started_at?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategist_daily_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      strategist_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          run_id: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          run_id?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          run_id?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategist_notifications_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "strategist_daily_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategist_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_sync_log: {
        Row: {
          charges_synced: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          started_at: string
          status: string
          subscriptions_synced: number | null
          workspace_id: string
        }
        Insert: {
          charges_synced?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          subscriptions_synced?: number | null
          workspace_id: string
        }
        Update: {
          charges_synced?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          subscriptions_synced?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_sync_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_churn_risk: {
        Row: {
          created_at: string
          days_since_last_click: number | null
          days_since_last_open: number | null
          declining_clicks: boolean | null
          declining_opens: boolean | null
          id: string
          journey_completed_at: string | null
          journey_started_at: string | null
          journey_tier: string
          last_calculated_at: string
          post_journey_open_rate: number | null
          pre_journey_open_rate: number | null
          recent_click_rate: number | null
          recent_open_rate: number | null
          reengagement_sequence_id: string | null
          reengagement_status: string | null
          risk_level: string
          risk_score: number
          saved: boolean
          saved_at: string | null
          subscriber_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          days_since_last_click?: number | null
          days_since_last_open?: number | null
          declining_clicks?: boolean | null
          declining_opens?: boolean | null
          id?: string
          journey_completed_at?: string | null
          journey_started_at?: string | null
          journey_tier?: string
          last_calculated_at?: string
          post_journey_open_rate?: number | null
          pre_journey_open_rate?: number | null
          recent_click_rate?: number | null
          recent_open_rate?: number | null
          reengagement_sequence_id?: string | null
          reengagement_status?: string | null
          risk_level?: string
          risk_score?: number
          saved?: boolean
          saved_at?: string | null
          subscriber_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          days_since_last_click?: number | null
          days_since_last_open?: number | null
          declining_clicks?: boolean | null
          declining_opens?: boolean | null
          id?: string
          journey_completed_at?: string | null
          journey_started_at?: string | null
          journey_tier?: string
          last_calculated_at?: string
          post_journey_open_rate?: number | null
          pre_journey_open_rate?: number | null
          recent_click_rate?: number | null
          recent_open_rate?: number | null
          reengagement_sequence_id?: string | null
          reengagement_status?: string | null
          risk_level?: string
          risk_score?: number
          saved?: boolean
          saved_at?: string | null
          subscriber_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_churn_risk_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_guide_assignments: {
        Row: {
          created_at: string
          downloaded_at: string | null
          guide_id: string
          id: string
          subscriber_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          downloaded_at?: string | null
          guide_id: string
          id?: string
          subscriber_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          downloaded_at?: string | null
          guide_id?: string
          id?: string
          subscriber_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_guide_assignments_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "subscriber_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_guide_assignments_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_guide_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_guides: {
        Row: {
          company_id: string | null
          created_at: string
          delivery_type: string
          description: string | null
          download_count: number
          email_body: string | null
          email_subject: string | null
          file_url: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
          video_queue_id: number | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          delivery_type?: string
          description?: string | null
          download_count?: number
          email_body?: string | null
          email_subject?: string | null
          file_url?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
          video_queue_id?: number | null
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          delivery_type?: string
          description?: string | null
          download_count?: number
          email_body?: string | null
          email_subject?: string | null
          file_url?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          video_queue_id?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_guides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_guides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_granted_at: string | null
          reward_type: string | null
          reward_value: number | null
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_granted_at?: string | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_granted_at?: string | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_referrals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_unsubscribe_reasons: {
        Row: {
          created_at: string
          id: string
          issue_id: string | null
          reason_category: string
          reason_text: string | null
          subscriber_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id?: string | null
          reason_category?: string
          reason_text?: string | null
          subscriber_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string | null
          reason_category?: string
          reason_text?: string | null
          subscriber_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_unsubscribe_reasons_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_unsubscribe_reasons_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          avatar_url: string | null
          beehiiv_id: string | null
          beehiiv_status: string | null
          beehiiv_tier: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          deleted_at: string | null
          email: string
          engagement_data: Json | null
          engagement_score: number | null
          first_name: string | null
          guide_delivered_at: string | null
          guide_requested: string | null
          id: string
          last_name: string | null
          notes: string | null
          opt_in_confirmed: boolean | null
          opt_in_confirmed_at: string | null
          page_url: string | null
          promoted_to_contact_id: string | null
          referrer: string | null
          source: string | null
          source_video_id: string | null
          source_video_title: string | null
          state: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          beehiiv_id?: string | null
          beehiiv_status?: string | null
          beehiiv_tier?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          email: string
          engagement_data?: Json | null
          engagement_score?: number | null
          first_name?: string | null
          guide_delivered_at?: string | null
          guide_requested?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          opt_in_confirmed?: boolean | null
          opt_in_confirmed_at?: string | null
          page_url?: string | null
          promoted_to_contact_id?: string | null
          referrer?: string | null
          source?: string | null
          source_video_id?: string | null
          source_video_title?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          beehiiv_id?: string | null
          beehiiv_status?: string | null
          beehiiv_tier?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          email?: string
          engagement_data?: Json | null
          engagement_score?: number | null
          first_name?: string | null
          guide_delivered_at?: string | null
          guide_requested?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          opt_in_confirmed?: boolean | null
          opt_in_confirmed_at?: string | null
          page_url?: string | null
          promoted_to_contact_id?: string | null
          referrer?: string | null
          source?: string | null
          source_video_id?: string | null
          source_video_title?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          mentioned_user_id: string
          read: boolean
          task_id: string
          workspace_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          read?: boolean
          task_id: string
          workspace_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          read?: boolean
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comment_mentions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comment_mentions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_domains: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_domains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          created_at: string
          id: string
          label_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_projects: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          domain_id: string | null
          end_date: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          start_date: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_projects_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "task_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_domain_id: string | null
          default_estimated_minutes: number | null
          default_labels: string[] | null
          default_priority: string | null
          default_project_id: string | null
          default_status: string
          description: string | null
          id: string
          name: string
          subtask_templates: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_domain_id?: string | null
          default_estimated_minutes?: number | null
          default_labels?: string[] | null
          default_priority?: string | null
          default_project_id?: string | null
          default_status?: string
          description?: string | null
          id?: string
          name: string
          subtask_templates?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_domain_id?: string | null
          default_estimated_minutes?: number | null
          default_labels?: string[] | null
          default_priority?: string | null
          default_project_id?: string | null
          default_status?: string
          description?: string | null
          id?: string
          name?: string
          subtask_templates?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_default_domain_id_fkey"
            columns: ["default_domain_id"]
            isOneToOne: false
            referencedRelation: "task_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "task_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          domain_id: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          estimated_minutes: number | null
          id: string
          is_inbox: boolean | null
          metadata: Json | null
          parent_task_id: string | null
          priority: string
          project_id: string | null
          recurrence_rule: string | null
          sort_order: number | null
          source: string | null
          source_proposal_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          estimated_minutes?: number | null
          id?: string
          is_inbox?: boolean | null
          metadata?: Json | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence_rule?: string | null
          sort_order?: number | null
          source?: string | null
          source_proposal_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          estimated_minutes?: number | null
          id?: string
          is_inbox?: boolean | null
          metadata?: Json | null
          parent_task_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence_rule?: string | null
          sort_order?: number | null
          source?: string | null
          source_proposal_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "task_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      thumbnail_ab_tests: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
          variant_a_ctr: number | null
          variant_a_impressions: number | null
          variant_a_url: string
          variant_b_ctr: number | null
          variant_b_impressions: number | null
          variant_b_url: string
          video_title: string
          winner: string | null
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          variant_a_ctr?: number | null
          variant_a_impressions?: number | null
          variant_a_url?: string
          variant_b_ctr?: number | null
          variant_b_impressions?: number | null
          variant_b_url?: string
          video_title?: string
          winner?: string | null
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          variant_a_ctr?: number | null
          variant_a_impressions?: number | null
          variant_a_url?: string
          variant_b_ctr?: number | null
          variant_b_impressions?: number | null
          variant_b_url?: string
          video_title?: string
          winner?: string | null
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_ab_tests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      thumbnail_assessments: {
        Row: {
          assessment_json: Json | null
          competitor_thumbnails: Json | null
          created_at: string
          created_by: string | null
          current_thumbnail_url: string | null
          generated_thumbnails: Json | null
          id: string
          selected_variant: string | null
          status: string
          updated_at: string
          video_title: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          assessment_json?: Json | null
          competitor_thumbnails?: Json | null
          created_at?: string
          created_by?: string | null
          current_thumbnail_url?: string | null
          generated_thumbnails?: Json | null
          id?: string
          selected_variant?: string | null
          status?: string
          updated_at?: string
          video_title?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          assessment_json?: Json | null
          competitor_thumbnails?: Json | null
          created_at?: string
          created_by?: string | null
          current_thumbnail_url?: string | null
          generated_thumbnails?: Json | null
          id?: string
          selected_variant?: string | null
          status?: string
          updated_at?: string
          video_title?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_assessments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      thumbnail_references: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          notes: string | null
          source_channel: string | null
          source_video_url: string | null
          storage_path: string
          tags: string[] | null
          url: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          source_channel?: string | null
          source_video_url?: string | null
          storage_path: string
          tags?: string[] | null
          url: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          source_channel?: string | null
          source_video_url?: string | null
          storage_path?: string
          tags?: string[] | null
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_references_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_companies: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_experiments: {
        Row: {
          created_at: string
          created_by: string
          ctr_after: number | null
          ctr_before: number | null
          ended_at: string | null
          experiment_type: string
          id: string
          notes: string | null
          started_at: string | null
          updated_at: string
          variant_a: string
          variant_b: string
          winner: string | null
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ctr_after?: number | null
          ctr_before?: number | null
          ended_at?: string | null
          experiment_type?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          updated_at?: string
          variant_a?: string
          variant_b?: string
          winner?: string | null
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ctr_after?: number | null
          ctr_before?: number | null
          ended_at?: string | null
          experiment_type?: string
          id?: string
          notes?: string | null
          started_at?: string | null
          updated_at?: string
          variant_a?: string
          variant_b?: string
          winner?: string | null
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_experiments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_hourly_stats: {
        Row: {
          comments: number | null
          ctr_percent: number | null
          fetched_at: string
          hour_number: number
          id: string
          impressions: number | null
          likes: number | null
          views: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          comments?: number | null
          ctr_percent?: number | null
          fetched_at?: string
          hour_number: number
          id?: string
          impressions?: number | null
          likes?: number | null
          views?: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          comments?: number | null
          ctr_percent?: number | null
          fetched_at?: string
          hour_number?: number
          id?: string
          impressions?: number | null
          likes?: number | null
          views?: number | null
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_hourly_stats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_note_entries: {
        Row: {
          body_md: string
          created_at: string
          created_by: string
          id: string
          timestamp_seconds: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          body_md?: string
          created_at?: string
          created_by: string
          id?: string
          timestamp_seconds?: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          body_md?: string
          created_at?: string
          created_by?: string
          id?: string
          timestamp_seconds?: number | null
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_note_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_notes: {
        Row: {
          content_md: string
          created_at: string
          created_by: string
          id: string
          post_mortem_json: Json
          title: string
          updated_at: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          created_by: string
          id?: string
          post_mortem_json?: Json
          title?: string
          updated_at?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string
          id?: string
          post_mortem_json?: Json
          title?: string
          updated_at?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_optimization_experiments: {
        Row: {
          baseline_avg_view_duration: number
          baseline_ctr: number
          baseline_impressions: number
          baseline_views: number
          baseline_watch_time_hours: number
          completed_at: string | null
          created_at: string
          experiment_type: string
          id: string
          lesson_learned: string | null
          measured_at: string | null
          measurement_period_days: number
          new_description: string | null
          new_tags: string[] | null
          new_thumbnail_url: string | null
          new_title: string | null
          original_description: string | null
          original_tags: string[] | null
          original_thumbnail_url: string | null
          original_title: string | null
          performance_delta: Json | null
          proposal_id: string | null
          result_avg_view_duration: number | null
          result_ctr: number | null
          result_impressions: number | null
          result_views: number | null
          result_watch_time_hours: number | null
          rollback_reason: string | null
          rolled_back_at: string | null
          started_at: string
          status: string
          updated_at: string
          video_id: string
          video_title: string
          workspace_id: string
        }
        Insert: {
          baseline_avg_view_duration?: number
          baseline_ctr?: number
          baseline_impressions?: number
          baseline_views?: number
          baseline_watch_time_hours?: number
          completed_at?: string | null
          created_at?: string
          experiment_type?: string
          id?: string
          lesson_learned?: string | null
          measured_at?: string | null
          measurement_period_days?: number
          new_description?: string | null
          new_tags?: string[] | null
          new_thumbnail_url?: string | null
          new_title?: string | null
          original_description?: string | null
          original_tags?: string[] | null
          original_thumbnail_url?: string | null
          original_title?: string | null
          performance_delta?: Json | null
          proposal_id?: string | null
          result_avg_view_duration?: number | null
          result_ctr?: number | null
          result_impressions?: number | null
          result_views?: number | null
          result_watch_time_hours?: number | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          video_id: string
          video_title?: string
          workspace_id: string
        }
        Update: {
          baseline_avg_view_duration?: number
          baseline_ctr?: number
          baseline_impressions?: number
          baseline_views?: number
          baseline_watch_time_hours?: number
          completed_at?: string | null
          created_at?: string
          experiment_type?: string
          id?: string
          lesson_learned?: string | null
          measured_at?: string | null
          measurement_period_days?: number
          new_description?: string | null
          new_tags?: string[] | null
          new_thumbnail_url?: string | null
          new_title?: string | null
          original_description?: string | null
          original_tags?: string[] | null
          original_thumbnail_url?: string | null
          original_title?: string | null
          performance_delta?: Json | null
          proposal_id?: string | null
          result_avg_view_duration?: number | null
          result_ctr?: number | null
          result_impressions?: number | null
          result_views?: number | null
          result_watch_time_hours?: number | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          video_id?: string
          video_title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_optimization_experiments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_performance_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metric_name: string | null
          metric_value: number | null
          threshold_value: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metric_name?: string | null
          metric_value?: number | null
          threshold_value?: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metric_name?: string | null
          metric_value?: number | null
          threshold_value?: number | null
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_performance_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_queue: {
        Row: {
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          notes: string | null
          priority: string
          published_url: string | null
          scheduled_date: string | null
          script_content: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          workspace_id: string
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string
          published_url?: string | null
          scheduled_date?: string | null
          script_content?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          workspace_id: string
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string
          published_url?: string | null
          scheduled_date?: string | null
          script_content?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_queue_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_repurposes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          published_at: string | null
          repurpose_type: string
          status: string
          updated_at: string
          url: string | null
          views: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          published_at?: string | null
          repurpose_type?: string
          status?: string
          updated_at?: string
          url?: string | null
          views?: number | null
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          published_at?: string | null
          repurpose_type?: string
          status?: string
          updated_at?: string
          url?: string | null
          views?: number | null
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_repurposes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_revenue_attribution: {
        Row: {
          ad_revenue: number | null
          affiliate_revenue: number | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          sponsor_revenue: number | null
          total_revenue: number | null
          video_title: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          ad_revenue?: number | null
          affiliate_revenue?: number | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          sponsor_revenue?: number | null
          total_revenue?: number | null
          video_title?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          ad_revenue?: number | null
          affiliate_revenue?: number | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          sponsor_revenue?: number | null
          total_revenue?: number | null
          video_title?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_revenue_attribution_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_series: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_series_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_series_items: {
        Row: {
          created_at: string
          id: string
          series_id: string
          sort_order: number
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          series_id: string
          sort_order?: number
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          series_id?: string
          sort_order?: number
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_series_items_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "video_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_series_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sponsor_segments: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          end_seconds: number
          estimated_viewers: number | null
          id: string
          retention_at_segment: number | null
          segment_type: string
          start_seconds: number
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_seconds?: number
          estimated_viewers?: number | null
          id?: string
          retention_at_segment?: number | null
          segment_type?: string
          start_seconds?: number
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_seconds?: number
          estimated_viewers?: number | null
          id?: string
          retention_at_segment?: number | null
          segment_type?: string
          start_seconds?: number
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_sponsor_segments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_sponsor_segments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_sponsor_segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      video_subtitles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language: string
          parsed_segments: Json | null
          srt_content: string
          updated_at: string
          video_title: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          parsed_segments?: Json | null
          srt_content?: string
          updated_at?: string
          video_title?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          parsed_segments?: Json | null
          srt_content?: string
          updated_at?: string
          video_title?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_subtitles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_conversion_assets: {
        Row: {
          asset_type: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          published_at: string | null
          run_id: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          asset_type: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          published_at?: string | null
          run_id: string
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          asset_type?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          published_at?: string | null
          run_id?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viral_conversion_assets_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "viral_playbook_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_conversion_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_playbook_checklist: {
        Row: {
          auto_generated: boolean
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          run_id: string
          step_order: number
          title: string
          workspace_id: string
        }
        Insert: {
          auto_generated?: boolean
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          run_id: string
          step_order?: number
          title: string
          workspace_id: string
        }
        Update: {
          auto_generated?: boolean
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          run_id?: string
          step_order?: number
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viral_playbook_checklist_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "viral_playbook_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_playbook_checklist_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_playbook_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          deals_generated: number
          id: string
          leads_generated: number
          revenue_attributed: number
          started_at: string
          status: string
          subs_at_trigger: number
          subs_gained: number
          trigger_reason: string
          updated_at: string
          video_title: string
          views_at_trigger: number
          views_current: number
          viral_score: number
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deals_generated?: number
          id?: string
          leads_generated?: number
          revenue_attributed?: number
          started_at?: string
          status?: string
          subs_at_trigger?: number
          subs_gained?: number
          trigger_reason?: string
          updated_at?: string
          video_title?: string
          views_at_trigger?: number
          views_current?: number
          viral_score?: number
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deals_generated?: number
          id?: string
          leads_generated?: number
          revenue_attributed?: number
          started_at?: string
          status?: string
          subs_at_trigger?: number
          subs_gained?: number
          trigger_reason?: string
          updated_at?: string
          video_title?: string
          views_at_trigger?: number
          views_current?: number
          viral_score?: number
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viral_playbook_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_sync_queue: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json | null
          processed_at: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id: string
          event_type: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          processed_at?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          processed_at?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_sync_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_identity: {
        Row: {
          content: string
          document_type: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content?: string
          document_type: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string
          document_type?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_identity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_integrations: {
        Row: {
          config: Json | null
          connected_at: string | null
          created_at: string
          enabled: boolean
          id: string
          integration_key: string
          last_sync_at: string | null
          last_sync_error: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          integration_key: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          integration_key?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      youtube_channel_analytics: {
        Row: {
          ad_impressions: number
          average_view_duration_seconds: number
          average_view_percentage: number
          card_clicks: number
          card_ctr: number
          card_impressions: number
          comments: number
          cpm: number
          date: string
          dislikes: number
          end_screen_element_clicks: number
          end_screen_element_ctr: number
          end_screen_element_impressions: number
          estimated_ad_revenue: number
          estimated_minutes_watched: number
          estimated_red_partner_revenue: number
          estimated_revenue: number
          fetched_at: string
          gross_revenue: number
          id: string
          impressions: number
          impressions_ctr: number
          likes: number
          monetized_playbacks: number
          net_subscribers: number
          playback_based_cpm: number
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          unique_viewers: number
          views: number
          workspace_id: string
        }
        Insert: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id: string
        }
        Update: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date?: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_channel_analytics_workspace_id_fkey1"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_channel_stats: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          subscriber_count: number
          total_view_count: number
          video_count: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          subscriber_count?: number
          total_view_count?: number
          video_count?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          subscriber_count?: number
          total_view_count?: number
          video_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_channel_stats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_comments: {
        Row: {
          author_avatar: string | null
          author_avatar_url: string | null
          author_channel_id: string | null
          author_channel_url: string | null
          author_name: string | null
          author_profile_url: string | null
          comment_id: string | null
          created_at: string
          id: string
          is_hearted: boolean | null
          is_pinned: boolean | null
          is_replied: boolean | null
          like_count: number | null
          our_reply: string | null
          priority: string | null
          published_at: string | null
          reply_count: number | null
          sentiment: string | null
          status: string | null
          suggested_reply: string | null
          synced_at: string | null
          text: string | null
          text_display: string | null
          updated_at: string
          video_id: string | null
          video_title: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id?: string
          youtube_comment_id?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_comments_workspace_id_fkey1"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_demographics: {
        Row: {
          age_group: string
          date: string
          fetched_at: string
          gender: string
          id: string
          viewer_percentage: number
          workspace_id: string
        }
        Insert: {
          age_group: string
          date: string
          fetched_at?: string
          gender: string
          id?: string
          viewer_percentage?: number
          workspace_id: string
        }
        Update: {
          age_group?: string
          date?: string
          fetched_at?: string
          gender?: string
          id?: string
          viewer_percentage?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_demographics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_device_types: {
        Row: {
          date: string
          device_type: string
          estimated_minutes_watched: number
          fetched_at: string
          id: string
          views: number
          workspace_id: string
        }
        Insert: {
          date: string
          device_type: string
          estimated_minutes_watched?: number
          fetched_at?: string
          id?: string
          views?: number
          workspace_id: string
        }
        Update: {
          date?: string
          device_type?: string
          estimated_minutes_watched?: number
          fetched_at?: string
          id?: string
          views?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_device_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_geography: {
        Row: {
          average_view_duration_seconds: number
          country: string
          date: string
          estimated_minutes_watched: number
          fetched_at: string
          id: string
          subscribers_gained: number
          views: number
          workspace_id: string
        }
        Insert: {
          average_view_duration_seconds?: number
          country: string
          date: string
          estimated_minutes_watched?: number
          fetched_at?: string
          id?: string
          subscribers_gained?: number
          views?: number
          workspace_id: string
        }
        Update: {
          average_view_duration_seconds?: number
          country?: string
          date?: string
          estimated_minutes_watched?: number
          fetched_at?: string
          id?: string
          subscribers_gained?: number
          views?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_geography_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_sync_logs_workspace_id_fkey1"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_sync_status: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_synced_at: string | null
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      youtube_traffic_sources: {
        Row: {
          date: string
          estimated_minutes_watched: number
          fetched_at: string
          id: string
          source_type: string
          views: number
          workspace_id: string
        }
        Insert: {
          date: string
          estimated_minutes_watched?: number
          fetched_at?: string
          id?: string
          source_type: string
          views?: number
          workspace_id: string
        }
        Update: {
          date?: string
          estimated_minutes_watched?: number
          fetched_at?: string
          id?: string
          source_type?: string
          views?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_traffic_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_video_analytics: {
        Row: {
          annotation_click_through_rate: number
          average_view_duration_seconds: number
          average_view_percentage: number
          card_clicks: number
          card_impressions: number
          comments: number
          date: string
          dislikes: number
          end_screen_element_clicks: number
          end_screen_element_impressions: number
          estimated_minutes_watched: number
          estimated_revenue: number
          fetched_at: string
          id: string
          impressions: number
          impressions_ctr: number
          likes: number
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          title: string
          views: number
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          annotation_click_through_rate?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_impressions?: number
          comments?: number
          date: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_impressions?: number
          estimated_minutes_watched?: number
          estimated_revenue?: number
          fetched_at?: string
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          title?: string
          views?: number
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          annotation_click_through_rate?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_impressions?: number
          comments?: number
          date?: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_impressions?: number
          estimated_minutes_watched?: number
          estimated_revenue?: number
          fetched_at?: string
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          title?: string
          views?: number
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_video_analytics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_video_retention: {
        Row: {
          audience_retention: number
          elapsed_ratio: number
          fetched_at: string
          id: string
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          audience_retention?: number
          elapsed_ratio: number
          fetched_at?: string
          id?: string
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          audience_retention?: number
          elapsed_ratio?: number
          fetched_at?: string
          id?: string
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_video_retention_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_video_stats: {
        Row: {
          avg_view_duration_seconds: number | null
          comments: number
          ctr_percent: number
          description: string | null
          fetched_at: string
          id: string
          likes: number
          published_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          views: number
          watch_time_minutes: number
          workspace_id: string
          youtube_video_id: string
        }
        Insert: {
          avg_view_duration_seconds?: number | null
          comments?: number
          ctr_percent?: number
          description?: string | null
          fetched_at?: string
          id?: string
          likes?: number
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          views?: number
          watch_time_minutes?: number
          workspace_id: string
          youtube_video_id: string
        }
        Update: {
          avg_view_duration_seconds?: number | null
          comments?: number
          ctr_percent?: number
          description?: string | null
          fetched_at?: string
          id?: string
          likes?: number
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          views?: number
          watch_time_minutes?: number
          workspace_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_video_stats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      yt_chan_analytics_2026: {
        Row: {
          ad_impressions: number
          average_view_duration_seconds: number
          average_view_percentage: number
          card_clicks: number
          card_ctr: number
          card_impressions: number
          comments: number
          cpm: number
          date: string
          dislikes: number
          end_screen_element_clicks: number
          end_screen_element_ctr: number
          end_screen_element_impressions: number
          estimated_ad_revenue: number
          estimated_minutes_watched: number
          estimated_red_partner_revenue: number
          estimated_revenue: number
          fetched_at: string
          gross_revenue: number
          id: string
          impressions: number
          impressions_ctr: number
          likes: number
          monetized_playbacks: number
          net_subscribers: number
          playback_based_cpm: number
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          unique_viewers: number
          views: number
          workspace_id: string
        }
        Insert: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id: string
        }
        Update: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date?: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id?: string
        }
        Relationships: []
      }
      yt_chan_analytics_2027: {
        Row: {
          ad_impressions: number
          average_view_duration_seconds: number
          average_view_percentage: number
          card_clicks: number
          card_ctr: number
          card_impressions: number
          comments: number
          cpm: number
          date: string
          dislikes: number
          end_screen_element_clicks: number
          end_screen_element_ctr: number
          end_screen_element_impressions: number
          estimated_ad_revenue: number
          estimated_minutes_watched: number
          estimated_red_partner_revenue: number
          estimated_revenue: number
          fetched_at: string
          gross_revenue: number
          id: string
          impressions: number
          impressions_ctr: number
          likes: number
          monetized_playbacks: number
          net_subscribers: number
          playback_based_cpm: number
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          unique_viewers: number
          views: number
          workspace_id: string
        }
        Insert: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id: string
        }
        Update: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date?: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id?: string
        }
        Relationships: []
      }
      yt_chan_analytics_archive: {
        Row: {
          ad_impressions: number
          average_view_duration_seconds: number
          average_view_percentage: number
          card_clicks: number
          card_ctr: number
          card_impressions: number
          comments: number
          cpm: number
          date: string
          dislikes: number
          end_screen_element_clicks: number
          end_screen_element_ctr: number
          end_screen_element_impressions: number
          estimated_ad_revenue: number
          estimated_minutes_watched: number
          estimated_red_partner_revenue: number
          estimated_revenue: number
          fetched_at: string
          gross_revenue: number
          id: string
          impressions: number
          impressions_ctr: number
          likes: number
          monetized_playbacks: number
          net_subscribers: number
          playback_based_cpm: number
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          unique_viewers: number
          views: number
          workspace_id: string
        }
        Insert: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id: string
        }
        Update: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date?: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id?: string
        }
        Relationships: []
      }
      yt_chan_analytics_default: {
        Row: {
          ad_impressions: number
          average_view_duration_seconds: number
          average_view_percentage: number
          card_clicks: number
          card_ctr: number
          card_impressions: number
          comments: number
          cpm: number
          date: string
          dislikes: number
          end_screen_element_clicks: number
          end_screen_element_ctr: number
          end_screen_element_impressions: number
          estimated_ad_revenue: number
          estimated_minutes_watched: number
          estimated_red_partner_revenue: number
          estimated_revenue: number
          fetched_at: string
          gross_revenue: number
          id: string
          impressions: number
          impressions_ctr: number
          likes: number
          monetized_playbacks: number
          net_subscribers: number
          playback_based_cpm: number
          shares: number
          subscribers_gained: number
          subscribers_lost: number
          unique_viewers: number
          views: number
          workspace_id: string
        }
        Insert: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id: string
        }
        Update: {
          ad_impressions?: number
          average_view_duration_seconds?: number
          average_view_percentage?: number
          card_clicks?: number
          card_ctr?: number
          card_impressions?: number
          comments?: number
          cpm?: number
          date?: string
          dislikes?: number
          end_screen_element_clicks?: number
          end_screen_element_ctr?: number
          end_screen_element_impressions?: number
          estimated_ad_revenue?: number
          estimated_minutes_watched?: number
          estimated_red_partner_revenue?: number
          estimated_revenue?: number
          fetched_at?: string
          gross_revenue?: number
          id?: string
          impressions?: number
          impressions_ctr?: number
          likes?: number
          monetized_playbacks?: number
          net_subscribers?: number
          playback_based_cpm?: number
          shares?: number
          subscribers_gained?: number
          subscribers_lost?: number
          unique_viewers?: number
          views?: number
          workspace_id?: string
        }
        Relationships: []
      }
      yt_comments_2026: {
        Row: {
          author_avatar: string | null
          author_avatar_url: string | null
          author_channel_id: string | null
          author_channel_url: string | null
          author_name: string | null
          author_profile_url: string | null
          comment_id: string | null
          created_at: string
          id: string
          is_hearted: boolean | null
          is_pinned: boolean | null
          is_replied: boolean | null
          like_count: number | null
          our_reply: string | null
          priority: string | null
          published_at: string | null
          reply_count: number | null
          sentiment: string | null
          status: string | null
          suggested_reply: string | null
          synced_at: string | null
          text: string | null
          text_display: string | null
          updated_at: string
          video_id: string | null
          video_title: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id?: string
          youtube_comment_id?: string
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      yt_comments_2027: {
        Row: {
          author_avatar: string | null
          author_avatar_url: string | null
          author_channel_id: string | null
          author_channel_url: string | null
          author_name: string | null
          author_profile_url: string | null
          comment_id: string | null
          created_at: string
          id: string
          is_hearted: boolean | null
          is_pinned: boolean | null
          is_replied: boolean | null
          like_count: number | null
          our_reply: string | null
          priority: string | null
          published_at: string | null
          reply_count: number | null
          sentiment: string | null
          status: string | null
          suggested_reply: string | null
          synced_at: string | null
          text: string | null
          text_display: string | null
          updated_at: string
          video_id: string | null
          video_title: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id?: string
          youtube_comment_id?: string
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      yt_comments_archive: {
        Row: {
          author_avatar: string | null
          author_avatar_url: string | null
          author_channel_id: string | null
          author_channel_url: string | null
          author_name: string | null
          author_profile_url: string | null
          comment_id: string | null
          created_at: string
          id: string
          is_hearted: boolean | null
          is_pinned: boolean | null
          is_replied: boolean | null
          like_count: number | null
          our_reply: string | null
          priority: string | null
          published_at: string | null
          reply_count: number | null
          sentiment: string | null
          status: string | null
          suggested_reply: string | null
          synced_at: string | null
          text: string | null
          text_display: string | null
          updated_at: string
          video_id: string | null
          video_title: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id?: string
          youtube_comment_id?: string
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      yt_comments_default: {
        Row: {
          author_avatar: string | null
          author_avatar_url: string | null
          author_channel_id: string | null
          author_channel_url: string | null
          author_name: string | null
          author_profile_url: string | null
          comment_id: string | null
          created_at: string
          id: string
          is_hearted: boolean | null
          is_pinned: boolean | null
          is_replied: boolean | null
          like_count: number | null
          our_reply: string | null
          priority: string | null
          published_at: string | null
          reply_count: number | null
          sentiment: string | null
          status: string | null
          suggested_reply: string | null
          synced_at: string | null
          text: string | null
          text_display: string | null
          updated_at: string
          video_id: string | null
          video_title: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id: string
          youtube_comment_id: string
          youtube_video_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_avatar_url?: string | null
          author_channel_id?: string | null
          author_channel_url?: string | null
          author_name?: string | null
          author_profile_url?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          is_hearted?: boolean | null
          is_pinned?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          our_reply?: string | null
          priority?: string | null
          published_at?: string | null
          reply_count?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          synced_at?: string | null
          text?: string | null
          text_display?: string | null
          updated_at?: string
          video_id?: string | null
          video_title?: string | null
          workspace_id?: string
          youtube_comment_id?: string
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      yt_sync_logs_2026: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          workspace_id?: string
        }
        Relationships: []
      }
      yt_sync_logs_2027: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          workspace_id?: string
        }
        Relationships: []
      }
      yt_sync_logs_archive: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          workspace_id?: string
        }
        Relationships: []
      }
      yt_sync_logs_default: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_channel_analytics_weekly: {
        Args: { p_days?: number; p_workspace_id: string }
        Returns: {
          avg_cpm: number
          avg_impressions_ctr: number
          avg_playback_based_cpm: number
          avg_view_duration: number
          avg_view_percentage: number
          day_count: number
          total_ad_impressions: number
          total_card_clicks: number
          total_card_impressions: number
          total_comments: number
          total_estimated_ad_revenue: number
          total_estimated_minutes_watched: number
          total_estimated_revenue: number
          total_impressions: number
          total_likes: number
          total_monetized_playbacks: number
          total_net_subscribers: number
          total_shares: number
          total_subscribers_gained: number
          total_subscribers_lost: number
          total_views: number
          week_start: string
        }[]
      }
      aggregate_video_analytics: {
        Args: { p_video_id: string; p_workspace_id: string }
        Returns: {
          latest_title: string
          row_count: number
          total_card_clicks: number
          total_card_impressions: number
          total_comments: number
          total_dislikes: number
          total_end_screen_element_clicks: number
          total_end_screen_element_impressions: number
          total_estimated_minutes_watched: number
          total_estimated_revenue: number
          total_impressions: number
          total_likes: number
          total_shares: number
          total_subscribers_gained: number
          total_subscribers_lost: number
          total_views: number
          weighted_avg_view_duration: number
          weighted_avg_view_percentage: number
        }[]
      }
      bootstrap_workspace: {
        Args: { ws_name: string; ws_slug: string }
        Returns: string
      }
      can_manual_refresh: {
        Args: { p_dataset_key: string; p_workspace_id: string }
        Returns: boolean
      }
      get_dashboard_polling_counts: {
        Args: { p_workspace_id: string }
        Returns: Json
      }
      get_memory_graph: {
        Args: { p_depth?: number; p_memory_id: string; p_workspace_id?: string }
        Returns: {
          connected_from: string
          content: string
          depth: number
          entity_id: string
          entity_type: string
          memory_id: string
          origin: string
          rel_strength: number
          rel_type: string
          tags: string[]
        }[]
      }
      get_workspace_role: { Args: { ws_id: string }; Returns: string }
      hybrid_memory_search:
        | {
            Args: {
              match_count?: number
              origin_filter?: string
              query_embedding: string
              query_text: string
              search_offset?: number
              ws_id: string
            }
            Returns: {
              content: string
              id: string
              origin: string
              rrf_score: number
              tags: string[]
            }[]
          }
        | {
            Args: {
              match_count?: number
              origin_filter?: string
              query_embedding: string
              query_text: string
              ws_id: string
            }
            Returns: {
              content: string
              id: string
              origin: string
              rrf_score: number
              tags: string[]
            }[]
          }
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean }
      memory_vector_search: {
        Args: {
          entity_id_filter?: string
          entity_type_filter?: string
          include_expired?: boolean
          match_count?: number
          memory_type_filter?: string
          query_embedding: string
          ws_id: string
        }
        Returns: {
          confidence_score: number
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          importance_score: number
          is_pinned: boolean
          memory_type: string
          origin: string
          similarity: number
          tags: string[]
        }[]
      }
      recalculate_topic_pipeline: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      record_dataset_sync: {
        Args: {
          p_cooldown_hours?: number
          p_dataset_key: string
          p_error?: string
          p_triggered_by?: string
          p_workspace_id: string
        }
        Returns: Json
      }
      record_memory_access: {
        Args: {
          p_accessed_by?: string
          p_memory_id: string
          p_query_context?: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      seed_default_expense_categories: {
        Args: { ws_id: string }
        Returns: undefined
      }
      soft_delete_company: {
        Args: { company_id: string; ws_id: string }
        Returns: undefined
      }
      trigger_auto_memory_extractor: {
        Args: {
          p_event_data: Json
          p_event_type: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      trigger_beehiiv_post_sync: { Args: never; Returns: undefined }
      trigger_beehiiv_subscriber_sync: { Args: never; Returns: undefined }
      trigger_beehiiv_sync: { Args: never; Returns: undefined }
      trigger_memory_decay_processor: { Args: never; Returns: undefined }
    }
    Enums: {
      conflict_status: "pending" | "resolved"
      conflict_type: "factual" | "temporal" | "preference" | "scope"
      memory_edge_type:
        | "derived_from"
        | "supports"
        | "contradicts"
        | "supersedes"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      conflict_status: ["pending", "resolved"],
      conflict_type: ["factual", "temporal", "preference", "scope"],
      memory_edge_type: [
        "derived_from",
        "supports",
        "contradicts",
        "supersedes",
      ],
    },
  },
} as const
