// Generated from the Supabase project (2026-09-11). Regenerate with `npm run db:types` after a migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      blocks: {
        Row: {
          distance_m: number | null;
          duration_s: number | null;
          id: string;
          kind: Database["public"]["Enums"]["block_kind"];
          measure: Database["public"]["Enums"]["block_measure"];
          position: number;
          program_day_id: string;
          repeat_count: number | null;
          repeat_group: string | null;
          target_effort: Database["public"]["Enums"]["effort"] | null;
          target_pace_max: number | null;
          target_pace_min: number | null;
        };
        Insert: {
          distance_m?: number | null;
          duration_s?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["block_kind"];
          measure?: Database["public"]["Enums"]["block_measure"];
          position: number;
          program_day_id: string;
          repeat_count?: number | null;
          repeat_group?: string | null;
          target_effort?: Database["public"]["Enums"]["effort"] | null;
          target_pace_max?: number | null;
          target_pace_min?: number | null;
        };
        Update: {
          distance_m?: number | null;
          duration_s?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["block_kind"];
          measure?: Database["public"]["Enums"]["block_measure"];
          position?: number;
          program_day_id?: string;
          repeat_count?: number | null;
          repeat_group?: string | null;
          target_effort?: Database["public"]["Enums"]["effort"] | null;
          target_pace_max?: number | null;
          target_pace_min?: number | null;
        };
        Relationships: [
          { foreignKeyName: "blocks_program_day_id_fkey"; columns: ["program_day_id"]; isOneToOne: false; referencedRelation: "program_days"; referencedColumns: ["id"] },
        ];
      };
      completions: {
        Row: {
          avg_pace_s: number | null;
          completed_at: string;
          distance_m: number | null;
          duration_s: number | null;
          enrollment_id: string;
          id: string;
          program_day_id: string;
          source: Database["public"]["Enums"]["completion_source"];
          strava_activity_id: string | null;
        };
        Insert: {
          avg_pace_s?: number | null;
          completed_at?: string;
          distance_m?: number | null;
          duration_s?: number | null;
          enrollment_id: string;
          id?: string;
          program_day_id: string;
          source?: Database["public"]["Enums"]["completion_source"];
          strava_activity_id?: string | null;
        };
        Update: {
          avg_pace_s?: number | null;
          completed_at?: string;
          distance_m?: number | null;
          duration_s?: number | null;
          enrollment_id?: string;
          id?: string;
          program_day_id?: string;
          source?: Database["public"]["Enums"]["completion_source"];
          strava_activity_id?: string | null;
        };
        Relationships: [
          { foreignKeyName: "completions_enrollment_id_fkey"; columns: ["enrollment_id"]; isOneToOne: false; referencedRelation: "enrollments"; referencedColumns: ["id"] },
          { foreignKeyName: "completions_program_day_id_fkey"; columns: ["program_day_id"]; isOneToOne: false; referencedRelation: "program_days"; referencedColumns: ["id"] },
        ];
      };
      creator_posts: {
        Row: { body: string; created_at: string; creator_id: string; id: string };
        Insert: { body: string; created_at?: string; creator_id: string; id?: string };
        Update: { body?: string; created_at?: string; creator_id?: string; id?: string };
        Relationships: [
          { foreignKeyName: "creator_posts_creator_id_fkey"; columns: ["creator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      enrollments: {
        Row: {
          created_at: string;
          follower_id: string;
          id: string;
          program_id: string;
          start_date: string;
          status: Database["public"]["Enums"]["enrollment_status"];
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          id?: string;
          program_id: string;
          start_date: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          id?: string;
          program_id?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
        };
        Relationships: [
          { foreignKeyName: "enrollments_follower_id_fkey"; columns: ["follower_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "enrollments_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string;
          created_at: string;
          display_name: string;
          handle: string;
          id: string;
          is_creator: boolean;
          links: Json;
          strava_athlete_id: string | null;
          strava_tokens: Json | null;
          stripe_account_id: string | null;
          stripe_customer_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          handle: string;
          id: string;
          is_creator?: boolean;
          links?: Json;
          strava_athlete_id?: string | null;
          strava_tokens?: Json | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          handle?: string;
          id?: string;
          is_creator?: boolean;
          links?: Json;
          strava_athlete_id?: string | null;
          strava_tokens?: Json | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
        };
        Relationships: [];
      };
      program_days: {
        Row: {
          day: number;
          id: string;
          kind: Database["public"]["Enums"]["day_kind"];
          note: string;
          program_id: string;
          run_type: Database["public"]["Enums"]["run_type"] | null;
          week: number;
        };
        Insert: {
          day: number;
          id?: string;
          kind?: Database["public"]["Enums"]["day_kind"];
          note?: string;
          program_id: string;
          run_type?: Database["public"]["Enums"]["run_type"] | null;
          week: number;
        };
        Update: {
          day?: number;
          id?: string;
          kind?: Database["public"]["Enums"]["day_kind"];
          note?: string;
          program_id?: string;
          run_type?: Database["public"]["Enums"]["run_type"] | null;
          week?: number;
        };
        Relationships: [
          { foreignKeyName: "program_days_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
        ];
      };
      programs: {
        Row: {
          access: Database["public"]["Enums"]["program_access"];
          cover_url: string | null;
          created_at: string;
          creator_id: string;
          description: string;
          fixed_start_date: string | null;
          goal: Database["public"]["Enums"]["program_goal"];
          id: string;
          level: Database["public"]["Enums"]["program_level"];
          price_cents: number | null;
          published_at: string | null;
          start_rule: Database["public"]["Enums"]["start_rule"];
          status: Database["public"]["Enums"]["program_status"];
          title: string;
          updated_at: string;
          weeks: number;
        };
        Insert: {
          access?: Database["public"]["Enums"]["program_access"];
          cover_url?: string | null;
          created_at?: string;
          creator_id: string;
          description?: string;
          fixed_start_date?: string | null;
          goal?: Database["public"]["Enums"]["program_goal"];
          id?: string;
          level?: Database["public"]["Enums"]["program_level"];
          price_cents?: number | null;
          published_at?: string | null;
          start_rule?: Database["public"]["Enums"]["start_rule"];
          status?: Database["public"]["Enums"]["program_status"];
          title: string;
          updated_at?: string;
          weeks: number;
        };
        Update: {
          access?: Database["public"]["Enums"]["program_access"];
          cover_url?: string | null;
          created_at?: string;
          creator_id?: string;
          description?: string;
          fixed_start_date?: string | null;
          goal?: Database["public"]["Enums"]["program_goal"];
          id?: string;
          level?: Database["public"]["Enums"]["program_level"];
          price_cents?: number | null;
          published_at?: string | null;
          start_rule?: Database["public"]["Enums"]["start_rule"];
          status?: Database["public"]["Enums"]["program_status"];
          title?: string;
          updated_at?: string;
          weeks?: number;
        };
        Relationships: [
          { foreignKeyName: "programs_creator_id_fkey"; columns: ["creator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      purchases: {
        Row: { created_at: string; follower_id: string; id: string; program_id: string; stripe_payment_intent_id: string | null };
        Insert: { created_at?: string; follower_id: string; id?: string; program_id: string; stripe_payment_intent_id?: string | null };
        Update: { created_at?: string; follower_id?: string; id?: string; program_id?: string; stripe_payment_intent_id?: string | null };
        Relationships: [
          { foreignKeyName: "purchases_follower_id_fkey"; columns: ["follower_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "purchases_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
        ];
      };
      subscriptions: {
        Row: {
          created_at: string;
          creator_id: string;
          follower_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          stripe_subscription_id: string | null;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          follower_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          stripe_subscription_id?: string | null;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          follower_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          stripe_subscription_id?: string | null;
        };
        Relationships: [
          { foreignKeyName: "subscriptions_creator_id_fkey"; columns: ["creator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "subscriptions_follower_id_fkey"; columns: ["follower_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      can_read_program: { Args: { p_program_id: string }; Returns: boolean };
      today_for_follower: {
        Args: { p_date?: string; p_follower_id: string };
        Returns: { day: number; enrollment_id: string; program_day_id: string; program_id: string; week: number }[];
      };
    };
    Enums: {
      block_kind: "warmup" | "work" | "recovery" | "cooldown";
      block_measure: "time" | "distance";
      completion_source: "manual" | "strava";
      day_kind: "run" | "rest" | "cross";
      effort: "easy" | "moderate" | "hard" | "all_out";
      enrollment_status: "active" | "paused" | "completed" | "dropped";
      program_access: "creator_sub" | "one_time";
      program_goal: "base" | "5k" | "10k" | "half" | "marathon" | "other";
      program_level: "beginner" | "intermediate" | "advanced";
      program_status: "draft" | "published" | "archived";
      run_type: "easy" | "tempo" | "intervals" | "long" | "recovery" | "race";
      start_rule: "rolling" | "fixed";
      subscription_status: "active" | "canceled" | "past_due";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
