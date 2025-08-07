-- Add some sample guests for testing
INSERT INTO guests (name, email, phone, status, guest_type) VALUES
('John Smith', 'john.smith@example.com', '+1-555-1001', 'active', 'Guest'),
('Sarah Johnson', 'sarah.johnson@example.com', '+1-555-1002', 'active', 'Guest'),
('Michael Brown', 'michael.brown@example.com', '+1-555-1003', 'active', 'Guest'),
('Emily Davis', 'emily.davis@example.com', '+1-555-1004', 'active', 'Guest'),
('David Wilson', 'david.wilson@example.com', '+1-555-1005', 'active', 'Guest'),
('Lisa Anderson', 'lisa.anderson@example.com', '+1-555-1006', 'active', 'Guest'),
('James Taylor', 'james.taylor@example.com', '+1-555-2001', 'active', 'Staff'),
('Maria Garcia', 'maria.garcia@example.com', '+1-555-2002', 'active', 'Staff'),
('Robert Martinez', 'robert.martinez@example.com', '+1-555-2003', 'active', 'Staff'),
('Jennifer Lee', 'jennifer.lee@example.com', '+1-555-2004', 'active', 'Staff')
ON CONFLICT (email) DO NOTHING;

-- Assign some guests to cabins for demonstration
UPDATE cabins SET guest_id = (SELECT id FROM guests WHERE name = 'John Smith' LIMIT 1) WHERE cabin_number = '503';
UPDATE cabins SET guest_id = (SELECT id FROM guests WHERE name = 'Sarah Johnson' LIMIT 1) WHERE cabin_number = '506';
UPDATE cabins SET guest_id = (SELECT id FROM guests WHERE name = 'James Taylor' LIMIT 1) WHERE cabin_number = '403';

-- Assign some wristbands to guests
UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'John Smith' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'G1-503';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Sarah Johnson' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'G1-506';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'James Taylor' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'G1-403';
