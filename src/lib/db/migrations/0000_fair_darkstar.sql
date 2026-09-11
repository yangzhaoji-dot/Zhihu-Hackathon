CREATE TABLE "exploration_progress" (
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"visited_npc_ids" text[] DEFAULT '{}' NOT NULL,
	"collected_opinion_ids" text[] DEFAULT '{}' NOT NULL,
	"found_source_ids" text[] DEFAULT '{}' NOT NULL,
	"fired_trigger_ids" text[] DEFAULT '{}' NOT NULL,
	"world_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exploration_progress_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(256),
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "stances" (
	"user_id" text NOT NULL,
	"opinion_id" text NOT NULL,
	"stance" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stances_user_id_opinion_id_pk" PRIMARY KEY("user_id","opinion_id")
);
--> statement-breakpoint
CREATE TABLE "judgements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"statement" text NOT NULL,
	"leaning" text,
	"agree_ids" text[] DEFAULT '{}' NOT NULL,
	"disagree_ids" text[] DEFAULT '{}' NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");