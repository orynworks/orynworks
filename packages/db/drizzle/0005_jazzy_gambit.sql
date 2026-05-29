ALTER TABLE "usage_event" ADD COLUMN "settled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_event" ADD COLUMN "settled_tx" text;