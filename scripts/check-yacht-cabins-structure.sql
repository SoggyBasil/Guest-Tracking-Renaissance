-- Check the structure of yacht_cabins table
-- Run this first to see what columns actually exist

-- Check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'yacht_cabins'
) as table_exists;

-- If table exists, show its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'yacht_cabins'
ORDER BY ordinal_position;

-- Show sample data to understand current structure
SELECT * FROM yacht_cabins LIMIT 3;
