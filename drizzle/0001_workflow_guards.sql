-- Database-level guards. The application checks these rules too, but the database is the
-- last line of defence against bugs, scripts and manual SQL.

-- 1. Only allow status changes that the licensing workflow permits.
CREATE FUNCTION enforce_application_status_transition() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status = 'submitted') OR
    (OLD.status = 'submitted' AND NEW.status = 'in_review') OR
    (OLD.status = 'in_review' AND NEW.status IN ('more_info_required', 'approved', 'rejected')) OR
    (OLD.status = 'more_info_required' AND NEW.status = 'in_review')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER applications_status_transition
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION enforce_application_status_transition();
--> statement-breakpoint
-- 2. The audit log is append-only.
CREATE FUNCTION reject_audit_log_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'application_events is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER application_events_append_only
  BEFORE UPDATE ON application_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_log_changes();
