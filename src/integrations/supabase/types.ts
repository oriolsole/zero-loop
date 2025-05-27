export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_conversations: {
        Row: {
          ai_reasoning: string | null
          content: string
          created_at: string
          id: string
          knowledge_used: Json | null
          learning_insights: Json | null
          message_type: string | null
          role: string
          self_reflection: string | null
          session_id: string
          stream_steps: Json | null
          tool_decision: Json | null
          tool_progress: Json | null
          tools_used: Json | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          content: string
          created_at?: string
          id?: string
          knowledge_used?: Json | null
          learning_insights?: Json | null
          message_type?: string | null
          role: string
          self_reflection?: string | null
          session_id: string
          stream_steps?: Json | null
          tool_decision?: Json | null
          tool_progress?: Json | null
          tools_used?: Json | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          content?: string
          created_at?: string
          id?: string
          knowledge_used?: Json | null
          learning_insights?: Json | null
          message_type?: string | null
          role?: string
          self_reflection?: string | null
          session_id?: string
          stream_steps?: Json | null
          tool_decision?: Json | null
          tool_progress?: Json | null
          tools_used?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      domains: {
        Row: {
          created_at: string | null
          description: string | null
          engine_type: string | null
          id: string
          metadata: Json | null
          name: string
          short_desc: string | null
          total_loops: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          engine_type?: string | null
          id?: string
          metadata?: Json | null
          name: string
          short_desc?: string | null
          total_loops?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          engine_type?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          short_desc?: string | null
          total_loops?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          content: string
          created_at: string | null
          domain_id: string | null
          embedding: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          ocr_processed: boolean | null
          original_file_type: string | null
          source_url: string | null
          thumbnail_path: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          domain_id?: string | null
          embedding?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          ocr_processed?: boolean | null
          original_file_type?: string | null
          source_url?: string | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          domain_id?: string | null
          embedding?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          ocr_processed?: boolean | null
          original_file_type?: string | null
          source_url?: string | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_edges: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          metadata: Json | null
          source_id: string
          strength: number
          target_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          label?: string | null
          metadata?: Json | null
          source_id: string
          strength: number
          target_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          metadata?: Json | null
          source_id?: string
          strength?: number
          target_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          confidence: number
          created_at: string | null
          description: string
          discovered_in_loop: number
          domain_id: string
          id: string
          metadata: Json | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          confidence: number
          created_at?: string | null
          description: string
          discovered_in_loop: number
          domain_id: string
          id: string
          metadata?: Json | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          description?: string
          discovered_in_loop?: number
          domain_id?: string
          id?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      learning_loops: {
        Row: {
          created_at: string | null
          domain_id: string
          id: string
          metadata: Json | null
          reflection: string
          score: number
          solution: string
          success: boolean
          task: string
          user_id: string | null
          verification: string
        }
        Insert: {
          created_at?: string | null
          domain_id: string
          id: string
          metadata?: Json | null
          reflection: string
          score: number
          solution: string
          success: boolean
          task: string
          user_id?: string | null
          verification: string
        }
        Update: {
          created_at?: string | null
          domain_id?: string
          id?: string
          metadata?: Json | null
          reflection?: string
          score?: number
          solution?: string
          success?: boolean
          task?: string
          user_id?: string | null
          verification?: string
        }
        Relationships: []
      }
      mcp_executions: {
        Row: {
          created_at: string | null
          error: string | null
          execution_time: number | null
          id: string
          mcp_id: string | null
          parameters: Json
          result: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          execution_time?: number | null
          id?: string
          mcp_id?: string | null
          parameters?: Json
          result?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          execution_time?: number | null
          id?: string
          mcp_id?: string | null
          parameters?: Json
          result?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_executions_mcp_id_fkey"
            columns: ["mcp_id"]
            isOneToOne: false
            referencedRelation: "mcps"
            referencedColumns: ["id"]
          },
        ]
      }
      mcps: {
        Row: {
          authKeyName: string | null
          authType: string | null
          category: string | null
          created_at: string | null
          default_key: string | null
          description: string
          endpoint: string
          icon: string | null
          id: string
          isDefault: boolean | null
          parameters: Json
          requiresAuth: boolean | null
          requirestoken: string | null
          sampleUseCases: Json | null
          suggestedPrompt: string | null
          tags: Json | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          authKeyName?: string | null
          authType?: string | null
          category?: string | null
          created_at?: string | null
          default_key?: string | null
          description: string
          endpoint: string
          icon?: string | null
          id?: string
          isDefault?: boolean | null
          parameters?: Json
          requiresAuth?: boolean | null
          requirestoken?: string | null
          sampleUseCases?: Json | null
          suggestedPrompt?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          authKeyName?: string | null
          authType?: string | null
          category?: string | null
          created_at?: string | null
          default_key?: string | null
          description?: string
          endpoint?: string
          icon?: string | null
          id?: string
          isDefault?: boolean | null
          parameters?: Json
          requiresAuth?: boolean | null
          requirestoken?: string | null
          sampleUseCases?: Json | null
          suggestedPrompt?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      upload_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: string | null
          id: string
          message: string | null
          progress: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: string | null
          id?: string
          message?: string | null
          progress?: number
          status: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: string | null
          id?: string
          message?: string | null
          progress?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_secrets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_knowledge_chunks: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          domain_id: string
          source_url: string
          metadata: Json
          created_at: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
