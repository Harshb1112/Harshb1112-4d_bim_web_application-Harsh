-- Rename column from openai_api_key to ai_api_key
ALTER TABLE "User" RENAME COLUMN "openai_api_key" TO "ai_api_key";
