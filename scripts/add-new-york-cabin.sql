-- Add NEW YORK cabin to the SPA DECK
-- Adjust the cabin_number as needed (e.g., 505, 508, etc.)

INSERT INTO yacht_cabins (cabin_number, cabin_name, capacity, deck, cabin_type, position, status) VALUES
('505', 'NEW YORK', 2, 'SPA DECK', 'VIP Cabin', 'right', 'available')
ON CONFLICT (cabin_number) DO UPDATE SET
  cabin_name = 'NEW YORK',
  deck = 'SPA DECK',
  cabin_type = 'VIP Cabin',
  position = 'right';

-- Add corresponding wristbands for NEW YORK cabin
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 505', 'available', 100, 'Guest', NOW(), NOW()),
('G2 505', 'available', 100, 'Guest', NOW(), NOW())
ON CONFLICT (wristband_id) DO NOTHING;

-- Verify the addition
SELECT cabin_number, cabin_name, deck, cabin_type, position 
FROM yacht_cabins 
WHERE cabin_name = 'NEW YORK' OR cabin_number = '505';
