-- Enable Row Level Security (RLS) on all tables
-- This migration enables RLS on all 36 tables in the database

-- 1. Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Push Subscriptions table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Login Sessions table
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 6. Project Users table
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- 7. Models table
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- 8. Elements table
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

-- 9. Element Properties table
ALTER TABLE element_properties ENABLE ROW LEVEL SECURITY;

-- 10. Tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 11. Task Comments table
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- 12. Dependencies table
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;

-- 13. Element Task Links table
ALTER TABLE element_task_links ENABLE ROW LEVEL SECURITY;

-- 14. Progress Logs table
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- 15. Element Status table
ALTER TABLE element_status ENABLE ROW LEVEL SECURITY;

-- 16. Activity Logs table
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 17. Error Logs table
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 18. Teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 19. Team Memberships table
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- 20. Role Requests table
ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;

-- 21. Resources table
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- 22. Resource Assignments table
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;

-- 23. Resource Costs table
ALTER TABLE resource_costs ENABLE ROW LEVEL SECURITY;

-- 24. Site Cameras table
ALTER TABLE site_cameras ENABLE ROW LEVEL SECURITY;

-- 25. Site Captures table
ALTER TABLE site_captures ENABLE ROW LEVEL SECURITY;

-- 26. Daily Site Costs table
ALTER TABLE daily_site_costs ENABLE ROW LEVEL SECURITY;

-- 27. Daily Site Progress table
ALTER TABLE daily_site_progress ENABLE ROW LEVEL SECURITY;

-- 28. Site View Logs table
ALTER TABLE site_view_logs ENABLE ROW LEVEL SECURITY;

-- 29. API Keys table
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 30. Integrations table
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- 31. Schedule Health table
ALTER TABLE schedule_health ENABLE ROW LEVEL SECURITY;

-- 32. Daily Logs table
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- 33. Safety Incidents table
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

-- 34. Toolbox Talks table
ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;

-- 35. Project Files table
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- 36. Project Backups table
ALTER TABLE project_backups ENABLE ROW LEVEL SECURITY;
