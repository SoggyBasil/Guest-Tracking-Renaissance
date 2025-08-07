-- Create guest_device_link table for tracking guest assignments
CREATE TABLE IF NOT EXISTS guest_device_link (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  cabin_id UUID REFERENCES yacht_cabins(id) ON DELETE SET NULL,
  wristband_id UUID REFERENCES wristbands(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guest_device_link_guest_id ON guest_device_link(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_device_link_cabin_id ON guest_device_link(cabin_id);
CREATE INDEX IF NOT EXISTS idx_guest_device_link_wristband_id ON guest_device_link(wristband_id);
CREATE INDEX IF NOT EXISTS idx_guest_device_link_active ON guest_device_link(guest_id, unassigned_at) WHERE unassigned_at IS NULL;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_guest_device_link_updated_at ON guest_device_link;
CREATE TRIGGER update_guest_device_link_updated_at BEFORE UPDATE ON guest_device_link
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE guest_device_link ENABLE ROW LEVEL SECURITY;

-- Create policies for guest_device_link table
DROP POLICY IF EXISTS "Enable read access for all users" ON guest_device_link;
DROP POLICY IF EXISTS "Enable insert access for all users" ON guest_device_link;
DROP POLICY IF EXISTS "Enable update access for all users" ON guest_device_link;
DROP POLICY IF EXISTS "Enable delete access for all users" ON guest_device_link;

CREATE POLICY "Enable read access for all users" ON guest_device_link FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON guest_device_link FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON guest_device_link FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON guest_device_link FOR DELETE USING (true);

-- Create a view for active assignments
CREATE OR REPLACE VIEW active_guest_assignments AS
SELECT 
  gdl.id as assignment_id,
  g.id as guest_id,
  g.name as guest_name,
  g.email as guest_email,
  g.guest_type,
  yc.cabin_number,
  yc.cabin_name,
  yc.deck,
  w.wristband_id,
  w.battery_level,
  gdl.assigned_at,
  gdl.assigned_by
FROM guest_device_link gdl
JOIN guests g ON gdl.guest_id = g.id
LEFT JOIN yacht_cabins yc ON gdl.cabin_id = yc.id
LEFT JOIN wristbands w ON gdl.wristband_id = w.id
WHERE gdl.unassigned_at IS NULL
ORDER BY gdl.assigned_at DESC;
