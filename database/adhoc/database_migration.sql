-- Migration: Add approved_by_name column to manual_changes table
-- Execute this in Supabase SQL Editor

-- Step 1: Add the new column
ALTER TABLE manual_changes
ADD COLUMN approved_by_name TEXT;

-- Step 2: Verify the column was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'manual_changes' AND column_name = 'approved_by_name';

-- Expected result:
-- column_name        | data_type | is_nullable
-- approved_by_name   | text      | YES
