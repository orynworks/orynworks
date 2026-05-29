DO $$ BEGIN
 CREATE TYPE "public"."usage_event_type" AS ENUM('call', 'query');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capability_id" uuid NOT NULL,
	"caller_address" text NOT NULL,
	"event_type" "usage_event_type" NOT NULL,
	"request_hash" text NOT NULL,
	"success" boolean NOT NULL,
	"latency_ms" integer,
	"error_code" text,
	"cost_usdc" numeric(10, 6) DEFAULT '0' NOT NULL,
	"billed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_capability_id_capability_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capability"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
