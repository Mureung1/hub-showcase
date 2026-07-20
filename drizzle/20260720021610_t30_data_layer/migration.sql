CREATE TYPE "generation_route" AS ENUM('ai', 'template');--> statement-breakpoint
CREATE TYPE "generation_status" AS ENUM('deadline_exceeded', 'invalid_request', 'invalid_response', 'provider_client_error', 'provider_error', 'provider_rate_limited', 'provider_transient_error', 'provider_unconfigured', 'rate_limited', 'success', 'unsafe_response');--> statement-breakpoint
CREATE TYPE "message_mode" AS ENUM('reply', 'initiate');--> statement-breakpoint
CREATE TYPE "purpose_id" AS ENUM('ask', 'apologize', 'decline', 'question', 'suggest', 'other');--> statement-breakpoint
CREATE TYPE "review_status" AS ENUM('draft', 'approved', 'retired');--> statement-breakpoint
CREATE TYPE "scenario_id" AS ENUM('groupwork', 'professor', 'senior', 'friend');--> statement-breakpoint
CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"case_id" varchar(96) NOT NULL,
	"model" varchar(128) NOT NULL,
	"prompt_version_id" uuid NOT NULL,
	"repetition" smallint NOT NULL,
	"sample_count" integer NOT NULL,
	"quality_score_basis_points" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost_micro_usd" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_runs_case_id_nonempty" CHECK (length(trim("case_id")) > 0),
	CONSTRAINT "evaluation_runs_model_nonempty" CHECK (length(trim("model")) > 0),
	CONSTRAINT "evaluation_runs_repetition_nonnegative" CHECK ("repetition" >= 0),
	CONSTRAINT "evaluation_runs_sample_count_positive" CHECK ("sample_count" > 0),
	CONSTRAINT "evaluation_runs_quality_score_basis_points_range" CHECK ("quality_score_basis_points" between 0 and 10000),
	CONSTRAINT "evaluation_runs_latency_nonnegative" CHECK ("latency_ms" >= 0),
	CONSTRAINT "evaluation_runs_input_tokens_nonnegative" CHECK ("input_tokens" is null or "input_tokens" >= 0),
	CONSTRAINT "evaluation_runs_output_tokens_nonnegative" CHECK ("output_tokens" is null or "output_tokens" >= 0),
	CONSTRAINT "evaluation_runs_estimated_cost_nonnegative" CHECK ("estimated_cost_micro_usd" is null or "estimated_cost_micro_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"route" "generation_route" NOT NULL,
	"scenario_id" "scenario_id",
	"mode" "message_mode",
	"purpose_id" "purpose_id",
	"status" "generation_status" NOT NULL,
	"model" varchar(128),
	"prompt_version_id" uuid,
	"template_version_id" uuid,
	"latency_ms" integer NOT NULL,
	"attempt_count" smallint NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_runs_latency_nonnegative" CHECK ("latency_ms" >= 0),
	CONSTRAINT "generation_runs_attempt_count_nonnegative" CHECK ("attempt_count" >= 0),
	CONSTRAINT "generation_runs_input_tokens_nonnegative" CHECK ("input_tokens" is null or "input_tokens" >= 0),
	CONSTRAINT "generation_runs_output_tokens_nonnegative" CHECK ("output_tokens" is null or "output_tokens" >= 0),
	CONSTRAINT "generation_runs_model_nonempty" CHECK ("model" is null or length(trim("model")) > 0),
	CONSTRAINT "generation_runs_route_version_boundary" CHECK (("route" = 'ai' and "template_version_id" is null) or ("route" = 'template' and "prompt_version_id" is null and "model" is null and "purpose_id" is null))
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"version" varchar(64) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"model" varchar(128) NOT NULL,
	"max_output_tokens" integer NOT NULL,
	"temperature_milli" smallint,
	"review_status" "review_status" DEFAULT 'draft'::"review_status" NOT NULL,
	"reviewed_at" timestamp with time zone,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompt_versions_version_nonempty" CHECK (length(trim("version")) > 0),
	CONSTRAINT "prompt_versions_checksum_sha256" CHECK ("checksum" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "prompt_versions_model_nonempty" CHECK (length(trim("model")) > 0),
	CONSTRAINT "prompt_versions_max_output_tokens_positive" CHECK ("max_output_tokens" > 0),
	CONSTRAINT "prompt_versions_temperature_milli_range" CHECK ("temperature_milli" is null or "temperature_milli" between 0 and 2000),
	CONSTRAINT "prompt_versions_approved_has_review_time" CHECK ("review_status" <> 'approved' or "reviewed_at" is not null),
	CONSTRAINT "prompt_versions_active_is_approved" CHECK ("is_active" = false or "review_status" = 'approved')
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"version" varchar(64) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"review_status" "review_status" DEFAULT 'draft'::"review_status" NOT NULL,
	"reviewed_at" timestamp with time zone,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_versions_version_nonempty" CHECK (length(trim("version")) > 0),
	CONSTRAINT "template_versions_checksum_sha256" CHECK ("checksum" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "template_versions_approved_has_review_time" CHECK ("review_status" <> 'approved' or "reviewed_at" is not null),
	CONSTRAINT "template_versions_active_is_approved" CHECK ("is_active" = false or "review_status" = 'approved')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_runs_case_model_prompt_repeat_unique" ON "evaluation_runs" ("case_id","model","prompt_version_id","repetition");--> statement-breakpoint
CREATE INDEX "evaluation_runs_prompt_version_created_at_idx" ON "evaluation_runs" ("prompt_version_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_runs_created_at_idx" ON "generation_runs" ("created_at");--> statement-breakpoint
CREATE INDEX "generation_runs_status_created_at_idx" ON "generation_runs" ("status","created_at");--> statement-breakpoint
CREATE INDEX "generation_runs_prompt_version_created_at_idx" ON "generation_runs" ("prompt_version_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_runs_scenario_created_at_idx" ON "generation_runs" ("scenario_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_versions_version_unique" ON "prompt_versions" ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_versions_single_active" ON "prompt_versions" ("is_active") WHERE "is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "template_versions_version_unique" ON "template_versions" ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "template_versions_single_active" ON "template_versions" ("is_active") WHERE "is_active" = true;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_prompt_version_id_prompt_versions_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_prompt_version_id_prompt_versions_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_template_version_id_template_versions_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "template_versions"("id") ON DELETE RESTRICT;