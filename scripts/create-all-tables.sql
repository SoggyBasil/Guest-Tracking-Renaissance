-- Create all tables for the yacht guest tracking system
-- Run this script first to create the complete database structure

-- Create guests table first (no dependencies)
CREATE TABLE IF NOT EXISTS guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  guest_type VARCHAR(20) DEFAULT 'Guest',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints after table creation
DO $$ 
BEGIN
  -- Add status constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guests_status_check' 
    AND table_name = 'guests'
  ) THEN
    ALTER TABLE guests ADD CONSTRAINT guests_status_check 
    CHECK (status IN ('active', 'inactive', 'owner'));
  END IF;
  
  -- Add guest_type constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guests_guest_type_check' 
    AND table_name = 'guests'
  ) THEN
    ALTER TABLE guests ADD CONSTRAINT guests_guest_type_check 
    CHECK (guest_type IN ('Owner', 'Guest', 'Staff'));
  END IF;
END $$;

-- Create cabins table (references guests)
CREATE TABLE IF NOT EXISTS cabins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabin_number VARCHAR(10) UNIQUE NOT NULL,
  cabin_name VARCHAR(50),
  capacity INTEGER DEFAULT 2,
  deck VARCHAR(50),
  cabin_type VARCHAR(50),
  position VARCHAR(20),
  status VARCHAR(20) DEFAULT 'available',
  guest_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for cabins after both tables exist
DO $$
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cabins_guest_id_fkey' 
    AND table_name = 'cabins'
  ) THEN
    ALTER TABLE cabins ADD CONSTRAINT cabins_guest_id_fkey 
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL;
  END IF;
  
  -- Add status constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cabins_status_check' 
    AND table_name = 'cabins'
  ) THEN
    ALTER TABLE cabins ADD CONSTRAINT cabins_status_check 
    CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning'));
  END IF;
END $$;

-- Create wristbands table (references guests)
CREATE TABLE IF NOT EXISTS wristbands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wristband_id VARCHAR(50) UNIQUE NOT NULL,
  guest_id UUID,
  status VARCHAR(20) DEFAULT 'available',
  battery_level INTEGER DEFAULT 100,
  wristband_type VARCHAR(20) DEFAULT 'Guest',
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints for wristbands
DO $$
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wristbands_guest_id_fkey' 
    AND table_name = 'wristbands'
  ) THEN
    ALTER TABLE wristbands ADD CONSTRAINT wristbands_guest_id_fkey 
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL;
  END IF;
  
  -- Add status constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wristbands_status_check' 
    AND table_name = 'wristbands'
  ) THEN
    ALTER TABLE wristbands ADD CONSTRAINT wristbands_status_check 
    CHECK (status IN ('available', 'assigned', 'maintenance'));
  END IF;
  
  -- Add wristband_type constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wristbands_type_check' 
    AND table_name = 'wristbands'
  ) THEN
    ALTER TABLE wristbands ADD CONSTRAINT wristbands_type_check 
    CHECK (wristband_type IN ('Owner', 'Guest', 'Staff'));
  END IF;
END $$;

-- Create guest_activities table for tracking activities
CREATE TABLE IF NOT EXISTS guest_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID,
  activity_type VARCHAR(20) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints for guest_activities
DO $$
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guest_activities_guest_id_fkey' 
    AND table_name = 'guest_activities'
  ) THEN
    ALTER TABLE guest_activities ADD CONSTRAINT guest_activities_guest_id_fkey 
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;
  END IF;
  
  -- Add activity_type constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guest_activities_type_check' 
    AND table_name = 'guest_activities'
  ) THEN
    ALTER TABLE guest_activities ADD CONSTRAINT guest_activities_type_check 
    CHECK (activity_type IN ('check_in', 'check_out', 'cabin_assign', 'cabin_release', 'wristband_assign', 'wristband_release'));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_guest_type ON guests(guest_type);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);

CREATE INDEX IF NOT EXISTS idx_cabins_deck ON cabins(deck);
CREATE INDEX IF NOT EXISTS idx_cabins_cabin_type ON cabins(cabin_type);
CREATE INDEX IF NOT EXISTS idx_cabins_position ON cabins(position);
CREATE INDEX IF NOT EXISTS idx_cabins_guest_id ON cabins(guest_id);
CREATE INDEX IF NOT EXISTS idx_cabins_status ON cabins(status);

CREATE INDEX IF NOT EXISTS idx_wristbands_guest_id ON wristbands(guest_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_status ON wristbands(status);
CREATE INDEX IF NOT EXISTS idx_wristbands_type ON wristbands(wristband_type);
CREATE INDEX IF NOT EXISTS idx_wristbands_wristband_id ON wristbands(wristband_id);

CREATE INDEX IF NOT EXISTS idx_guest_activities_guest_id ON guest_activities(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_activities_type ON guest_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_guest_activities_created_at ON guest_activities(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cabins_updated_at ON cabins;
CREATE TRIGGER update_cabins_updated_at BEFORE UPDATE ON cabins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wristbands_updated_at ON wristbands;
CREATE TRIGGER update_wristbands_updated_at BEFORE UPDATE ON wristbands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabins ENABLE ROW LEVEL SECURITY;
ALTER TABLE wristbands ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables (allow all operations for now)
-- Guests policies
DROP POLICY IF EXISTS "Enable read access for all users" ON guests;
CREATE POLICY "Enable read access for all users" ON guests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON guests;
CREATE POLICY "Enable insert access for all users" ON guests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON guests;
CREATE POLICY "Enable update access for all users" ON guests FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON guests;
CREATE POLICY "Enable delete access for all users" ON guests FOR DELETE USING (true);

-- Cabins policies
DROP POLICY IF EXISTS "Enable read access for all users" ON cabins;
CREATE POLICY "Enable read access for all users" ON cabins FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON cabins;
CREATE POLICY "Enable insert access for all users" ON cabins FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON cabins;
CREATE POLICY "Enable update access for all users" ON cabins FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON cabins;
CREATE POLICY "Enable delete access for all users" ON cabins FOR DELETE USING (true);

-- Wristbands policies
DROP POLICY IF EXISTS "Enable read access for all users" ON wristbands;
CREATE POLICY "Enable read access for all users" ON wristbands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON wristbands;
CREATE POLICY "Enable insert access for all users" ON wristbands FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON wristbands;
CREATE POLICY "Enable update access for all users" ON wristbands FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON wristbands;
CREATE POLICY "Enable delete access for all users" ON wristbands FOR DELETE USING (true);

-- Guest activities policies
DROP POLICY IF EXISTS "Enable read access for all users" ON guest_activities;
CREATE POLICY "Enable read access for all users" ON guest_activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON guest_activities;
CREATE POLICY "Enable insert access for all users" ON guest_activities FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON guest_activities;
CREATE POLICY "Enable update access for all users" ON guest_activities FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON guest_activities;
CREATE POLICY "Enable delete access for all users" ON guest_activities FOR DELETE USING (true);
