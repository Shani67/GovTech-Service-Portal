import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const applicationStatus = pgEnum("application_status", [
  "draft",
  "submitted",
  "in_review",
  "more_info_required",
  "approved",
  "rejected",
]);

export const businessType = pgEnum("business_type", [
  "retail",
  "food",
  "services",
  "manufacturing",
  "home_based",
]);

export const staffRole = pgEnum("staff_role", ["officer", "manager"]);

export const actorType = pgEnum("actor_type", ["applicant", "staff", "system"]);

/** Feeds human-readable references such as TL-2026-000123. */
export const referenceSequence = pgSequence("application_reference_seq", { startWith: 1 });

export const applicants = pgTable(
  "applicants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    nicNumber: text("nic_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Tracking looks applicants up by email regardless of case.
    index("applicants_email_lower_idx").on(sql`lower(${table.email})`),
    check("applicants_email_format", sql`${table.email} ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`),
  ],
);

export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: staffRole("role").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("staff_users_email_lower_key").on(sql`lower(${table.email})`)],
);

export const staffSessions = pgTable(
  "staff_sessions",
  {
    // SHA-256 of the session token: a leaked database row cannot be used as a cookie.
    tokenHash: text("token_hash").primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("staff_sessions_staff_id_idx").on(table.staffId)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").unique(),
    status: applicationStatus("status").notNull().default("draft"),
    businessName: text("business_name"),
    businessType: businessType("business_type"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    postcode: text("postcode"),
    employees: integer("employees"),
    startsOn: date("starts_on"),
    applicantId: uuid("applicant_id").references(() => applicants.id, { onDelete: "restrict" }),
    assignedTo: uuid("assigned_to").references(() => staffUsers.id, { onDelete: "set null" }),
    // Optimistic locking: every status change must name the version it read.
    version: integer("version").notNull().default(1),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("applications_status_submitted_idx").on(table.status, table.submittedAt.desc()),
    index("applications_applicant_idx").on(table.applicantId),
    index("applications_business_name_lower_idx").on(sql`lower(${table.businessName})`),
    check(
      "applications_employees_range",
      sql`${table.employees} IS NULL OR ${table.employees} BETWEEN 0 AND 10000`,
    ),
    // Drafts can be incomplete. Anything past draft must be a complete, referenced application.
    check(
      "applications_complete_when_submitted",
      sql`${table.status} = 'draft' OR (
        ${table.reference} IS NOT NULL AND ${table.submittedAt} IS NOT NULL AND
        ${table.applicantId} IS NOT NULL AND ${table.businessName} IS NOT NULL AND
        ${table.businessType} IS NOT NULL AND ${table.addressLine1} IS NOT NULL AND
        ${table.city} IS NOT NULL AND ${table.postcode} IS NOT NULL AND
        ${table.employees} IS NOT NULL AND ${table.startsOn} IS NOT NULL
      )`,
    ),
    check(
      "applications_decided_at_matches_status",
      sql`(${table.status} IN ('approved', 'rejected')) = (${table.decidedAt} IS NOT NULL)`,
    ),
  ],
);

/** Append-only audit log of every status change. */
export const applicationEvents = pgTable(
  "application_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),
    actorType: actorType("actor_type").notNull(),
    staffId: uuid("staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("application_events_application_idx").on(table.applicationId, table.createdAt),
    check(
      "application_events_staff_actor",
      sql`(${table.actorType} = 'staff') = (${table.staffId} IS NOT NULL)`,
    ),
  ],
);

export type Application = typeof applications.$inferSelect;
export type Applicant = typeof applicants.$inferSelect;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type StaffUser = typeof staffUsers.$inferSelect;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
export type BusinessType = (typeof businessType.enumValues)[number];
export type StaffRole = (typeof staffRole.enumValues)[number];
