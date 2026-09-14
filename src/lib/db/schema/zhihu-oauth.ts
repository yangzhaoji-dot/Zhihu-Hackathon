import type { InferSelectModel } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type ZhihuOAuthProfile = {
  id: string;
  fullname: string | null;
  headline: string | null;
  avatarUrl: string | null;
};

export const zhihuOAuthLoginRequests = pgTable(
  "zhihu_oauth_login_requests",
  {
    id: text("id").primaryKey(),
    browserIdHash: text("browser_id_hash").notNull(),
    stateHash: text("state_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    browserIdx: index("zhihu_oauth_login_browser_idx").on(table.browserIdHash),
    expiresIdx: index("zhihu_oauth_login_expires_idx").on(table.expiresAt),
  })
);

export const zhihuOAuthSessions = pgTable(
  "zhihu_oauth_sessions",
  {
    id: text("id").primaryKey(),
    tokenCiphertext: text("token_ciphertext").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    profile: jsonb("profile").$type<ZhihuOAuthProfile>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    expiresIdx: index("zhihu_oauth_session_expires_idx").on(table.tokenExpiresAt),
  })
);

export type ZhihuOAuthSession = InferSelectModel<typeof zhihuOAuthSessions>;
