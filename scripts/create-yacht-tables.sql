-- Create the cabins table with yacht-specific structure
CREATE TABLE IF NOT EXISTS cabins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabin_number VARCHAR(10) UNIQUE NOT NULL,
  cabin_name VARCHAR(50),
  capacity INTEGER DEFAULT 2,
  deck VARCHAR(50),
  cabin_type VARCHAR(50),
  position VARCHAR(20),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning')),
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update wristbands table to include yacht-specific fields
ALTER TABLE wristbands ADD COLUMN IF NOT EXISTS wristband_type VARCHAR(20) DEFAULT 'Guest';

-- Update guests table to include guest type
ALTER TABLE guests ADD COLUMN IF NOT EXISTS guest_type VARCHAR(20) DEFAULT 'Guest';

-- Create yacht cabins with proper deck layout
INSERT INTO cabins (cabin_number, cabin_name, capacity, deck, cabin_type, position, status) VALUES
-- OWNERS DECK
('602', 'Master Suite', 2, 'OWNERS DECK', 'Master Suite', 'center', 'available'),

-- SPA DECK
('503', 'DUBAI', 2, 'SPA DECK', 'VIP Cabin', 'left', 'available'),
('504', 'NEW YORK', 2, 'SPA DECK', 'VIP Cabin', 'right', 'available'),
('502', 'SYDNEY', 2, 'SPA DECK', 'VIP Cabin', 'left', 'available'),
('507', 'ROME', 2, 'SPA DECK', 'VIP Cabin', 'left', 'available'),
('506', 'PARIS', 2, 'SPA DECK', 'VIP Cabin', 'right', 'available'),
('510', 'TOKYO', 2, 'SPA DECK', 'Staff Cabin', 'right', 'available'),

-- UPPER DECK
('403', 'BEIJING', 2, 'UPPER DECK', 'Staff Cabin', 'left', 'available'),
('404', 'ISTANBUL', 2, 'UPPER DECK', 'Staff Cabin', 'right', 'available'),
('407', 'MADRID', 2, 'UPPER DECK', 'Guest Cabin', 'left', 'available'),
('408', 'CAIRO', 2, 'UPPER DECK', 'Guest Cabin', 'right', 'available'),
('409', 'MONACO', 2, 'UPPER DECK', 'Guest Cabin', 'left', 'available'),
('410', 'HOLLYWOOD', 2, 'UPPER DECK', 'Guest Cabin', 'right', 'available'),
('411', 'RIO', 2, 'UPPER DECK', 'Guest Cabin', 'left', 'available'),
('412', 'LONDON', 2, 'UPPER DECK', 'Guest Cabin', 'right', 'available'),
('413', 'VENICE', 2, 'UPPER DECK', 'Guest Cabin', 'left', 'available'),
('414', 'MYKONOS', 2, 'UPPER DECK', 'Guest Cabin', 'right', 'available'),
('418', 'CAPRI', 2, 'UPPER DECK', 'Staff Cabin', 'right', 'available')
ON CONFLICT (cabin_number) DO UPDATE SET
  cabin_name = EXCLUDED.cabin_name,
  deck = EXCLUDED.deck,
  cabin_type = EXCLUDED.cabin_type,
  position = EXCLUDED.position;

-- Clear existing wristbands and create yacht-specific ones
DELETE FROM wristbands;

-- Create wristbands for each cabin (G1 and G2) and owner family
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type) VALUES
-- Owner family wristbands
('P1', 'available', 100, 'Owner'),
('P2', 'available', 100, 'Owner'),
('P3', 'available', 100, 'Owner'),
('P4', 'available', 100, 'Owner'),
('C1', 'available', 100, 'Owner'),
('C2', 'available', 100, 'Owner'),

-- Master Suite (602)
('G1-602', 'available', 100, 'Guest'),
('G2-602', 'available', 100, 'Guest'),

