/**
 * Script to enable RLS on all tables and create basic policies
 * Run this after enabling RLS in Supabase UI or via migration
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security on all tables...\n');

  const tables = [
    'users', 'notifications', 'push_subscriptions', 'login_sessions',
    'projects', 'project_users', 'models', 'elements', 'element_properties',
    'tasks', 'task_comments', 'dependencies', 'element_task_links',
    'progress_logs', 'element_status', 'activity_logs', 'error_logs',
    'teams', 'team_memberships', 'role_requests', 'resources',
    'resource_assignments', 'resource_costs', 'site_cameras', 'site_captures',
    'daily_site_costs', 'daily_site_progress', 'site_view_logs',
    'api_keys', 'integrations', 'schedule_health', 'daily_logs',
    'safety_incidents', 'toolbox_talks', 'project_files', 'project_backups'
  ];

  try {
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ Enabled RLS on: ${table}`);
    }

    console.log(`\n✨ Successfully enabled RLS on all ${tables.length} tables!`);
    console.log('\n⚠️  IMPORTANT: You now need to create RLS policies for each table.');
    console.log('Without policies, users won\'t be able to access any data.');
    console.log('\nNext steps:');
    console.log('1. Go to Supabase Dashboard > Authentication > Policies');
    console.log('2. Create policies for each table based on your access requirements');
    console.log('3. Or run: node scripts/create-rls-policies.js (if you create that script)');

  } catch (error) {
    console.error('❌ Error enabling RLS:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

enableRLS()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
