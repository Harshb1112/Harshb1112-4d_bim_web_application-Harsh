/**
 * Check for duplicate models in the database
 * This script helps identify projects with duplicate model entries
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDuplicateModels() {
  try {
    console.log('🔍 Checking for duplicate models...\n');

    // Get all projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { models: true }
        }
      }
    });

    console.log(`Found ${projects.length} projects\n`);

    let totalDuplicates = 0;
    const projectsWithDuplicates = [];

    for (const project of projects) {
      if (project._count.models === 0) continue;

      // Get all models for this project
      const models = await prisma.model.findMany({
        where: { projectId: project.id },
        orderBy: { uploadedAt: 'desc' }
      });

      // Group by source and identifier
      const groups = new Map();

      for (const model of models) {
        let key = `${model.source}`;
        
        if (model.source === 'speckle' && model.sourceId) {
          key += `_${model.sourceId}`;
        } else if ((model.source === 'autodesk_acc' || model.source === 'autodesk_drive') && model.sourceId) {
          key += `_${model.sourceId}`;
        } else if ((model.source === 'local' || model.source === 'network') && model.name) {
          key += `_${model.name}`;
        }

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(model);
      }

      // Find duplicates
      const duplicates = [];
      for (const [key, group] of groups.entries()) {
        if (group.length > 1) {
          duplicates.push({ key, count: group.length, models: group });
        }
      }

      if (duplicates.length > 0) {
        projectsWithDuplicates.push({
          project,
          duplicates
        });

        console.log(`❌ Project: ${project.name} (ID: ${project.id})`);
        console.log(`   Total models: ${models.length}`);
        console.log(`   Duplicate groups: ${duplicates.length}`);
        
        for (const dup of duplicates) {
          console.log(`   - ${dup.key}: ${dup.count} duplicates`);
          totalDuplicates += dup.count - 1; // -1 because we keep one
        }
        console.log('');
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Projects with duplicates: ${projectsWithDuplicates.length}`);
    console.log(`   Total duplicate models: ${totalDuplicates}`);

    if (projectsWithDuplicates.length > 0) {
      console.log('\n💡 To clean up duplicates, use the cleanup API:');
      console.log('   POST /api/models/cleanup-duplicates');
      console.log('   { "projectId": <id>, "dryRun": true }');
    } else {
      console.log('\n✅ No duplicates found! Your database is clean.');
    }

    // Show storage impact
    if (totalDuplicates > 0) {
      const duplicateModels = await prisma.model.findMany({
        where: {
          projectId: {
            in: projectsWithDuplicates.map(p => p.project.id)
          }
        },
        select: {
          fileSize: true
        }
      });

      const totalSize = duplicateModels.reduce((sum, m) => sum + (m.fileSize || 0), 0);
      const estimatedWaste = (totalSize / models.length) * totalDuplicates;
      
      console.log(`\n💾 Estimated wasted storage: ${(estimatedWaste / 1024 / 1024 / 1024).toFixed(2)} GB`);
    }

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateModels();
