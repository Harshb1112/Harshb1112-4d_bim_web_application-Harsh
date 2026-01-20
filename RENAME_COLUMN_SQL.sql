-- Step 1: Remove NOT NULL constraint from ai_provider column
ALTER TABLE "users" 
ALTER COLUMN "ai_provider" DROP NOT NULL;

-- Step 2: Remove default value (if any) so new users get NULL
ALTER TABLE "users" 
ALTER COLUMN "ai_provider" DROP DEFAULT;

-- Step 3: Set ai_provider to NULL for existing users who don't have an API key
UPDATE "users" 
SET "ai_provider" = NULL 
WHERE "ai_api_key" IS NULL;

-- Step 4: Verify the changes
SELECT 
  id, 
  email, 
  ai_provider, 
  CASE 
    WHEN ai_api_key IS NULL THEN 'NO KEY'
    ELSE 'HAS KEY'
  END as key_status
FROM "users" 
ORDER BY id;
