-- Migration: 009_enable_supabase_realtime.sql
-- Description: Add all aircraft task planner tables to supabase_realtime publication and set REPLICA IDENTITY FULL

DO $$
BEGIN
  -- Add tables to supabase_realtime publication if not already added
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_checklists') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_checklists;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_attachments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_attachments;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_dependencies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_dependencies;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_buckets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_buckets;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'aircraft') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE aircraft;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'teams') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE teams;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lifecycle_stages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lifecycle_stages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'repair_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE repair_orders;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'in_app_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'companies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE companies;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'repair_order_columns') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE repair_order_columns;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL so UPDATE/DELETE events deliver complete records
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE project_buckets REPLICA IDENTITY FULL;
ALTER TABLE task_checklists REPLICA IDENTITY FULL;
ALTER TABLE task_attachments REPLICA IDENTITY FULL;
ALTER TABLE task_dependencies REPLICA IDENTITY FULL;
ALTER TABLE task_comments REPLICA IDENTITY FULL;
ALTER TABLE aircraft REPLICA IDENTITY FULL;
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE lifecycle_stages REPLICA IDENTITY FULL;
ALTER TABLE companies REPLICA IDENTITY FULL;
ALTER TABLE repair_orders REPLICA IDENTITY FULL;
ALTER TABLE repair_order_columns REPLICA IDENTITY FULL;
ALTER TABLE in_app_notifications REPLICA IDENTITY FULL;
ALTER TABLE activity_logs REPLICA IDENTITY FULL;
ALTER TABLE audit_logs REPLICA IDENTITY FULL;
