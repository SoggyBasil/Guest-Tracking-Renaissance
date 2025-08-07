-- Create static wristbands for specific cabins
-- This script adds the wristbands that should be available for each cabin

-- Master Suite (602) wristbands
INSERT INTO wristbands (wristband_id, status, battery_level, guest_id, created_at, updated_at) VALUES
('P1 Mr', 'available', 85, NULL, NOW(), NOW()),
('P2 Mrs', 'available', 90, NULL, NOW(), NOW()),
('G1-602', 'available', 75, NULL, NOW(), NOW()),
('G2-602', 'available', 80, NULL, NOW(), NOW())
ON CONFLICT (wristband_id) DO NOTHING;

-- MIAMI (504) wristbands
INSERT INTO wristbands (wristband_id, status, battery_level, guest_id, created_at, updated_at) VALUES
('P3 Allison', 'available', 88, NULL, NOW(), NOW()),
('G1-504', 'available', 72, NULL, NOW(), NOW()),
('G2-504', 'available', 78, NULL, NOW(), NOW())
ON CONFLICT (wristband_id) DO NOTHING;

-- NEW YORK (505) wristbands
INSERT INTO wristbands (wristband_id, status, battery_level, guest_id, created_at, updated_at) VALUES
('P4 Jonathan', 'available', 92, NULL, NOW(), NOW()),
('G1-505', 'available', 70, NULL, NOW(), NOW()),
('G2-505', 'available', 85, NULL, NOW(), NOW())
ON CONFLICT (wristband_id) DO NOTHING;

-- PARIS (506) wristbands
INSERT INTO wristbands (wristband_id, status, battery_level, guest_id, created_at, updated_at) VALUES
('C1 Sophia', 'available', 87, NULL, NOW(), NOW()),
('G1-506', 'available', 73, NULL, NOW(), NOW()),
('G2-506', 'available', 79, NULL, NOW(), NOW())
ON CONFLICT (wristband_id) DO NOTHING;

-- ROME (507) wristbands
INSERT INTO wristbands (wristband_id, status, battery_level, guest_id, created_at, updated_at) VALUES
('C2 Max', 'available', 91, NULL, NOW(), NOW()),
('G1-507', 'available', 76, NULL, NOW(), NOW()),
('G2-507', 'available', 82, NULL, NOW(), NOW())
ON CONFLICT (wristband_id) DO NOTHING;

-- Add some additional wristbands for other cabins
INSERT INTO wristbands (wristband_id, status, battery_level, guest_id, created_at, updated_at) VALUES
('G1-501', 'available', 74, NULL, NOW(), NOW()),
('G2-501', 'available', 81, NULL, NOW(), NOW()),
('G1-502', 'available', 77, NULL, NOW(), NOW()),
('G2-502', 'available', 83, NULL, NOW(), NOW()),
('G1-503', 'available', 71, NULL, NOW(), NOW()),
('G2-503', 'available', 86, NULL, NOW(), NOW())
ON CONFLICT (wristband_id) DO NOTHING;

-- Verify the wristbands were created
SELECT wristband_id, status, battery_level FROM wristbands ORDER BY wristband_id;
