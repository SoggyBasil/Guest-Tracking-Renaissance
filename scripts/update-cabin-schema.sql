-- Update yacht_cabins table to support two guests per cabin
-- Add second guest_id column and update related functionality

-- First, rename the existing guest_id to guest_id_1 for clarity
ALTER TABLE yacht_cabins RENAME COLUMN guest_id TO guest_id_1;

-- Add second guest_id column
ALTER TABLE yacht_cabins ADD COLUMN IF NOT EXISTS guest_id_2 UUID;

-- Add foreign key constraints for both guest_id columns
DO $$
BEGIN
  -- Add foreign key constraint for guest_id_1 if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'yacht_cabins_guest_id_1_fkey' 
    AND table_name = 'yacht_cabins'
  ) THEN
    ALTER TABLE yacht_cabins ADD CONSTRAINT yacht_cabins_guest_id_1_fkey 
    FOREIGN KEY (guest_id_1) REFERENCES guests(id) ON DELETE SET NULL;
  END IF;
  
  -- Add foreign key constraint for guest_id_2
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'yacht_cabins_guest_id_2_fkey' 
    AND table_name = 'yacht_cabins'
  ) THEN
    ALTER TABLE yacht_cabins ADD CONSTRAINT yacht_cabins_guest_id_2_fkey 
    FOREIGN KEY (guest_id_2) REFERENCES guests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for both guest_id columns
CREATE INDEX IF NOT EXISTS idx_yacht_cabins_guest_id_1 ON yacht_cabins(guest_id_1);
CREATE INDEX IF NOT EXISTS idx_yacht_cabins_guest_id_2 ON yacht_cabins(guest_id_2);

-- Create a composite index for queries that check both guest IDs
CREATE INDEX IF NOT EXISTS idx_yacht_cabins_guest_ids ON yacht_cabins(guest_id_1, guest_id_2);

-- Add a check constraint to ensure guest_id_1 and guest_id_2 are not the same
ALTER TABLE yacht_cabins ADD CONSTRAINT yacht_cabins_different_guests_check 
CHECK (guest_id_1 IS NULL OR guest_id_2 IS NULL OR guest_id_1 != guest_id_2);

-- Update the occupied status logic - a cabin is occupied if either guest_id is not null
-- This will be handled in the application logic, but we can add a computed column if needed

-- Add comments to document the changes
COMMENT ON TABLE yacht_cabins IS 'Updated yacht_cabins table supporting two guests per cabin';
COMMENT ON COLUMN yacht_cabins.guest_id_1 IS 'Primary guest assigned to this cabin';
COMMENT ON COLUMN yacht_cabins.guest_id_2 IS 'Secondary guest assigned to this cabin (optional)';
COMMENT ON CONSTRAINT yacht_cabins_different_guests_check ON yacht_cabins IS 'Ensures the same guest is not assigned twice to the same cabin';
