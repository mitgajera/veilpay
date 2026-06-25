CREATE TYPE "public"."request_status" AS ENUM('open', 'paid', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "auth_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_address" text NOT NULL,
	"label" text NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexed_txs" (
	"signature" text PRIMARY KEY NOT NULL,
	"slot" bigint NOT NULL,
	"kind" text NOT NULL,
	"mint" text,
	"from_address" text,
	"to_address" text,
	"public_amount" bigint,
	"encrypted" boolean DEFAULT false NOT NULL,
	"block_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mints" (
	"mint" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"decimals" integer NOT NULL,
	"logo_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_address" text PRIMARY KEY NOT NULL,
	"transfer_received" boolean DEFAULT true NOT NULL,
	"deposit_confirmed" boolean DEFAULT true NOT NULL,
	"request_paid" boolean DEFAULT true NOT NULL,
	"audit_granted" boolean DEFAULT true NOT NULL,
	"web_push_enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_address" text NOT NULL,
	"payer_address" text,
	"mint" text NOT NULL,
	"amount" bigint,
	"memo" text,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"fulfilled_signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"address" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_nonces_address_idx" ON "auth_nonces" USING btree ("address");--> statement-breakpoint
CREATE INDEX "contacts_owner_idx" ON "contacts" USING btree ("owner_address");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_owner_address_uq" ON "contacts" USING btree ("owner_address","address");--> statement-breakpoint
CREATE INDEX "txs_from_idx" ON "indexed_txs" USING btree ("from_address","slot");--> statement-breakpoint
CREATE INDEX "txs_to_idx" ON "indexed_txs" USING btree ("to_address","slot");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_address","created_at");--> statement-breakpoint
CREATE INDEX "requests_creator_idx" ON "payment_requests" USING btree ("creator_address");--> statement-breakpoint
CREATE INDEX "requests_payer_idx" ON "payment_requests" USING btree ("payer_address");--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");