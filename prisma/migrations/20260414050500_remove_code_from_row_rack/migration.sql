-- Drop old unique constraints that use code
ALTER TABLE "Row" DROP CONSTRAINT IF EXISTS "Row_dataHallId_code_key";
ALTER TABLE "Rack" DROP CONSTRAINT IF EXISTS "Rack_rowId_code_key";

-- Drop code columns
ALTER TABLE "Row" DROP COLUMN IF EXISTS "code";
ALTER TABLE "Rack" DROP COLUMN IF EXISTS "code";

-- Add new unique constraints using name
ALTER TABLE "Row" ADD CONSTRAINT "Row_dataHallId_name_key" UNIQUE ("dataHallId", "name");
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_rowId_name_key" UNIQUE ("rowId", "name");
