-- ====================================================================
-- AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER
-- Migration: 008_checklist_attachments.sql
-- Description: Add attachment_url, attachment_name, and attachment_type 
--              columns to task_checklists table for online links and files.
-- ====================================================================

-- 1. Add attachment fields to task_checklists
ALTER TABLE task_checklists ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE task_checklists ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE task_checklists ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 2. Populate sample links for demo checklist items if null
UPDATE task_checklists
SET 
  attachment_url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  attachment_name = 'OCCM_Harvest_Manual.pdf',
  attachment_type = 'pdf'
WHERE id = 'c1111111-1111-1111-1111-111111111111' AND attachment_url IS NULL;

UPDATE task_checklists
SET 
  attachment_url = 'https://docs.google.com/spreadsheets/d/sample/export?format=xlsx',
  attachment_name = 'Hard_Time_Components_Tracker.xlsx',
  attachment_type = 'excel'
WHERE id = 'c2222222-2222-2222-2222-222222222222' AND attachment_url IS NULL;
