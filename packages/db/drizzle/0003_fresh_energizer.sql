CREATE TABLE IF NOT EXISTS "x402_nonce" (
	"signature" text PRIMARY KEY NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
