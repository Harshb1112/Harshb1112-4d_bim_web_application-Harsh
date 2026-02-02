-- Add budget allocation fields to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "total_budget" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "contingency_percentage" DOUBLE PRECISION DEFAULT 10;

-- Update existing projects to use budget field as total_budget if not set
UPDATE "projects" SET "total_budget" = "budget" WHERE "total_budget" = 0 AND "budget" > 0;
