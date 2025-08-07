-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS guest_logs CASCADE;
DROP TABLE IF EXISTS guests CASCADE;

-- Create guests table (simplified, no problematic constraints)
CREATE TABLE guests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    cabin_id INTEGER,
    check_in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_date TIMESTAMP,
    guest_type VARCHAR(50) DEFAULT 'guest',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create guest_logs table for activity tracking
CREATE TABLE guest_logs (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
    activity VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Insert owner family data
INSERT INTO guests (name, email, guest_type, cabin_id) VALUES
('Mr. Owner', 'mr.owner@yacht.com', 'owner', 1),
('Mrs. Owner', 'mrs.owner@yacht.com', 'owner', 1),
('Owner Child 1', 'child1@yacht.com', 'family', 2),
('Owner Child 2', 'child2@yacht.com', 'family', 2),
('Owner Parent 1', 'parent1@yacht.com', 'family', 3),
('Owner Parent 2', 'parent2@yacht.com', 'family', 3);

-- Insert some sample guests
INSERT INTO guests (name, email, cabin_id, phone) VALUES
('John Smith', 'john.smith@example.com', 4, '+1-555-0101'),
('Sarah Johnson', 'sarah.johnson@example.com', 5, '+1-555-0102'),
('Michael Brown', 'michael.brown@example.com', 6, '+1-555-0103'),
('Emily Davis', 'emily.davis@example.com', 7, '+1-555-0104'),
('David Wilson', 'david.wilson@example.com', 8, '+1-555-0105'),
('Lisa Anderson', 'lisa.anderson@example.com', 9, '+1-555-0106');

-- Add some activity logs
INSERT INTO guest_logs (guest_id, activity, location) VALUES
(1, 'Check-in', 'Master Suite'),
(2, 'Check-in', 'Master Suite'),
(3, 'Spa Visit', 'Spa Deck'),
(4, 'Dining', 'Main Deck'),
(5, 'Pool Activity', 'Upper Deck'),
(6, 'Cabin Rest', 'DUBAI Cabin');

-- Update yacht_cabins to link with guests (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'yacht_cabins') THEN
        UPDATE yacht_cabins SET guest_id = 1 WHERE cabin_number = '602';
        UPDATE yacht_cabins SET guest_id = 2 WHERE cabin_number = '601';
        UPDATE yacht_cabins SET guest_id = 3 WHERE cabin_number = '503';
        UPDATE yacht_cabins SET guest_id = 4 WHERE cabin_number = '506';
        UPDATE yacht_cabins SET guest_id = 5 WHERE cabin_number = '507';
        UPDATE yacht_cabins SET guest_id = 6 WHERE cabin_number = '508';
    END IF;
END $$;
