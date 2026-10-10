-- ====================================================================
-- AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER
-- Migration: 007_update_aircraft_fields.sql
-- Description: Add date_of_manufacture and owner_lessor_operator columns
--              to aircraft table with automatic bidirectional sync trigger.
-- ====================================================================

-- 1. Add date_of_manufacture and owner_lessor_operator columns to aircraft table
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS date_of_manufacture TEXT;
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS owner_lessor_operator TEXT;

-- 2. Backfill existing rows
UPDATE aircraft 
SET date_of_manufacture = registration 
WHERE date_of_manufacture IS NULL AND registration IS NOT NULL;

UPDATE aircraft 
SET owner_lessor_operator = owner 
WHERE owner_lessor_operator IS NULL AND owner IS NOT NULL;

-- 3. Make legacy columns nullable to allow inserting via either column name
ALTER TABLE aircraft ALTER COLUMN registration DROP NOT NULL;
ALTER TABLE aircraft ALTER COLUMN owner DROP NOT NULL;

-- 4. Create trigger function to keep date_of_manufacture <-> registration and owner_lessor_operator <-> owner synchronized
CREATE OR REPLACE FUNCTION sync_aircraft_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize Date of Manufacture / Registration
    IF NEW.date_of_manufacture IS NOT NULL AND (NEW.registration IS NULL OR NEW.registration = '') THEN
        NEW.registration := NEW.date_of_manufacture;
    ELSIF NEW.registration IS NOT NULL AND (NEW.date_of_manufacture IS NULL OR NEW.date_of_manufacture = '') THEN
        NEW.date_of_manufacture := NEW.registration;
    END IF;

    -- Synchronize Owner / Lessor / Operator
    IF NEW.owner_lessor_operator IS NOT NULL AND (NEW.owner IS NULL OR NEW.owner = '') THEN
        NEW.owner := NEW.owner_lessor_operator;
    ELSIF NEW.owner IS NOT NULL AND (NEW.owner_lessor_operator IS NULL OR NEW.owner_lessor_operator = '') THEN
        NEW.owner_lessor_operator := NEW.owner;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_aircraft_fields ON aircraft;
CREATE TRIGGER trg_sync_aircraft_fields
BEFORE INSERT OR UPDATE ON aircraft
FOR EACH ROW
EXECUTE FUNCTION sync_aircraft_fields();
