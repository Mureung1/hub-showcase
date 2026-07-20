CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "retrieval_examples" (
	"example_id" varchar(96) NOT NULL,
	"catalog_version" varchar(64) NOT NULL,
	"embedding_model" varchar(128) NOT NULL,
	"scenario_id" "scenario_id" NOT NULL,
	"purpose_id" "purpose_id" NOT NULL,
	"mode" "message_mode" NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"review_status" "review_status" NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "retrieval_examples_example_id_nonempty" CHECK (length(trim("example_id")) > 0),
	CONSTRAINT "retrieval_examples_catalog_version_nonempty" CHECK (length(trim("catalog_version")) > 0),
	CONSTRAINT "retrieval_examples_embedding_model_nonempty" CHECK (length(trim("embedding_model")) > 0),
	CONSTRAINT "retrieval_examples_checksum_sha256" CHECK ("checksum" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "retrieval_examples_identity_unique" ON "retrieval_examples" ("example_id","catalog_version","embedding_model");--> statement-breakpoint
CREATE INDEX "retrieval_examples_filter_idx" ON "retrieval_examples" ("catalog_version","embedding_model","review_status","scenario_id","purpose_id","mode");
