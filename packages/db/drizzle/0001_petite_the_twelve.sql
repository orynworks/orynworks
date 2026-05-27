DO $$ BEGIN
 CREATE TYPE "public"."capability_status" AS ENUM('draft', 'published', 'deprecated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."capability_type" AS ENUM('skill', 'knowledge');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "capability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"type" "capability_type" NOT NULL,
	"builder_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"host_url" text NOT NULL,
	"price_usdc" numeric(10, 6) DEFAULT '0' NOT NULL,
	"token_gated" boolean DEFAULT false NOT NULL,
	"required_token" text,
	"status" "capability_status" DEFAULT 'draft' NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"metadata_uri" text,
	"onchain_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capability_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "capability" ADD CONSTRAINT "capability_builder_id_wallet_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."wallet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
