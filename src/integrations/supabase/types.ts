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
      career_plans: {
        Row: {
          created_at: string
          id: string
          ranked: Json | null
          reasoning: string | null
          selected_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ranked?: Json | null
          reasoning?: string | null
          selected_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ranked?: Json | null
          reasoning?: string | null
          selected_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          completed_blocks: number | null
          created_at: string
          difficulty: number | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_blocks?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_blocks?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_skills: {
        Row: {
          course_code: string
          skill: string
        }
        Insert: {
          course_code: string
          skill: string
        }
        Update: {
          course_code?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_skills_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
        ]
      }
      courses: {
        Row: {
          assessment: string | null
          code: string
          day: number | null
          description: string | null
          ects: number | null
          end: string | null
          faculty: string | null
          format: string | null
          instructor: string | null
          language: string[] | null
          last_synced_at: string
          learning_outcomes: string[] | null
          level: string | null
          name: string
          name_en: string | null
          required: boolean | null
          room: string | null
          semester: string | null
          source: string
          start: string | null
          university: string | null
          url: string | null
        }
        Insert: {
          assessment?: string | null
          code: string
          day?: number | null
          description?: string | null
          ects?: number | null
          end?: string | null
          faculty?: string | null
          format?: string | null
          instructor?: string | null
          language?: string[] | null
          last_synced_at?: string
          learning_outcomes?: string[] | null
          level?: string | null
          name: string
          name_en?: string | null
          required?: boolean | null
          room?: string | null
          semester?: string | null
          source: string
          start?: string | null
          university?: string | null
          url?: string | null
        }
        Update: {
          assessment?: string | null
          code?: string
          day?: number | null
          description?: string | null
          ects?: number | null
          end?: string | null
          faculty?: string | null
          format?: string | null
          instructor?: string | null
          language?: string[] | null
          last_synced_at?: string
          learning_outcomes?: string[] | null
          level?: string | null
          name?: string
          name_en?: string | null
          required?: boolean | null
          room?: string | null
          semester?: string | null
          source?: string
          start?: string | null
          university?: string | null
          url?: string | null
        }
        Relationships: []
      }
      cv_uploads: {
        Row: {
          created_at: string
          extracted: Json | null
          id: string
          raw_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted?: Json | null
          id?: string
          raw_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          extracted?: Json | null
          id?: string
          raw_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          interests: string[] | null
          onboarded: boolean | null
          program: string | null
          programme_code: string | null
          programme_name: string | null
          target_ects: number | null
          target_graduation: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          interests?: string[] | null
          onboarded?: boolean | null
          program?: string | null
          programme_code?: string | null
          programme_name?: string | null
          target_ects?: number | null
          target_graduation?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          interests?: string[] | null
          onboarded?: boolean | null
          program?: string | null
          programme_code?: string | null
          programme_name?: string | null
          target_ects?: number | null
          target_graduation?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      schedule_events: {
        Row: {
          completed_at: string | null
          course_code: string | null
          created_at: string
          day_of_week: number | null
          end_time: string | null
          ends_at: string | null
          id: string
          kind: string
          source: string | null
          start_time: string | null
          starts_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_code?: string | null
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          source?: string | null
          start_time?: string | null
          starts_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_code?: string | null
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          source?: string | null
          start_time?: string | null
          starts_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          retention_risk: number | null
          selected_courses: Json | null
          updated_at: string
          user_id: string
          workload_target: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          retention_risk?: number | null
          selected_courses?: Json | null
          updated_at?: string
          user_id: string
          workload_target?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          retention_risk?: number | null
          selected_courses?: Json | null
          updated_at?: string
          user_id?: string
          workload_target?: number | null
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          error: string | null
          failed: number | null
          finished_at: string
          id: string
          inserted: number | null
          prefix: string | null
          source: string
          status: string
          updated: number | null
        }
        Insert: {
          error?: string | null
          failed?: number | null
          finished_at?: string
          id?: string
          inserted?: number | null
          prefix?: string | null
          source: string
          status: string
          updated?: number | null
        }
        Update: {
          error?: string | null
          failed?: number | null
          finished_at?: string
          id?: string
          inserted?: number | null
          prefix?: string | null
          source?: string
          status?: string
          updated?: number | null
        }
        Relationships: []
      }
      user_courses: {
        Row: {
          assessment: string | null
          code: string
          created_at: string
          ects: number | null
          id: string
          kind: string | null
          learning_outcomes: string[] | null
          name: string
          prerequisites: string[] | null
          raw_text: string | null
          semester: string | null
          skills: string[] | null
          source_filename: string | null
          status: string
          topics: string[] | null
          updated_at: string
          user_id: string
          workload: Json | null
        }
        Insert: {
          assessment?: string | null
          code: string
          created_at?: string
          ects?: number | null
          id?: string
          kind?: string | null
          learning_outcomes?: string[] | null
          name: string
          prerequisites?: string[] | null
          raw_text?: string | null
          semester?: string | null
          skills?: string[] | null
          source_filename?: string | null
          status?: string
          topics?: string[] | null
          updated_at?: string
          user_id: string
          workload?: Json | null
        }
        Update: {
          assessment?: string | null
          code?: string
          created_at?: string
          ects?: number | null
          id?: string
          kind?: string | null
          learning_outcomes?: string[] | null
          name?: string
          prerequisites?: string[] | null
          raw_text?: string | null
          semester?: string | null
          skills?: string[] | null
          source_filename?: string | null
          status?: string
          topics?: string[] | null
          updated_at?: string
          user_id?: string
          workload?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
