-- Fix inconsistent status values: change 'active' to 'actief'
UPDATE listings SET status = 'actief' WHERE status = 'active';
