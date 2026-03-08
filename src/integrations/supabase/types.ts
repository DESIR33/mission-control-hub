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
    PostgrestVersion: "14.1"
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
          content: string
          created_at: string
          embedding: string | null
          id: string
          origin: string
          tags: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          origin?: string
          tags?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          origin?: string
          tags?: string[] | null
          updated_at?: string
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
      companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          enrichment_brandfetch: Json | null
          enrichment_clay: Json | null
          enrichment_firecrawl: Json | null
          id: string
          industry: string | null
          last_contact_date: string | null
          location: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          primary_email: string | null
          response_sla_minutes: number | null
          revenue: string | null
          secondary_email: string | null
          size: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_producthunt: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_whatsapp: string | null
          social_youtube: string | null
          state: string | null
          updated_at: string
          vip_tier: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enrichment_brandfetch?: Json | null
          enrichment_clay?: Json | null
          enrichment_firecrawl?: Json | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          primary_email?: string | null
          response_sla_minutes?: number | null
          revenue?: string | null
          secondary_email?: string | null
          size?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_producthunt?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          state?: string | null
          updated_at?: string
          vip_tier?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          enrichment_brandfetch?: Json | null
          enrichment_clay?: Json | null
          enrichment_firecrawl?: Json | null
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          primary_email?: string | null
          response_sla_minutes?: number | null
          revenue?: string | null
          secondary_email?: string | null
          size?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_producthunt?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          state?: string | null
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
      contacts: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          deleted_at: string | null
          email: string | null
          enrichment_ai: Json | null
          enrichment_hunter: Json | null
          enrichment_youtube: Json | null
          escalation_owner_id: string | null
          first_name: string
          id: string
          last_contact_date: string | null
          last_name: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          preferred_channel: string | null
          response_sla_minutes: number | null
          role: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_telegram: string | null
          social_twitter: string | null
          social_whatsapp: string | null
          social_youtube: string | null
          source: string | null
          status: string
          updated_at: string
          vip_tier: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          email?: string | null
          enrichment_ai?: Json | null
          enrichment_hunter?: Json | null
          enrichment_youtube?: Json | null
          escalation_owner_id?: string | null
          first_name: string
          id?: string
          last_contact_date?: string | null
          last_name?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          preferred_channel?: string | null
          response_sla_minutes?: number | null
          role?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_telegram?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          vip_tier?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          email?: string | null
          enrichment_ai?: Json | null
          enrichment_hunter?: Json | null
          enrichment_youtube?: Json | null
          escalation_owner_id?: string | null
          first_name?: string
          id?: string
          last_contact_date?: string | null
          last_name?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          preferred_channel?: string | null
          response_sla_minutes?: number | null
          role?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_telegram?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          vip_tier?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
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
          body_html: string | null
          conversation_id: string | null
          created_at: string
          folder: string
          from_email: string
          from_name: string
          has_attachments: boolean
          id: string
          importance: string
          is_pinned: boolean
          is_read: boolean
          labels: string[] | null
          message_id: string
          metadata: Json | null
          preview: string
          received_at: string
          subject: string
          to_recipients: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body_html?: string | null
          conversation_id?: string | null
          created_at?: string
          folder?: string
          from_email?: string
          from_name?: string
          has_attachments?: boolean
          id?: string
          importance?: string
          is_pinned?: boolean
          is_read?: boolean
          labels?: string[] | null
          message_id: string
          metadata?: Json | null
          preview?: string
          received_at?: string
          subject?: string
          to_recipients?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body_html?: string | null
          conversation_id?: string | null
          created_at?: string
          folder?: string
          from_email?: string
          from_name?: string
          has_attachments?: boolean
          id?: string
          importance?: string
          is_pinned?: boolean
          is_read?: boolean
          labels?: string[] | null
          message_id?: string
          metadata?: Json | null
          preview?: string
          received_at?: string
          subject?: string
          to_recipients?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_emails_workspace_id_fkey"
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
      video_queue: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          notes: string | null
          priority: string
          published_url: string | null
          scheduled_date: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string
          published_url?: string | null
          scheduled_date?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          priority?: string
          published_url?: string | null
          scheduled_date?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
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
      workspace_integrations: {
        Row: {
          config: Json | null
          connected_at: string | null
          created_at: string
          enabled: boolean
          id: string
          integration_key: string
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
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
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
            foreignKeyName: "youtube_channel_analytics_workspace_id_fkey"
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
          fetched_at: string
          id: string
          likes: number
          published_at: string | null
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
          fetched_at?: string
          id?: string
          likes?: number
          published_at?: string | null
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
          fetched_at?: string
          id?: string
          likes?: number
          published_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_workspace: {
        Args: { ws_name: string; ws_slug: string }
        Returns: string
      }
      get_workspace_role: { Args: { ws_id: string }; Returns: string }
      hybrid_memory_search: {
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
      soft_delete_company: {
        Args: { company_id: string; ws_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
