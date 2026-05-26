DO $$ BEGIN
 CREATE TYPE "public"."wallet_role" AS ENUM('builder', 'operator', 'both');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"role" "wallet_role" DEFAULT 'both' NOT NULL,
	"display_name" text,
	"bio" text,
	"twitter" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_address_unique" UNIQUE("address")
);
