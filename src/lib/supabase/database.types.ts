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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      character_skills: {
        Row: {
          character_id: string
          created_at: string
          id: string
          level: number
          skill_id: string
          specialization: string | null
          updated_at: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          level?: number
          skill_id: string
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          level?: number
          skill_id?: string
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_skills_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age: number | null
          attr_des: number
          attr_esp: number
          attr_fis: number
          attr_int: number
          attr_per: number
          created_at: string
          id: string
          mana_source: string
          name: string
          physical_description: string | null
          player_id: string
          race_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rp_points: number
          sex: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          age?: number | null
          attr_des?: number
          attr_esp?: number
          attr_fis?: number
          attr_int?: number
          attr_per?: number
          created_at?: string
          id?: string
          mana_source?: string
          name: string
          physical_description?: string | null
          player_id: string
          race_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rp_points?: number
          sex?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          age?: number | null
          attr_des?: number
          attr_esp?: number
          attr_fis?: number
          attr_int?: number
          attr_per?: number
          created_at?: string
          id?: string
          mana_source?: string
          name?: string
          physical_description?: string | null
          player_id?: string
          race_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rp_points?: number
          sex?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          character_id: string
          created_at: string
          event_id: string
          id: string
          status: string
          xp_awarded: number
        }
        Insert: {
          character_id: string
          created_at?: string
          event_id: string
          id?: string
          status?: string
          xp_awarded?: number
        }
        Update: {
          character_id?: string
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          counts_as_masteo: boolean
          created_at: string
          event_id: string
          id: string
          session_date: string
          summary: string | null
          title: string | null
        }
        Insert: {
          counts_as_masteo?: boolean
          created_at?: string
          event_id: string
          id?: string
          session_date?: string
          summary?: string | null
          title?: string | null
        }
        Update: {
          counts_as_masteo?: boolean
          created_at?: string
          event_id?: string
          id?: string
          session_date?: string
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          creator_id: string
          description: Json
          ends_at: string | null
          id: string
          location: string | null
          max_players: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: Json
          ends_at?: string | null
          id?: string
          location?: string | null
          max_players?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: Json
          ends_at?: string | null
          id?: string
          location?: string | null
          max_players?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: Json
          created_at: string
          edited_at: string | null
          edited_by: string | null
          id: string
          post_number: number
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: Json
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          post_number: number
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: Json
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          post_number?: number
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          age_data: Json | null
          created_at: string
          description: string | null
          group_name: string
          id: string
          magic_access: string[] | null
          name: string
          physical_data: Json | null
          size: string
        }
        Insert: {
          age_data?: Json | null
          created_at?: string
          description?: string | null
          group_name: string
          id?: string
          magic_access?: string[] | null
          name: string
          physical_data?: Json | null
          size: string
        }
        Update: {
          age_data?: Json | null
          created_at?: string
          description?: string | null
          group_name?: string
          id?: string
          magic_access?: string[] | null
          name?: string
          physical_data?: Json | null
          size?: string
        }
        Relationships: []
      }
      section_permissions: {
        Row: {
          can_edit: boolean
          can_lock: boolean
          can_post: boolean
          can_view: boolean
          category_id: string
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_lock?: boolean
          can_post?: boolean
          can_view?: boolean
          category_id: string
          created_at?: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_lock?: boolean
          can_post?: boolean
          can_view?: boolean
          category_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_permissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_request_items: {
        Row: {
          from_level: number
          id: string
          request_id: string
          skill_id: string
          specialization: string | null
          to_level: number
          xp_cost: number
        }
        Insert: {
          from_level: number
          id?: string
          request_id: string
          skill_id: string
          specialization?: string | null
          to_level: number
          xp_cost: number
        }
        Update: {
          from_level?: number
          id?: string
          request_id?: string
          skill_id?: string
          specialization?: string | null
          to_level?: number
          xp_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "skill_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_request_items_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_requests: {
        Row: {
          character_id: string
          created_at: string
          id: string
          justification: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          total_xp_cost: number
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          justification: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          total_xp_cost?: number
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          justification?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          total_xp_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_requests_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requests_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          attribute: string
          created_at: string
          description: string | null
          id: string
          name: string
          requires_specialization: boolean
          specializations: string[] | null
        }
        Insert: {
          attribute: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          requires_specialization?: boolean
          specializations?: string[] | null
        }
        Update: {
          attribute?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          requires_specialization?: boolean
          specializations?: string[] | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          character_id: string
          content: Json
          created_at: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at: string
        }
        Insert: {
          character_id: string
          content?: Json
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          updated_at?: string
        }
        Update: {
          character_id?: string
          content?: Json
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_permissions: {
        Row: {
          can_edit: boolean
          can_lock: boolean
          can_post: boolean
          can_view: boolean
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          thread_id: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_lock?: boolean
          can_post?: boolean
          can_view?: boolean
          created_at?: string
          role: Database["public"]["Enums"]["user_role"]
          thread_id: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_lock?: boolean
          can_post?: boolean
          can_view?: boolean
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_permissions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          author_id: string
          body: Json
          category_id: string | null
          content_type: string
          created_at: string
          edited_at: string | null
          edited_by: string | null
          id: string
          is_locked: boolean
          linked_entity_id: string | null
          linked_entity_type: string | null
          locked_at: string | null
          locked_by: string | null
          status: Database["public"]["Enums"]["thread_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: Json
          category_id?: string | null
          content_type: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          is_locked?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          locked_at?: string | null
          locked_by?: string | null
          status?: Database["public"]["Enums"]["thread_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: Json
          category_id?: string | null
          content_type?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          is_locked?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          locked_at?: string | null
          locked_by?: string | null
          status?: Database["public"]["Enums"]["thread_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          awarded_by: string | null
          character_id: string
          created_at: string
          id: string
          reason: string
          source: string
          source_id: string | null
        }
        Insert: {
          amount: number
          awarded_by?: string | null
          character_id: string
          created_at?: string
          id?: string
          reason: string
          source: string
          source_id?: string | null
        }
        Update: {
          amount?: number
          awarded_by?: string | null
          character_id?: string
          created_at?: string
          id?: string
          reason?: string
          source?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      // eslint-disable-next-line no-unused-vars
      [_ in never]: never
    }
    Functions: {
      approve_character: {
        Args: { p_character_id: string; p_notes?: string }
        Returns: undefined
      }
      approve_skill_request: {
        Args: { p_notes?: string; p_request_id: string }
        Returns: undefined
      }
      approve_story: {
        Args: { p_notes?: string; p_story_id: string }
        Returns: undefined
      }
      confirm_event_completion: {
        Args: { p_event_id: string; p_notes?: string }
        Returns: undefined
      }
      finalize_event: {
        Args: { p_event_id: string; p_xp_per_participant: number }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_gm_or_admin: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
      reject_character: {
        Args: { p_character_id: string; p_notes: string }
        Returns: undefined
      }
      reject_skill_request: {
        Args: { p_notes: string; p_request_id: string }
        Returns: undefined
      }
      reject_story: {
        Args: { p_notes: string; p_story_id: string }
        Returns: undefined
      }
    }
    Enums: {
      approval_status: "borrador" | "pendiente" | "aprobado" | "rechazado"
      audit_action:
        | "aprobar"
        | "rechazar"
        | "editar"
        | "otorgar_xp"
        | "finalizar_evento"
        | "cambiar_rol"
        | "editar_catalogo"
        | "editar_settings"
        | "crear_hilo"
        | "editar_post"
        | "eliminar_post"
        | "bloquear_hilo"
        | "desbloquear_hilo"
        | "editar_permisos"
      event_status:
        | "publicado"
        | "en_curso"
        | "finalizacion_pendiente"
        | "finalizado"
        | "cancelado"
      event_type: "casual" | "evento" | "campana"
      thread_status: "borrador" | "pendiente" | "abierto" | "aprobado" | "rechazado"
      user_role: "pendiente" | "rolero" | "gm" | "admin"
    }
    CompositeTypes: {
      // eslint-disable-next-line no-unused-vars
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
      approval_status: ["borrador", "pendiente", "aprobado", "rechazado"],
      audit_action: [
        "aprobar",
        "rechazar",
        "editar",
        "otorgar_xp",
        "finalizar_evento",
        "cambiar_rol",
        "editar_catalogo",
        "editar_settings",
        "crear_hilo",
        "editar_post",
        "eliminar_post",
        "bloquear_hilo",
        "desbloquear_hilo",
        "editar_permisos",
      ],
      event_status: [
        "publicado",
        "en_curso",
        "finalizacion_pendiente",
        "finalizado",
        "cancelado",
      ],
      event_type: ["casual", "evento", "campana"],
      thread_status: ["borrador", "pendiente", "abierto", "aprobado", "rechazado"],
      user_role: ["pendiente", "rolero", "gm", "admin"],
    },
  },
} as const
