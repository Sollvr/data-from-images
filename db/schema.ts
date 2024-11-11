import { pgTable, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  email_verified: boolean("email_verified").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
});

export const verification_tokens = pgTable("verification_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").references(() => users.id),
  token: text("token").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const extractions = pgTable("extractions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").references(() => users.id),
  image_url: text("image_url").notNull(),
  extracted_text: text("extracted_text").notNull(),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").references(() => users.id),
  extraction_id: integer("extraction_id").references(() => extractions.id),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
});

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertVerificationTokenSchema = createInsertSchema(verification_tokens);
export const selectVerificationTokenSchema = createSelectSchema(verification_tokens);
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;
export type VerificationToken = z.infer<typeof selectVerificationTokenSchema>;

export const insertExtractionSchema = createInsertSchema(extractions);
export const selectExtractionSchema = createSelectSchema(extractions);
export type InsertExtraction = z.infer<typeof insertExtractionSchema>;
export type Extraction = z.infer<typeof selectExtractionSchema>;

export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = z.infer<typeof selectTagSchema>;
