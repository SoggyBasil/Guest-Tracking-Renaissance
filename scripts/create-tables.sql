-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out')),
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  wristband_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cabin_allocations table
CREATE TABLE IF NOT EXISTS cabin_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabin_number VARCHAR(10) NOT NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deallocated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_check_in_time ON guests(check_in_time);
CREATE INDEX IF NOT EXISTS idx_cabin_allocations_cabin_number ON cabin_allocations(cabin_number);
CREATE INDEX IF NOT EXISTS idx_cabin_allocations_guest_id ON cabin_allocations(guest_id);
CREATE INDEX IF NOT EXISTS idx_cabin_allocations_active ON cabin_allocations(cabin_number) WHERE deallocated_at IS NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cabin_allocations_updated_at BEFORE UPDATE ON cabin_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabin_allocations ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication needs)
CREATE POLICY "Enable read access for all users" ON guests FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON guests FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON guests FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON cabin_allocations FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON cabin_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON cabin_allocations FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON cabin_allocations FOR DELETE USING (true);
