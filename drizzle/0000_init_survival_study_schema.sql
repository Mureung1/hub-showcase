CREATE TYPE "public"."challenge_kind" AS ENUM('official', 'user');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('recruiting', 'in_progress', 'ended', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."deposit_kind" AS ENUM('cash', 'point');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."point_txn_type" AS ENUM('challenge_complete', 'streak_bonus', 'retrospective_bonus', 'invite_bonus', 'challenge_join', 'challenge_create', 'revival_purchase', 'reward_distribution', 'entry_discount', 'refund_adjustment');--> statement-breakpoint
CREATE TYPE "public"."survival_status" AS ENUM('alive', 'eliminated', 'completed');--> statement-breakpoint
CREATE TYPE "public"."verification_state" AS ENUM('pending', 'completed', 'missed');--> statement-breakpoint
CREATE TYPE "public"."visibility_scope" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"challenge_id" uuid,
	"badge_type" text NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_badge" UNIQUE("user_id","challenge_id","badge_type")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"kind" "challenge_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"host_id" uuid,
	"status" "challenge_status" DEFAULT 'recruiting' NOT NULL,
	"visibility" "visibility_scope" DEFAULT 'public' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"daily_study_minutes" integer NOT NULL,
	"verification_deadline_time" time NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"capacity" integer NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"deposit_kind" "deposit_kind" NOT NULL,
	"entry_amount" numeric(14, 2) NOT NULL,
	"service_fee_rate" numeric(5, 4) DEFAULT '0.10' NOT NULL,
	"distribution_rule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"no_winner_policy" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_dates" CHECK ("challenges"."end_date" >= "challenges"."start_date"),
	CONSTRAINT "valid_capacity" CHECK ("challenges"."capacity" > 0 AND "challenges"."participant_count" >= 0 AND "challenges"."participant_count" <= "challenges"."capacity"),
	CONSTRAINT "valid_amount" CHECK ("challenges"."entry_amount" >= 0),
	CONSTRAINT "kind_deposit_consistency" CHECK (
    ("challenges"."kind" = 'official' AND "challenges"."deposit_kind" = 'cash')
    OR ("challenges"."kind" = 'user' AND "challenges"."deposit_kind" = 'point' AND "challenges"."host_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "daily_verifications" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"participation_id" uuid NOT NULL,
	"verify_date" date NOT NULL,
	"daily_goal" text,
	"accumulated_seconds" integer DEFAULT 0 NOT NULL,
	"study_goal_met" boolean DEFAULT false NOT NULL,
	"retrospective" text,
	"evidence_path" text,
	"state" "verification_state" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_daily" UNIQUE("participation_id","verify_date"),
	CONSTRAINT "accum_non_negative" CHECK ("daily_verifications"."accumulated_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_reports" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"participation_id" uuid NOT NULL,
	"report_data" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_reports_participation_id_unique" UNIQUE("participation_id")
);
--> statement-breakpoint
CREATE TABLE "participations" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"survival_status" "survival_status" DEFAULT 'alive' NOT NULL,
	"deposit_kind" "deposit_kind" NOT NULL,
	"deposit_amount" numeric(14, 2) NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"eliminated_on" date,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_participation" UNIQUE("challenge_id","user_id"),
	CONSTRAINT "deposit_non_negative" CHECK ("participations"."deposit_amount" >= 0),
	CONSTRAINT "elim_date_consistency" CHECK (
    ("participations"."survival_status" = 'eliminated' AND "participations"."eliminated_on" IS NOT NULL)
    OR ("participations"."survival_status" <> 'eliminated'))
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"challenge_id" uuid,
	"participation_id" uuid,
	"direction" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"point_discount" bigint DEFAULT 0 NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_external_ref_unique" UNIQUE("external_ref"),
	CONSTRAINT "direction_check" CHECK ("payment_transactions"."direction" IN ('charge', 'refund')),
	CONSTRAINT "amount_non_negative" CHECK ("payment_transactions"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"txn_type" "point_txn_type" NOT NULL,
	"amount" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"reason" text NOT NULL,
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_after_non_negative" CHECK ("point_transactions"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "point_wallets" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_wallets_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "wallet_non_negative" CHECK ("point_wallets"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"invited_by" uuid,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "revival_tickets" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"participation_id" uuid,
	"point_cost" bigint NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "point_cost_non_negative" CHECK ("revival_tickets"."point_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reward_pools" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"deposit_kind" "deposit_kind" NOT NULL,
	"total_deposit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"pool_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"service_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "reward_pools_challenge_id_unique" UNIQUE("challenge_id"),
	CONSTRAINT "pool_non_negative" CHECK ("reward_pools"."pool_amount" >= 0 AND "reward_pools"."total_deposit" >= 0)
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"participation_id" uuid NOT NULL,
	"refund_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reward_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settle_non_negative" CHECK ("settlements"."refund_amount" >= 0 AND "settlements"."reward_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "surprise_missions" (
	"id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"active_from" timestamp with time zone DEFAULT now() NOT NULL,
	"active_until" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_host_id_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_verifications" ADD CONSTRAINT "daily_verifications_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_wallet_id_point_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."point_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_wallets" ADD CONSTRAINT "point_wallets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revival_tickets" ADD CONSTRAINT "revival_tickets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revival_tickets" ADD CONSTRAINT "revival_tickets_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_pools" ADD CONSTRAINT "reward_pools_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surprise_missions" ADD CONSTRAINT "surprise_missions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surprise_missions" ADD CONSTRAINT "surprise_missions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_challenges_open" ON "challenges" USING btree ("kind","status") WHERE "challenges"."status" = 'recruiting';--> statement-breakpoint
CREATE INDEX "idx_dv_date_state" ON "daily_verifications" USING btree ("verify_date","state");--> statement-breakpoint
CREATE INDEX "idx_part_challenge" ON "participations" USING btree ("challenge_id","survival_status");--> statement-breakpoint
CREATE INDEX "idx_pt_user" ON "point_transactions" USING btree ("user_id","created_at");