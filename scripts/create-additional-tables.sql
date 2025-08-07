-- Create wristbands table for tracking wristband assignments
CREATE TABLE IF NOT EXISTS wristbands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wristband_id VARCHAR(50) UNIQUE NOT NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance')),
  battery_level INTEGER DEFAULT 100,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cabins table if it doesn't exist
CREATE TABLE IF NOT EXISTS cabins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabin_number VARCHAR(10) UNIQUE NOT NULL,
  capacity INTEGER DEFAULT 2,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'cleaning')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guest_activities table for tracking check-ins/outs
CREATE TABLE IF NOT EXISTS guest_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('check_in', 'check_out', 'cabin_assign', 'cabin_release')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample wristbands
INSERT INTO wristbands (wristband_id, status, battery_level) VALUES
('WB001', 'available', 95),
('WB002', 'available', 88),
('WB003', 'available', 92),
('WB004', 'available', 100),
('WB005', 'available', 76),
('WB006', 'available', 84),
('WB007', 'available', 91),
('WB008', 'available', 97)
ON CONFLICT (wristband_id) DO NOTHING;

-- Insert sample cabins
INSERT INTO cabins (cabin_number, capacity, status) VALUES
('C001', 2, 'available'),
('C002', 2, 'available'),
('C003', 4, 'available'),
('C004', 2, 'available'),
('C005', 2, 'available'),
('C006', 4, 'available'),
('C007', 2, 'available'),
('C008', 2, 'available'),
('C009', 4, 'available'),
('C010', 2, 'available')
ON CONFLICT (cabin_number) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wristbands_guest_id ON wristbands(guest_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_status ON wristbands(status);
CREATE INDEX IF NOT EXISTS idx_cabins_guest_id ON cabins(guest_id);
CREATE INDEX IF NOT EXISTS idx_cabins_status ON cabins(status);
CREATE INDEX IF NOT EXISTS idx_guest_activities_guest_id ON guest_activities(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_activities_type ON guest_activities(activity_type);

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

DROP TRIGGER IF EXISTS update_cabins_updated_at ON cabins;
CREATE TRIGGER update_cabins_updated_at BEFORE UPDATE ON cabins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
