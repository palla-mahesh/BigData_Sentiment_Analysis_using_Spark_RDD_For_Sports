import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // ADMIN | ANALYST | USER
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull().default('Sports Analyst'),
    photoUrl: text('photo_url'),
    roleId: integer('role_id')
      .references(() => roles.id)
      .notNull(),
    roleName: text('role_name').notNull().default('ANALYST'),
    lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('users_email_idx').on(table.email)],
);

export const sports = pgTable('sports', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull().unique(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  imagePath: text('image_path').notNull(),
  accentColor: text('accent_color').notNull().default('#3B82F6'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dataSources = pgTable('data_sources', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  providerType: text('provider_type').notNull(), // MANUAL | CSV | TXT | DEMO_CORPUS | YOUTUBE_API | REDDIT_API
  isDemo: boolean('is_demo').notNull().default(false),
  isEnabled: boolean('is_enabled').notNull().default(true),
  configNotes: text('config_notes').notNull().default(''),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const analysisJobs = pgTable(
  'analysis_jobs',
  {
    id: serial('id').primaryKey(),
    jobUid: text('job_uid').notNull().unique(),
    userId: integer('user_id').references(() => users.id),
    sportId: integer('sport_id').references(() => sports.id),
    sourceId: integer('source_id')
      .references(() => dataSources.id)
      .notNull(),
    status: text('status').notNull().default('QUEUED'), // QUEUED | RUNNING | COMPLETED | FAILED
    totalRecords: integer('total_records').notNull().default(0),
    processedRecords: integer('processed_records').notNull().default(0),
    rddPartitions: integer('rdd_partitions').notNull().default(4),
    durationMs: integer('duration_ms').notNull().default(0),
    stageMetrics: jsonb('stage_metrics').$type<Record<string, unknown>>().default({}),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('analysis_jobs_status_idx').on(table.status)],
);

export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    sportId: integer('sport_id')
      .references(() => sports.id)
      .notNull(),
    sourceId: integer('source_id')
      .references(() => dataSources.id)
      .notNull(),
    jobId: integer('job_id').references(() => analysisJobs.id),
    userId: integer('user_id').references(() => users.id),
    authorHandle: text('author_handle').notNull().default('@fan_analyst'),
    rawText: text('raw_text').notNull(),
    normalizedText: text('normalized_text').notNull(),
    tokenCount: integer('token_count').notNull().default(0),
    isDemo: boolean('is_demo').notNull().default(false),
    commentedAt: timestamp('commented_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('comments_sport_idx').on(table.sportId),
    index('comments_commented_at_idx').on(table.commentedAt),
  ],
);

export const sentimentResults = pgTable(
  'sentiment_results',
  {
    id: serial('id').primaryKey(),
    commentId: integer('comment_id')
      .references(() => comments.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    polarity: text('polarity').notNull(), // POSITIVE | NEGATIVE | NEUTRAL
    score: real('score').notNull(), // -100 to +100
    confidence: real('confidence').notNull(), // 0.0 to 1.0
    matchedTokens: jsonb('matched_tokens').$type<string[]>().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('sentiment_polarity_idx').on(table.polarity)],
);

export const emotionResults = pgTable(
  'emotion_results',
  {
    id: serial('id').primaryKey(),
    commentId: integer('comment_id')
      .references(() => comments.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    joy: real('joy').notNull().default(0),
    anger: real('anger').notNull().default(0),
    sadness: real('sadness').notNull().default(0),
    excitement: real('excitement').notNull().default(0),
    fear: real('fear').notNull().default(0),
    surprise: real('surprise').notNull().default(0),
    dominantEmotion: text('dominant_emotion').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('emotion_dominant_idx').on(table.dominantEmotion)],
);

export const keywords = pgTable(
  'keywords',
  {
    id: serial('id').primaryKey(),
    commentId: integer('comment_id')
      .references(() => comments.id, { onDelete: 'cascade' })
      .notNull(),
    sportId: integer('sport_id')
      .references(() => sports.id)
      .notNull(),
    keyword: text('keyword').notNull(),
    frequency: integer('frequency').notNull().default(1),
    weight: real('weight').notNull().default(1),
    polarity: text('polarity').notNull().default('NEUTRAL'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('keywords_sport_keyword_idx').on(table.sportId, table.keyword),
  ],
);

export const aspects = pgTable(
  'aspects',
  {
    id: serial('id').primaryKey(),
    commentId: integer('comment_id')
      .references(() => comments.id, { onDelete: 'cascade' })
      .notNull(),
    sportId: integer('sport_id')
      .references(() => sports.id)
      .notNull(),
    aspectName: text('aspect_name').notNull(), // Teams | Players | Performance | Strategy | Coaching | Match Results
    polarity: text('polarity').notNull(),
    score: real('score').notNull(),
    confidence: real('confidence').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('aspects_sport_name_idx').on(table.sportId, table.aspectName),
  ],
);

export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id),
  totalComments: integer('total_comments').notNull().default(0),
  positiveCount: integer('positive_count').notNull().default(0),
  negativeCount: integer('negative_count').notNull().default(0),
  neutralCount: integer('neutral_count').notNull().default(0),
  avgScore: real('avg_score').notNull().default(0),
  dominantEmotion: text('dominant_emotion').notNull().default('Excitement'),
  topKeyword: text('top_keyword').notNull().default('victory'),
  snapshotAt: timestamp('snapshot_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    actorEmail: text('actor_email').notNull().default('system'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull().default(''),
    details: jsonb('details').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('audit_logs_created_idx').on(table.createdAt)],
);

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  comments: many(comments),
  analysisJobs: many(analysisJobs),
}));

export const sportsRelations = relations(sports, ({ many }) => ({
  comments: many(comments),
  keywords: many(keywords),
  aspects: many(aspects),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  sport: one(sports, {
    fields: [comments.sportId],
    references: [sports.id],
  }),
  source: one(dataSources, {
    fields: [comments.sourceId],
    references: [dataSources.id],
  }),
  sentiment: one(sentimentResults, {
    fields: [comments.id],
    references: [sentimentResults.commentId],
  }),
  emotion: one(emotionResults, {
    fields: [comments.id],
    references: [emotionResults.commentId],
  }),
  keywords: many(keywords),
  aspects: many(aspects),
}));
