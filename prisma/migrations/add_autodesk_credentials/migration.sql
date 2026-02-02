-- Add Autodesk credentials columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "autodesk_client_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "autodesk_client_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "autodesk_callback_url" TEXT;
