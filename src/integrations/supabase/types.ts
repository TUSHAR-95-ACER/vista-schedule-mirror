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
      daily_plans: {
        Row: {
          analysis_video_url: string | null
          created_at: string
          daily_bias: string
          date: string
          id: string
          max_trades: number
          news_items: Json | null
          note: string | null
          pairs: Json | null
          result_chart_image: string | null
          result_narrative: string | null
          reviewed: boolean | null
          risk_limit: string | null
          session_focus: string
          took_trades: boolean | null
          user_id: string
        }
        Insert: {
          analysis_video_url?: string | null
          created_at?: string
          daily_bias?: string
          date: string
          id: string
          max_trades?: number
          news_items?: Json | null
          note?: string | null
          pairs?: Json | null
          result_chart_image?: string | null
          result_narrative?: string | null
          reviewed?: boolean | null
          risk_limit?: string | null
          session_focus?: string
          took_trades?: boolean | null
          user_id: string
        }
        Update: {
          analysis_video_url?: string | null
          created_at?: string
          daily_bias?: string
          date?: string
          id?: string
          max_trades?: number
          news_items?: Json | null
          note?: string | null
          pairs?: Json | null
          result_chart_image?: string | null
          result_narrative?: string | null
          reviewed?: boolean | null
          risk_limit?: string | null
          session_focus?: string
          took_trades?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scale_events: {
        Row: {
          account_id: string
          created_at: string
          date: string
          id: string
          new_size: number
          note: string | null
          old_size: number
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          date: string
          id: string
          new_size?: number
          note?: string | null
          old_size?: number
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          date?: string
          id?: string
          new_size?: number
          note?: string | null
          old_size?: number
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          accounts: Json | null
          actual_rr: number | null
          asset: string
          chart_link: string | null
          confluences: Json | null
          created_at: string
          date: string
          direction: string
          entry_confluences: Json | null
          entry_price: number
          entry_time: string | null
          execution_image: string | null
          exit_price: number | null
          exit_time: string | null
          fees: number | null
          grade: string | null
          id: string
          management: Json | null
          market: string
          market_condition: string
          max_adverse_move: number | null
          max_rr_reached: number | null
          mistakes: Json | null
          notes: string | null
          pips: number | null
          planned_rr: number
          prediction_image: string | null
          profit_loss: number
          psychology: Json | null
          quantity: number
          result: string
          session: string
          setup: string
          stop_loss: number
          take_profit: number
          target_confluences: Json | null
          timeframe: string | null
          trade_journey: Json | null
          user_id: string
        }
        Insert: {
          accounts?: Json | null
          actual_rr?: number | null
          asset: string
          chart_link?: string | null
          confluences?: Json | null
          created_at?: string
          date: string
          direction: string
          entry_confluences?: Json | null
          entry_price?: number
          entry_time?: string | null
          execution_image?: string | null
          exit_price?: number | null
          exit_time?: string | null
          fees?: number | null
          grade?: string | null
          id: string
          management?: Json | null
          market: string
          market_condition: string
          max_adverse_move?: number | null
          max_rr_reached?: number | null
          mistakes?: Json | null
          notes?: string | null
          pips?: number | null
          planned_rr?: number
          prediction_image?: string | null
          profit_loss?: number
          psychology?: Json | null
          quantity?: number
          result: string
          session: string
          setup: string
          stop_loss?: number
          take_profit?: number
          target_confluences?: Json | null
          timeframe?: string | null
          trade_journey?: Json | null
          user_id: string
        }
        Update: {
          accounts?: Json | null
          actual_rr?: number | null
          asset?: string
          chart_link?: string | null
          confluences?: Json | null
          created_at?: string
          date?: string
          direction?: string
          entry_confluences?: Json | null
          entry_price?: number
          entry_time?: string | null
          execution_image?: string | null
          exit_price?: number | null
          exit_time?: string | null
          fees?: number | null
          grade?: string | null
          id?: string
          management?: Json | null
          market?: string
          market_condition?: string
          max_adverse_move?: number | null
          max_rr_reached?: number | null
          mistakes?: Json | null
          notes?: string | null
          pips?: number | null
          planned_rr?: number
          prediction_image?: string | null
          profit_loss?: number
          psychology?: Json | null
          quantity?: number
          result?: string
          session?: string
          setup?: string
          stop_loss?: number
          take_profit?: number
          target_confluences?: Json | null
          timeframe?: string | null
          trade_journey?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      trading_accounts: {
        Row: {
          broker: string
          created_at: string
          currency: string
          current_size: number
          daily_drawdown_limit: number | null
          daily_drawdown_percent: number | null
          id: string
          initial_size: number
          max_drawdown_limit: number | null
          max_drawdown_percent: number | null
          name: string
          payouts: Json | null
          phase1_target: number | null
          phase1_target_percent: number | null
          phase2_target: number | null
          phase2_target_percent: number | null
          phase3_target: number | null
          phase3_target_percent: number | null
          stage: string | null
          starting_balance: number
          status: string | null
          steps: number | null
          target_balance: number | null
          target_percent: number | null
          type: string
          user_id: string
        }
        Insert: {
          broker?: string
          created_at?: string
          currency?: string
          current_size?: number
          daily_drawdown_limit?: number | null
          daily_drawdown_percent?: number | null
          id: string
          initial_size?: number
          max_drawdown_limit?: number | null
          max_drawdown_percent?: number | null
          name: string
          payouts?: Json | null
          phase1_target?: number | null
          phase1_target_percent?: number | null
          phase2_target?: number | null
          phase2_target_percent?: number | null
          phase3_target?: number | null
          phase3_target_percent?: number | null
          stage?: string | null
          starting_balance?: number
          status?: string | null
          steps?: number | null
          target_balance?: number | null
          target_percent?: number | null
          type?: string
          user_id: string
        }
        Update: {
          broker?: string
          created_at?: string
          currency?: string
          current_size?: number
          daily_drawdown_limit?: number | null
          daily_drawdown_percent?: number | null
          id?: string
          initial_size?: number
          max_drawdown_limit?: number | null
          max_drawdown_percent?: number | null
          name?: string
          payouts?: Json | null
          phase1_target?: number | null
          phase1_target_percent?: number | null
          phase2_target?: number | null
          phase2_target_percent?: number | null
          phase3_target?: number | null
          phase3_target_percent?: number | null
          stage?: string | null
          starting_balance?: number
          status?: string | null
          steps?: number | null
          target_balance?: number | null
          target_percent?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          date: string
          id: string
          note: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          date: string
          id: string
          note?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          conditions: Json | null
          created_at: string
          custom_assets: Json | null
          custom_confluences: Json | null
          custom_setups: Json | null
          grades_list: Json | null
          id: string
          management_options: Json | null
          markets: Json | null
          notebook_categories: Json | null
          psych_tags: Json | null
          sessions: Json | null
          updated_at: string
          user_id: string
          violations: Json | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          custom_assets?: Json | null
          custom_confluences?: Json | null
          custom_setups?: Json | null
          grades_list?: Json | null
          id?: string
          management_options?: Json | null
          markets?: Json | null
          notebook_categories?: Json | null
          psych_tags?: Json | null
          sessions?: Json | null
          updated_at?: string
          user_id: string
          violations?: Json | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          custom_assets?: Json | null
          custom_confluences?: Json | null
          custom_setups?: Json | null
          grades_list?: Json | null
          id?: string
          management_options?: Json | null
          markets?: Json | null
          notebook_categories?: Json | null
          psych_tags?: Json | null
          sessions?: Json | null
          updated_at?: string
          user_id?: string
          violations?: Json | null
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          analysis_video_url: string | null
          bias: string
          created_at: string
          goals: string | null
          id: string
          levels: string | null
          markets: Json | null
          news_items: Json | null
          news_result: string | null
          pair_analyses: Json | null
          reviewed: boolean | null
          risk: string | null
          setups: Json | null
          user_id: string
          week_start: string
        }
        Insert: {
          analysis_video_url?: string | null
          bias?: string
          created_at?: string
          goals?: string | null
          id: string
          levels?: string | null
          markets?: Json | null
          news_items?: Json | null
          news_result?: string | null
          pair_analyses?: Json | null
          reviewed?: boolean | null
          risk?: string | null
          setups?: Json | null
          user_id: string
          week_start: string
        }
        Update: {
          analysis_video_url?: string | null
          bias?: string
          created_at?: string
          goals?: string | null
          id?: string
          levels?: string | null
          markets?: Json | null
          news_items?: Json | null
          news_result?: string | null
          pair_analyses?: Json | null
          reviewed?: boolean | null
          risk?: string | null
          setups?: Json | null
          user_id?: string
          week_start?: string
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
