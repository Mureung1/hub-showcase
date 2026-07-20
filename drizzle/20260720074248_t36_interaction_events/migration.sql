CREATE TYPE "interaction_event_name" AS ENUM('result_shown', 'refinement_opened', 'regeneration_requested', 'copy_succeeded', 'situation_change');--> statement-breakpoint
CREATE TYPE "interaction_result_route" AS ENUM('template_fallback', 'guided_ai', 'manual_ai', 'email_template');--> statement-breakpoint
CREATE TYPE "situation_id" AS ENUM('schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'contribution_check', 'absence_inquiry', 'casual_request', 'express_feelings');--> statement-breakpoint
CREATE TABLE "interaction_events" (
	"event_name" "interaction_event_name" NOT NULL,
	"route" "interaction_result_route" NOT NULL,
	"scenario_id" "scenario_id" NOT NULL,
	"mode" "message_mode" NOT NULL,
	"situation_id" "situation_id",
	"tone_level" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interaction_events_route_situation_boundary" CHECK (("route" in ('guided_ai', 'template_fallback') and "situation_id" is not null) or ("route" in ('manual_ai', 'email_template') and "situation_id" is null)),
	CONSTRAINT "interaction_events_scenario_situation_boundary" CHECK ("situation_id" is null or "situation_id" in ('schedule', 'thanks_check', 'ask', 'apologize', 'decline') or ("scenario_id" = 'groupwork' and "situation_id" = 'contribution_check') or ("scenario_id" = 'professor' and "situation_id" = 'absence_inquiry') or ("scenario_id" = 'senior' and "situation_id" = 'casual_request') or ("scenario_id" = 'friend' and "situation_id" = 'express_feelings')),
	CONSTRAINT "interaction_events_copy_tone_boundary" CHECK (("event_name" = 'copy_succeeded' and "tone_level" is not null and "tone_level" between 1 and 3) or ("event_name" <> 'copy_succeeded' and "tone_level" is null)),
	CONSTRAINT "interaction_events_email_professor_boundary" CHECK ("route" <> 'email_template' or "scenario_id" = 'professor')
);
--> statement-breakpoint
CREATE INDEX "interaction_events_created_at_idx" ON "interaction_events" ("created_at");--> statement-breakpoint
CREATE INDEX "interaction_events_route_created_at_idx" ON "interaction_events" ("route","created_at");--> statement-breakpoint
CREATE INDEX "interaction_events_scenario_created_at_idx" ON "interaction_events" ("scenario_id","created_at");
