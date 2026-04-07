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
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          color: string | null
          created_at: string
          description: string
          icon_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          linkedin_url: string | null
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          tags: Json | null
          updated_at: string
          video_url: string | null
          website: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description: string
          icon_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          tags?: Json | null
          updated_at?: string
          video_url?: string | null
          website?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string
          icon_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          tags?: Json | null
          updated_at?: string
          video_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          action: string | null
          action_label: string | null
          created_at: string
          description: string
          difficulty: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          points: number
          slug: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          action?: string | null
          action_label?: string | null
          created_at?: string
          description: string
          difficulty: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          points?: number
          slug: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          action?: string | null
          action_label?: string | null
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          points?: number
          slug?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_marketing: boolean
          accepted_terms: boolean
          avatar_emoji: string | null
          avatar_id: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          points: number
          registration_type: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_marketing?: boolean
          accepted_terms?: boolean
          avatar_emoji?: string | null
          avatar_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          points?: number
          registration_type?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_marketing?: boolean
          accepted_terms?: boolean
          avatar_emoji?: string | null
          avatar_id?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          points?: number
          registration_type?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string
          id: string
          options: Json
          question: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation: string
          id?: string
          options?: Json
          question: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string
          id?: string
          options?: Json
          question?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          max_points: number
          slug: string
          time_per_question: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          max_points?: number
          slug: string
          time_per_question?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          max_points?: number
          slug?: string
          time_per_question?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          completed_at: string
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quizzes: {
        Row: {
          completed_at: string
          id: string
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          quiz_id: string
          score?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quizzes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