-- SPA DECK
('G1-503', 'available', 100, 'Guest'),
('G2-503', 'available', 100, 'Guest'),
('G1-504', 'available', 100, 'Guest'),
('G2-504', 'available', 100, 'Guest'),
('G1-502', 'available', 100, 'Guest'),
('G2-502', 'available', 100, 'Guest'),
('G1-507', 'available', 100, 'Guest'),
('G2-507', 'available', 100, 'Guest'),
('G1-506', 'available', 100, 'Guest'),
('G2-506', 'available', 100, 'Guest'),
('G1-510', 'available', 100, 'Staff'),
('G2-510', 'available', 100, 'Staff'),

-- UPPER DECK
('G1-403', 'available', 100, 'Staff'),
('G2-403', 'available', 100, 'Staff'),
('G1-404', 'available', 100, 'Staff'),
('G2-404', 'available', 100, 'Staff'),
('G1-407', 'available', 100, 'Guest'),
('G2-407', 'available', 100, 'Guest'),
('G1-408', 'available', 100, 'Guest'),
('G2-408', 'available', 100, 'Guest'),
('G1-409', 'available', 100, 'Guest'),
('G2-409', 'available', 100, 'Guest'),
('G1-410', 'available', 100, 'Guest'),
('G2-410', 'available', 100, 'Guest'),
('G1-411', 'available', 100, 'Guest'),
('G2-411', 'available', 100, 'Guest'),
('G1-412', 'available', 100, 'Guest'),
('G2-412', 'available', 100, 'Guest'),
('G1-413', 'available', 100, 'Guest'),
('G2-413', 'available', 100, 'Guest'),
('G1-414', 'available', 100, 'Guest'),
('G2-414', 'available', 100, 'Guest'),
('G1-418', 'available', 100, 'Staff'),
('G2-418', 'available', 100, 'Staff');

-- Create owner family members
INSERT INTO guests (name, email, phone, status, guest_type) VALUES
('Mr. Owner', 'mr.owner@yacht.com', '+1-555-0001', 'owner', 'Owner'),
('Mrs. Owner', 'mrs.owner@yacht.com', '+1-555-0002', 'owner', 'Owner'),
('Allison Owner', 'allison@yacht.com', '+1-555-0003', 'owner', 'Owner'),
('Jonathan Owner', 'jonathan@yacht.com', '+1-555-0004', 'owner', 'Owner'),
('Sophia Owner', 'sophia@yacht.com', '+1-555-0005', 'owner', 'Owner'),
('Max Owner', 'max@yacht.com', '+1-555-0006', 'owner', 'Owner')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  guest_type = EXCLUDED.guest_type;

-- Assign owner wristbands to family members
UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Mr. Owner'), 
  status = 'assigned' 
WHERE wristband_id = 'P1';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Mrs. Owner'), 
  status = 'assigned' 
WHERE wristband_id = 'P2';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Allison Owner'), 
  status = 'assigned' 
WHERE wristband_id = 'P3';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Jonathan Owner'), 
  status = 'assigned' 
WHERE wristband_id = 'P4';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Sophia Owner'), 
  status = 'assigned' 
WHERE wristband_id = 'C1';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Max Owner'), 
  status = 'assigned' 
WHERE wristband_id = 'C2';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cabins_deck ON cabins(deck);
CREATE INDEX IF NOT EXISTS idx_cabins_cabin_type ON cabins(cabin_type);
CREATE INDEX IF NOT EXISTS idx_cabins_position ON cabins(position);
CREATE INDEX IF NOT EXISTS idx_cabins_guest_id ON cabins(guest_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_guest_id ON wristbands(guest_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_status ON wristbands(status);
CREATE INDEX IF NOT EXISTS idx_wristbands_type ON wristbands(wristband_type);
CREATE INDEX IF NOT EXISTS idx_guests_guest_type ON guests(guest_type);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_cabins_updated_at ON cabins;
CREATE TRIGGER update_cabins_updated_at BEFORE UPDATE ON cabins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wristbands_updated_at ON wristbands;
CREATE TRIGGER update_wristbands_updated_at BEFORE UPDATE ON wristbands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) if needed
ALTER TABLE cabins ENABLE ROW LEVEL SECURITY;

-- Create policies for cabins (adjust based on your authentication needs)
CREATE POLICY "Enable read access for all users" ON cabins FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON cabins FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON cabins FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON cabins FOR DELETE USING (true);
