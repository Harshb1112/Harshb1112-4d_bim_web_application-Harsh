import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseIFCFile } from '@/lib/ifc-parser';
import { 
  getPrimaryResource, 
  getAllResources, 
  groupElementsByCategory, 
  getTaskNameFromCategory 
} from '@/lib/resource-mapper';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const startTime = new Date();
    console.log('\n🚀 ========================================');
    console.log(`⏰ Parse started at: ${startTime.toLocaleString()}`);
    console.log('========================================\n');

    const { id } = await params;
    const modelId = parseInt(id);

    // Get model from database with project info
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!model) {
      console.log('❌ Model not found');
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    console.log('📋 Project Details:');
    console.log(`   Project ID: ${model.project.id}`);
    console.log(`   Project Name: ${model.project.name}`);
    console.log(`   Model ID: ${modelId}`);
    console.log(`   Model Name: ${model.name || 'Unnamed'}`);
    console.log('');

    if (model.source !== 'local_ifc') {
      return NextResponse.json(
        { error: 'Only IFC files can be parsed' },
        { status: 400 }
      );
    }

    if (!model.filePath) {
      return NextResponse.json(
        { error: 'File path not found' },
        { status: 400 }
      );
    }

    // Parse IFC file
    console.log('📂 Parsing IFC file...');
    const parseStart = Date.now();
    const elements = await parseIFCFile(model.filePath);
    const parseTime = ((Date.now() - parseStart) / 1000).toFixed(2);
    console.log(`✅ Parsed ${elements.length} elements in ${parseTime}s\n`);

    // Save elements to database with resources
    console.log('💾 Saving elements to database...');
    const saveStart = Date.now();
    const createdElements = await Promise.all(
      elements.map((element) =>
        prisma.element.create({
          data: {
            modelId,
            guid: element.guid,
            category: element.category,
            family: element.family,
            typeName: element.typeName,
            level: element.level,
            parameters: element.properties,
            resource: getPrimaryResource(element.category), // Auto-assign resource
          },
        })
      )
    );
    const saveTime = ((Date.now() - saveStart) / 1000).toFixed(2);
    console.log(`✅ Saved ${createdElements.length} elements in ${saveTime}s\n`);

    // Group elements by category
    const categoryGroups = groupElementsByCategory(elements);
    console.log('📊 Element Categories:');
    categoryGroups.forEach((count, category) => {
      console.log(`   ${category}: ${count} elements`);
    });
    console.log('');

    // Get project ID from model
    const projectId = model.projectId;

    // Create tasks and resources for each category
    console.log('🔨 Creating tasks and resources...');
    const taskStart = Date.now();
    const createdTasks = [];
    const createdResources = [];

    for (const [category, elementCount] of categoryGroups.entries()) {
      const taskName = getTaskNameFromCategory(category);
      const resources = getAllResources(category);

      console.log(`   📌 Creating task: ${taskName} (${elementCount} elements)`);

      // Create task for this category
      const task = await prisma.task.create({
        data: {
          projectId,
          name: taskName,
          description: `${elementCount} elements from ${category}`,
          status: 'todo',
          progress: 0,
          resource: resources.join(', '), // Store all resources as comma-separated
        },
      });
      createdTasks.push(task);

      // Create/find resources in project
      for (const resourceName of resources) {
        // Check if resource already exists
        const existingResource = await prisma.resource.findFirst({
          where: {
            projectId,
            name: resourceName,
          },
        });

        if (!existingResource) {
          // Create new resource
          const newResource = await prisma.resource.create({
            data: {
              projectId,
              name: resourceName,
              type: getResourceType(resourceName),
              unit: getResourceUnit(resourceName),
            },
          });
          createdResources.push(newResource);

          // Assign resource to task
          await prisma.resourceAssignment.create({
            data: {
              resourceId: newResource.id,
              taskId: task.id,
              quantity: 1,
              status: 'planned',
            },
          });
        } else {
          // Assign existing resource to task
          await prisma.resourceAssignment.create({
            data: {
              resourceId: existingResource.id,
              taskId: task.id,
              quantity: 1,
              status: 'planned',
            },
          });
        }
      }

      // Link elements to task
      const categoryElements = createdElements.filter(
        (el) => el.category === category
      );
      
      await Promise.all(
        categoryElements.map((element) =>
          prisma.elementTaskLink.create({
            data: {
              elementId: element.id,
              taskId: task.id,
              linkType: 'construction',
              status: 'planned',
            },
          })
        )
      );
    }
    
    const taskTime = ((Date.now() - taskStart) / 1000).toFixed(2);
    console.log(`✅ Created ${createdTasks.length} tasks in ${taskTime}s`);
    console.log(`✅ Created ${createdResources.length} new resources\n`);

    const endTime = new Date();
    const totalTime = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);
    
    console.log('========================================');
    console.log('✅ PARSE COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`📋 Project: ${model.project.name}`);
    console.log(`📦 Elements: ${createdElements.length}`);
    console.log(`🔨 Tasks: ${createdTasks.length}`);
    console.log(`🧱 Resources: ${createdResources.length}`);
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log(`⏰ Completed at: ${endTime.toLocaleString()}`);
    console.log('========================================\n');

    return NextResponse.json({
      success: true,
      elementsCount: createdElements.length,
      tasksCount: createdTasks.length,
      resourcesCount: createdResources.length,
      message: `Parsed ${createdElements.length} elements, created ${createdTasks.length} tasks, and ${createdResources.length} resources`,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse IFC file' },
      { status: 500 }
    );
  }
}

// Helper function to determine resource type
function getResourceType(resourceName: string): string {
  const name = resourceName.toLowerCase();
  
  if (name.includes('concrete') || name.includes('cement') || name.includes('mortar')) {
    return 'material';
  }
  if (name.includes('rebar') || name.includes('steel') || name.includes('aluminum')) {
    return 'material';
  }
  if (name.includes('labor') || name.includes('worker')) {
    return 'labor';
  }
  if (name.includes('equipment') || name.includes('machinery')) {
    return 'equipment';
  }
  if (name.includes('excavation') || name.includes('formwork')) {
    return 'labor';
  }
  
  return 'material';
}

// Helper function to determine resource unit
function getResourceUnit(resourceName: string): string {
  const name = resourceName.toLowerCase();
  
  if (name.includes('concrete')) return 'cum';
  if (name.includes('rebar') || name.includes('steel')) return 'kg';
  if (name.includes('bricks')) return 'nos';
  if (name.includes('paint')) return 'ltr';
  if (name.includes('cement')) return 'bags';
  if (name.includes('sand') || name.includes('aggregate')) return 'cum';
  if (name.includes('labor') || name.includes('worker')) return 'days';
  if (name.includes('equipment')) return 'hours';
  if (name.includes('pipes') || name.includes('cables')) return 'mtr';
  if (name.includes('glass') || name.includes('panels')) return 'sqm';
  
  return 'nos';
}
