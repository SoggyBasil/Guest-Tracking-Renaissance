-- Insert sample guests
INSERT INTO guests (name, email, phone, status, check_in_time) VALUES
('John Doe', 'john.doe@example.com', '+1234567890', 'checked_in', NOW() - INTERVAL '2 hours'),
('Jane Smith', 'jane.smith@example.com', '+1234567891', 'checked_in', NOW() - INTERVAL '1 hour'),
('Bob Johnson', 'bob.johnson@example.com', '+1234567892', 'checked_out', NOW() - INTERVAL '3 hours'),
('Alice Brown', 'alice.brown@example.com', '+1234567893', 'checked_in', NOW() - INTERVAL '30 minutes'),
('Charlie Wilson', 'charlie.wilson@example.com', '+1234567894', 'checked_in', NOW() - INTERVAL '45 minutes');

-- Insert sample cabin allocations
INSERT INTO cabin_allocations (cabin_number, guest_id, allocated_at) 
SELECT 'C001', id, NOW() - INTERVAL '2 hours' FROM guests WHERE email = 'john.doe@example.com';

INSERT INTO cabin_allocations (cabin_number, guest_id, allocated_at) 
SELECT 'C002', id, NOW() - INTERVAL '1 hour' FROM guests WHERE email = 'jane.smith@example.com';

INSERT INTO cabin_allocations (cabin_number, guest_id, allocated_at) 
SELECT 'C003', id, NOW() - INTERVAL '30 minutes' FROM guests WHERE email = 'alice.brown@example.com';
