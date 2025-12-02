-- View Site Feature Migration
-- Adds tables for 360° camera integration, site captures, costs, and progress tracking

-- Add location fields to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Site Cameras table
CREATE TABLE IF NOT EXISTS "site_cameras" (
    "id" SERIAL PRIMARY KEY,
    "project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "camera_type" TEXT NOT NULL DEFAULT '360',
    "brand" TEXT,
    "model" TEXT,
    "stream_url" TEXT,
    "snapshot_url" TEXT,
    "api_key" TEXT,
    "api_secret" TEXT,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "last_ping_at" TIMESTAMP(3),
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_cameras_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Site Captures table
CREATE TABLE IF NOT EXISTS "site_captures" (
    "id" SERIAL PRIMARY KEY,
    "project_id" INTEGER NOT NULL,
    "camera_id" INTEGER,
    "capture_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "file_size" INTEGER,
    "duration" INTEGER,
    "resolution" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "weather" TEXT,
    "temperature" DOUBLE PRECISION,
    "notes" TEXT,
    "metadata" JSONB,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_captures_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "site_captures_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "site_cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Daily Site Costs table
CREATE TABLE IF NOT EXISTS "daily_site_costs" (
    "id" SERIAL PRIMARY KEY,
    "project_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "unit_cost" DOUBLE PRECISION,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "vendor" TEXT,
    "invoice_ref" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_site_costs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Daily Site Progress table
CREATE TABLE IF NOT EXISTS "daily_site_progress" (
    "id" SERIAL PRIMARY KEY,
    "project_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "work_description" TEXT NOT NULL,
    "team_name" TEXT,
    "workers_count" INTEGER,
    "hours_worked" DOUBLE PRECISION,
    "progress_percent" DOUBLE PRECISION,
    "weather" TEXT,
    "issues" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_site_progress_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Site View Logs table (audit trail)
CREATE TABLE IF NOT EXISTS "site_view_logs" (
    "id" SERIAL PRIMARY KEY,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "view_type" TEXT NOT NULL,
    "capture_id" INTEGER,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "site_view_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "site_view_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "site_cameras_project_id_idx" ON "site_cameras"("project_id");
CREATE INDEX IF NOT EXISTS "site_captures_project_id_idx" ON "site_captures"("project_id");
CREATE INDEX IF NOT EXISTS "site_captures_captured_at_idx" ON "site_captures"("captured_at");
CREATE INDEX IF NOT EXISTS "daily_site_costs_project_id_date_idx" ON "daily_site_costs"("project_id", "date");
CREATE INDEX IF NOT EXISTS "daily_site_progress_project_id_date_idx" ON "daily_site_progress"("project_id", "date");
CREATE INDEX IF NOT EXISTS "site_view_logs_project_id_idx" ON "site_view_logs"("project_id");
CREATE INDEX IF NOT EXISTS "site_view_logs_user_id_idx" ON "site_view_logs"("user_id");
