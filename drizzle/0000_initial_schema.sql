CREATE TYPE "public"."actor_type" AS ENUM('applicant', 'staff', 'system');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'in_review', 'more_info_required', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('retail', 'food', 'services', 'manufacturing', 'home_based');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('officer', 'manager');--> statement-breakpoint
CREATE SEQUENCE "public"."application_reference_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"nic_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicants_email_format" CHECK ("applicants"."email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"staff_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_events_staff_actor" CHECK (("application_events"."actor_type" = 'staff') = ("application_events"."staff_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"business_name" text,
	"business_type" "business_type",
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"postcode" text,
	"employees" integer,
	"starts_on" date,
	"applicant_id" uuid,
	"assigned_to" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_reference_unique" UNIQUE("reference"),
	CONSTRAINT "applications_employees_range" CHECK ("applications"."employees" IS NULL OR "applications"."employees" BETWEEN 0 AND 10000),
	CONSTRAINT "applications_complete_when_submitted" CHECK ("applications"."status" = 'draft' OR (
        "applications"."reference" IS NOT NULL AND "applications"."submitted_at" IS NOT NULL AND
        "applications"."applicant_id" IS NOT NULL AND "applications"."business_name" IS NOT NULL AND
        "applications"."business_type" IS NOT NULL AND "applications"."address_line_1" IS NOT NULL AND
        "applications"."city" IS NOT NULL AND "applications"."postcode" IS NOT NULL AND
        "applications"."employees" IS NOT NULL AND "applications"."starts_on" IS NOT NULL
      )),
	CONSTRAINT "applications_decided_at_matches_status" CHECK (("applications"."status" IN ('approved', 'rejected')) = ("applications"."decided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_to_staff_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applicants_email_lower_idx" ON "applicants" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "application_events_application_idx" ON "application_events" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "applications_status_submitted_idx" ON "applications" USING btree ("status","submitted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "applications_applicant_idx" ON "applications" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "applications_business_name_lower_idx" ON "applications" USING btree (lower("business_name"));--> statement-breakpoint
CREATE INDEX "staff_sessions_staff_id_idx" ON "staff_sessions" USING btree ("staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_email_lower_key" ON "staff_users" USING btree (lower("email"));