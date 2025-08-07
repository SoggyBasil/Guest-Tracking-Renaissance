-- First, create the wristbands table
CREATE TABLE IF NOT EXISTS wristbands (
  id SERIAL PRIMARY KEY,
  wristband_id VARCHAR(50) UNIQUE NOT NULL,
  guest_id INTEGER REFERENCES guests(id),
  status VARCHAR(20) DEFAULT 'active',
  battery_level INTEGER DEFAULT 100,
  signal_strength INTEGER DEFAULT 0,
  last_location VARCHAR(255),
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to guests table if they don't exist
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT,
ADD COLUMN IF NOT EXISTS profile_photo TEXT,
ADD COLUMN IF NOT EXISTS cabin_id UUID,
ADD COLUMN IF NOT EXISTS wristband_id UUID;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wristbands_guest_id ON wristbands(guest_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_status ON wristbands(status);
CREATE INDEX IF NOT EXISTS idx_guests_cabin_id ON guests(cabin_id);
CREATE INDEX IF NOT EXISTS idx_guests_wristband_id ON guests(wristband_id);

-- Create location_history table for tracking movement
CREATE TABLE IF NOT EXISTS location_history (
  id SERIAL PRIMARY KEY,
  wristband_id INTEGER REFERENCES wristbands(id),
  location VARCHAR(255) NOT NULL,
  signal_strength INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_wristbands_updated_at ON wristbands;
CREATE TRIGGER update_wristbands_updated_at BEFORE UPDATE ON wristbands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample wristband data if the table is empty
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM wristbands) = 0 THEN
        INSERT INTO wristbands (wristband_id, guest_id, status, battery_level, signal_strength, last_location, last_seen) 
        SELECT * FROM (VALUES
          ('P1', 1, 'active', 95, 92, 'Master Suite (602)', NOW()),
          ('P2', 2, 'active', 88, 89, 'Spa Deck', NOW()),
          ('G1-503', 3, 'active', 92, 85, 'DUBAI Cabin (503)', NOW()),
          ('G2-503', 4, 'active', 85, 78, 'PARIS Cabin (506)', NOW()),
          ('G1-504', 5, 'active', 90, 91, 'Upper Deck Pool', NOW()),
          ('G2-504', 6, 'maintenance', 45, 45, 'LONDON Cabin (412)', NOW()),
          ('F1', 7, 'active', 88, 88, 'Game Room', NOW()),
          ('F2', 8, 'active', 86, 86, 'Upper Deck', NOW())
        ) AS new_wristbands(wristband_id, guest_id, status, battery_level, signal_strength, last_location, last_seen)
        WHERE NOT EXISTS (SELECT 1 FROM wristbands WHERE wristband_id = new_wristbands.wristband_id);
    END IF;
END
$$;

-- Update guests table with wristband assignments
UPDATE guests SET wristband_id = w.wristband_id 
FROM wristbands w 
WHERE guests.id = w.guest_id AND guests.wristband_id IS NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE wristbands ENABLE ROW LEVEL SECURITY;

-- Create policies for wristbands table
DROP POLICY IF EXISTS "Enable read access for all users" ON wristbands;
DROP POLICY IF EXISTS "Enable insert access for all users" ON wristbands;
DROP POLICY IF EXISTS "Enable update access for all users" ON wristbands;
DROP POLICY IF EXISTS "Enable delete access for all users" ON wristbands;

CREATE POLICY "Enable read access for all users" ON wristbands FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON wristbands FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON wristbands FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON wristbands FOR DELETE USING (true);
