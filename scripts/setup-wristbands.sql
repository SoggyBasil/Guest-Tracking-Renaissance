-- Clear existing wristbands data
DELETE FROM wristbands;

-- Reset the sequence if using SERIAL
-- ALTER SEQUENCE wristbands_id_seq RESTART WITH 1;

-- Create wristbands for Owner Family
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('P1 Mr', 'available', 100, 'Owner', NOW(), NOW()),    -- Mr. Owner
('P2 Mrs', 'available', 100, 'Owner', NOW(), NOW()),    -- Mrs. Owner  
('P3 Allison', 'available', 100, 'Owner', NOW(), NOW()),    -- Allison
('P4 Jonathan', 'available', 100, 'Owner', NOW(), NOW()),    -- Jonathan
('C1 Sophia', 'available', 100, 'Owner', NOW(), NOW()),    -- Sophia
('C2 Max', 'available', 100, 'Owner', NOW(), NOW());    -- Max

-- OWNERS DECK
-- 602 - Master Suite (Master Suite) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 602', 'available', 100, 'Guest', NOW(), NOW()),
('G2 602', 'available', 100, 'Guest', NOW(), NOW());

-- SPA DECK
-- 503 - DUBAI (VIP Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 503', 'available', 100, 'Guest', NOW(), NOW()),
('G2 503', 'available', 100, 'Guest', NOW(), NOW());

-- 504 - MIAMI (VIP Cabin) - G1 and G2  
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 504', 'available', 100, 'Guest', NOW(), NOW()),
('G2 504', 'available', 100, 'Guest', NOW(), NOW());

-- 505 - NEW YORK (VIP Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 505', 'available', 100, 'Guest', NOW(), NOW()),
('G2 505', 'available', 100, 'Guest', NOW(), NOW());

-- 502 - SYDNEY (VIP Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 502', 'available', 100, 'Guest', NOW(), NOW()),
('G2 502', 'available', 100, 'Guest', NOW(), NOW());

-- 507 - ROME (VIP Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 507', 'available', 100, 'Guest', NOW(), NOW()),
('G2 507', 'available', 100, 'Guest', NOW(), NOW());

-- 506 - PARIS (VIP Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 506', 'available', 100, 'Guest', NOW(), NOW()),
('G2 506', 'available', 100, 'Guest', NOW(), NOW());

-- 510 - TOKYO (Staff Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 510', 'available', 100, 'Staff', NOW(), NOW()),
('G2 510', 'available', 100, 'Staff', NOW(), NOW());

-- UPPER DECK
-- 403 - BEIJING (Staff Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 403', 'available', 100, 'Staff', NOW(), NOW()),
('G2 403', 'available', 100, 'Staff', NOW(), NOW());

-- 404 - ISTANBUL (Staff Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 404', 'available', 100, 'Staff', NOW(), NOW()),
('G2 404', 'available', 100, 'Staff', NOW(), NOW());

-- 407 - MADRID (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 407', 'available', 100, 'Guest', NOW(), NOW()),
('G2 407', 'available', 100, 'Guest', NOW(), NOW());

-- 408 - CAIRO (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 408', 'available', 100, 'Guest', NOW(), NOW()),
('G2 408', 'available', 100, 'Guest', NOW(), NOW());

-- 409 - MONACO (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 409', 'available', 100, 'Guest', NOW(), NOW()),
('G2 409', 'available', 100, 'Guest', NOW(), NOW());

-- 410 - HOLLYWOOD (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 410', 'available', 100, 'Guest', NOW(), NOW()),
('G2 410', 'available', 100, 'Guest', NOW(), NOW());

-- 411 - RIO (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 411', 'available', 100, 'Guest', NOW(), NOW()),
('G2 411', 'available', 100, 'Guest', NOW(), NOW());

-- 412 - LONDON (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 412', 'available', 100, 'Guest', NOW(), NOW()),
('G2 412', 'available', 100, 'Guest', NOW(), NOW());

-- 413 - VENICE (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 413', 'available', 100, 'Guest', NOW(), NOW()),
('G2 413', 'available', 100, 'Guest', NOW(), NOW());

-- 414 - MYKONOS (Guest Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 414', 'available', 100, 'Guest', NOW(), NOW()),
('G2 414', 'available', 100, 'Guest', NOW(), NOW());

-- 418 - CAPRI (Staff Cabin) - G1 and G2
INSERT INTO wristbands (wristband_id, status, battery_level, wristband_type, created_at, updated_at) VALUES
('G1 418', 'available', 100, 'Staff', NOW(), NOW()),
('G2 418', 'available', 100, 'Staff', NOW(), NOW());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wristbands_wristband_id ON wristbands(wristband_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_status ON wristbands(status);
CREATE INDEX IF NOT EXISTS idx_wristbands_type ON wristbands(wristband_type);
CREATE INDEX IF NOT EXISTS idx_wristbands_guest_id ON wristbands(guest_id);

-- Display summary
SELECT 
    wristband_type,
    COUNT(*) as count,
    STRING_AGG(wristband_id, ', ' ORDER BY wristband_id) as wristbands
FROM wristbands 
GROUP BY wristband_type 
ORDER BY 
    CASE wristband_type 
        WHEN 'Owner' THEN 1 
        WHEN 'Staff' THEN 2 
        WHEN 'Guest' THEN 3 
    END;
