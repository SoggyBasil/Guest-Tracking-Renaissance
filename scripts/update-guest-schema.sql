-- Update guests table schema
-- Remove email and phone fields, add photo field for image uploads

-- First, drop the unique constraint on email since we're removing it
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_email_key;

-- Remove email and phone columns
ALTER TABLE guests DROP COLUMN IF EXISTS email;
ALTER TABLE guests DROP COLUMN IF EXISTS phone;

-- Add photo column for storing image URLs
ALTER TABLE guests ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Drop the email index since we removed the email column
DROP INDEX IF EXISTS idx_guests_email;

-- Create index for photo_url if needed
CREATE INDEX IF NOT EXISTS idx_guests_photo_url ON guests(photo_url);

-- Update the guest_type constraint to remove 'Staff' since we're simplifying
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_guest_type_check;
ALTER TABLE guests ADD CONSTRAINT guests_guest_type_check 
CHECK (guest_type IN ('Owner', 'Guest'));

-- Update any existing guests to have a default guest_type if null
UPDATE guests SET guest_type = 'Guest' WHERE guest_type IS NULL;

-- Make guest_type NOT NULL
ALTER TABLE guests ALTER COLUMN guest_type SET NOT NULL;
ALTER TABLE guests ALTER COLUMN guest_type SET DEFAULT 'Guest';

-- Add a comment to document the changes
COMMENT ON TABLE guests IS 'Updated guests table without email/phone, with photo upload support';
COMMENT ON COLUMN guests.photo_url IS 'URL to the guest photo stored in Supabase Storage';
