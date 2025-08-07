-- Populate the yacht with cabin and wristband data
-- Run this script AFTER create-all-tables.sql

-- Clear existing data (optional - remove if you want to keep existing data)
DELETE FROM guest_activities;
DELETE FROM wristbands;
DELETE FROM cabins WHERE cabin_number LIKE '%0%'; -- Only delete yacht cabins
DELETE FROM guests WHERE guest_type = 'Owner';

-- Create owner family members first
INSERT INTO guests (name, email, phone, status, guest_type) VALUES
('Mr. Owner', 'mr.owner@yacht.com', '+1-555-0001', 'owner', 'Owner'),
('Mrs. Owner', 'mrs.owner@yacht.com', '+1-555-0002', 'owner', 'Owner'),
('Allison Owner', 'allison@yacht.com', '+1-555-0003', 'owner', 'Owner'),
('Jonathan Owner', 'jonathan@yacht.com', '+1-555-0004', 'owner', 'Owner'),
('Sophia Owner', 'sophia@yacht.com', '+1-555-0005', 'owner', 'Owner'),
('Max Owner', 'max@yacht.com', '+1-555-0006', 'owner', 'Owner')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  guest_type = EXCLUDED.guest_type,
  status = EXCLUDED.status;

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

-- Create wristbands for the yacht
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
('G2-418', 'available', 100, 'Staff')
ON CONFLICT (wristband_id) DO UPDATE SET
  wristband_type = EXCLUDED.wristband_type,
  battery_level = EXCLUDED.battery_level;

-- Assign owner wristbands to family members
UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Mr. Owner' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'P1';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Mrs. Owner' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'P2';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Allison Owner' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'P3';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Jonathan Owner' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'P4';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Sophia Owner' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'C1';

UPDATE wristbands SET 
  guest_id = (SELECT id FROM guests WHERE name = 'Max Owner' LIMIT 1), 
  status = 'assigned' 
WHERE wristband_id = 'C2';
