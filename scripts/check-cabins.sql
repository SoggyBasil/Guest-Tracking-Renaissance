-- Check current cabins in the database
SELECT cabin_number, cabin_name, deck, cabin_type, position 
FROM yacht_cabins 
ORDER BY 
  CASE deck 
    WHEN 'OWNERS DECK' THEN 1 
    WHEN 'SPA DECK' THEN 2 
    WHEN 'UPPER DECK' THEN 3 
  END,
  cabin_number;
