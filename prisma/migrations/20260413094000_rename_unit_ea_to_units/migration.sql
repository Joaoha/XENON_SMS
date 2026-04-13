-- Update existing rows where unit = 'ea' to 'units'
UPDATE "StockItem" SET unit = 'units' WHERE unit = 'ea';

-- Update the column default
ALTER TABLE "StockItem" ALTER COLUMN unit SET DEFAULT 'units';
