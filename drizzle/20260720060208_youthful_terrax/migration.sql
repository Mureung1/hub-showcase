DROP INDEX "retrieval_examples_identity_unique";--> statement-breakpoint
ALTER TABLE "retrieval_examples" ADD CONSTRAINT "retrieval_examples_identity_pk" PRIMARY KEY("example_id","catalog_version","embedding_model");--> statement-breakpoint
ALTER TABLE "retrieval_examples" ADD CONSTRAINT "retrieval_examples_embedding_nonzero" CHECK (vector_norm("embedding") > 0);