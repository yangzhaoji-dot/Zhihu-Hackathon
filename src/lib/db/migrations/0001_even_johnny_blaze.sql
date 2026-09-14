CREATE TABLE "zhihu_oauth_login_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"browser_id_hash" text NOT NULL,
	"state_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zhihu_oauth_login_requests_state_hash_unique" UNIQUE("state_hash")
);
--> statement-breakpoint
CREATE TABLE "zhihu_oauth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_ciphertext" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"profile" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "zhihu_oauth_login_browser_idx" ON "zhihu_oauth_login_requests" USING btree ("browser_id_hash");--> statement-breakpoint
CREATE INDEX "zhihu_oauth_login_expires_idx" ON "zhihu_oauth_login_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "zhihu_oauth_session_expires_idx" ON "zhihu_oauth_sessions" USING btree ("token_expires_at");