-- Clear existing data
DELETE FROM guest_activities;
DELETE FROM wristbands;
DELETE FROM cabins;
DELETE FROM guests;

-- Create yacht cabins with proper deck layout
INSERT INTO cabins (cabin_number, capacity, status, deck, cabin_type, position) VALUES
-- OWNERS DECK
('602', 2, 'available', 'OWNERS DECK', 'Master Suite', 'center'),

-- SPA DECK
('503', 2, 'available', 'SPA DECK', 'VIP Cabin', 'left'),
('504', 2, 'available', 'SPA DECK', 'VIP Cabin', 'right'),
('502', 2, 'available', 'SPA DECK', 'VIP Cabin', 'left'),
('507', 2, 'available', 'SPA DECK', 'VIP Cabin', 'left'),
('506', 2, 'available', 'SPA DECK', 'VIP Cabin', 'right'),
('510', 2, 'available', 'SPA DECK', 'Staff Cabin', 'right'),

-- UPPER DECK
('403', 2, 'available', 'UPPER DECK', 'Staff Cabin', 'left'),
('404', 2, 'available', 'UPPER DECK', 'Staff Cabin', 'right'),
('407', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'left'),
('408', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'right'),
('409', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'left'),
('410', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'right'),
('411', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'left'),
('412', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'right'),
('413', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'left'),
('414', 2, 'available', 'UPPER DECK', 'Guest Cabin', 'right'),
('418', 2, 'available', 'UPPER DECK', 'Staff Cabin', 'right');

-- Add cabin names
UPDATE cabins SET cabin_name = 'Master Suite' WHERE cabin_number = '602';
UPDATE cabins SET cabin_name = 'DUBAI' WHERE cabin_number = '503';
UPDATE cabins SET cabin_name = 'NEW YORK' WHERE cabin_number = '504';
UPDATE cabins SET cabin_name = 'SYDNEY' WHERE cabin_number = '502';
UPDATE cabins SET cabin_name = 'ROME' WHERE cabin_number = '507';
UPDATE cabins SET cabin_name = 'PARIS' WHERE cabin_number = '506';
UPDATE cabins SET cabin_name = 'TOKYO' WHERE cabin_number = '510';
UPDATE cabins SET cabin_name = 'BEIJING' WHERE cabin_number = '403';
UPDATE cabins SET cabin_name = 'ISTANBUL' WHERE cabin_number = '404';
UPDATE cabins SET cabin_name = 'MADRID' WHERE cabin_number = '407';
UPDATE cabins SET cabin_name = 'CAIRO' WHERE cabin_number = '408';
UPDATE cabins SET cabin_name = 'MONACO' WHERE cabin_number = '409';
UPDATE cabins SET cabin_name = 'HOLLYWOOD' WHERE cabin_number = '410';
UPDATE cabins SET cabin_name = 'RIO' WHERE cabin_number = '411';
UPDATE cabins SET cabin_name = 'LONDON' WHERE cabin_number = '412';
UPDATE cabins SET cabin_name = 'VENICE' WHERE cabin_number = '413';
UPDATE cabins SET cabin_name = 'MYKONOS' WHERE cabin_number = '414';
UPDATE cabins SET cabin_name = 'CAPRI' WHERE cabin_number = '418';

-- Create wristbands for each cabin (G1 and G2)
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

-- Add missing columns to existing tables
ALTER TABLE cabins ADD COLUMN IF NOT EXISTS deck VARCHAR(50);
ALTER TABLE cabins ADD COLUMN IF NOT EXISTS cabin_type VARCHAR(50);
ALTER TABLE cabins ADD COLUMN IF NOT EXISTS position VARCHAR(20);
ALTER TABLE cabins ADD COLUMN IF NOT EXISTS cabin_name VARCHAR(50);
ALTER TABLE wristbands ADD COLUMN IF NOT EXISTS wristband_type VARCHAR(20) DEFAULT 'Guest';

-- Create owner family members
INSERT INTO guests (name, email, phone, status, guest_type) VALUES
('Mr. Owner', 'mr.owner@yacht.com', '+1-555-0001', 'owner', 'Owner'),
('Mrs. Owner', 'mrs.owner@yacht.com', '+1-555-0002', 'owner', 'Owner'),
('Allison Owner', 'allison@yacht.com', '+1-555-0003', 'owner', 'Owner'),
('Jonathan Owner', 'jonathan@yacht.com', '+1-555-0004', 'owner', 'Owner'),
('Sophia Owner', 'sophia@yacht.com', '+1-555-0005', 'owner', 'Owner'),
('Max Owner', 'max@yacht.com', '+1-555-0006', 'owner', 'Owner');

-- Assign owner wristbands
UPDATE wristbands SET guest_id = (SELECT id FROM guests WHERE name = 'Mr. Owner'), status = 'assigned' WHERE wristband_id = 'P1';
UPDATE wristbands SET guest_id = (SELECT id FROM guests WHERE name = 'Mrs. Owner'), status = 'assigned' WHERE wristband_id = 'P2';
UPDATE wristbands SET guest_id = (SELECT id FROM guests WHERE name = 'Allison Owner'), status = 'assigned' WHERE wristband_id = 'P3';
UPDATE wristbands SET guest_id = (SELECT id FROM guests WHERE name = 'Jonathan Owner'), status = 'assigned' WHERE wristband_id = 'P4';
UPDATE wristbands SET guest_id = (SELECT id FROM guests WHERE name = 'Sophia Owner'), status = 'assigned' WHERE wristband_id = 'C1';
UPDATE wristbands SET guest_id = (SELECT id FROM guests WHERE name = 'Max Owner'), status = 'assigned' WHERE wristband_id = 'C2';

-- Add guest_type column to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS guest_type VARCHAR(20) DEFAULT 'Guest';
