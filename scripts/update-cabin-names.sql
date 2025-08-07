-- Update cabin names to match correct specifications
-- Run this script to fix the cabin names

-- Update SPA DECK cabins
UPDATE yacht_cabins SET cabin_name = 'DUBAI' WHERE cabin_number = '503';
UPDATE yacht_cabins SET cabin_name = 'MIAMI' WHERE cabin_number = '504';  -- Changed from NEW YORK to MIAMI
UPDATE yacht_cabins SET cabin_name = 'NEW YORK' WHERE cabin_number = '505';  -- Ensure NEW YORK is on 505
UPDATE yacht_cabins SET cabin_name = 'SYDNEY' WHERE cabin_number = '502';
UPDATE yacht_cabins SET cabin_name = 'ROME' WHERE cabin_number = '507';
UPDATE yacht_cabins SET cabin_name = 'PARIS' WHERE cabin_number = '506';
UPDATE yacht_cabins SET cabin_name = 'TOKYO' WHERE cabin_number = '510';

-- Update UPPER DECK cabins (keeping existing names)
UPDATE yacht_cabins SET cabin_name = 'BEIJING' WHERE cabin_number = '403';
UPDATE yacht_cabins SET cabin_name = 'ISTANBUL' WHERE cabin_number = '404';
UPDATE yacht_cabins SET cabin_name = 'MADRID' WHERE cabin_number = '407';
UPDATE yacht_cabins SET cabin_name = 'CAIRO' WHERE cabin_number = '408';
UPDATE yacht_cabins SET cabin_name = 'MONACO' WHERE cabin_number = '409';
UPDATE yacht_cabins SET cabin_name = 'HOLLYWOOD' WHERE cabin_number = '410';
UPDATE yacht_cabins SET cabin_name = 'RIO' WHERE cabin_number = '411';
UPDATE yacht_cabins SET cabin_name = 'LONDON' WHERE cabin_number = '412';
UPDATE yacht_cabins SET cabin_name = 'VENICE' WHERE cabin_number = '413';
UPDATE yacht_cabins SET cabin_name = 'MYKONOS' WHERE cabin_number = '414';
UPDATE yacht_cabins SET cabin_name = 'CAPRI' WHERE cabin_number = '418';

-- Update OWNERS DECK
UPDATE yacht_cabins SET cabin_name = 'Master Suite' WHERE cabin_number = '602';

-- Verify the updates
SELECT cabin_number, cabin_name, deck, cabin_type, position 
FROM yacht_cabins 
ORDER BY 
  CASE deck 
    WHEN 'OWNERS DECK' THEN 1 
    WHEN 'SPA DECK' THEN 2 
    WHEN 'UPPER DECK' THEN 3 
  END,
  cabin_number;
