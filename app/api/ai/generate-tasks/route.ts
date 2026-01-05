import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

// Construction sequence knowledge base
const CONSTRUCTION_PHASES = [
  {
    phase: "Site Preparation",
    order: 1,
    categories: ["Site", "Excavation", "Survey"],
    duration: { min: 2, max: 5 },
    description: "Site clearing, surveying, and preparation work"
  },
  {
    phase: "Foundation Work", 
    order: 2,
    categories: ["Foundation", "Footing", "Basement", "Concrete"],
    duration: { min: 5, max: 10 },
    description: "Foundation excavation, reinforcement, and concrete pouring"
  },
  {
    phase: "Structural Frame",
    order: 3, 
    categories: ["Column", "Beam", "Slab", "Steel", "Structural"],
    duration: { min: 10, max: 20 },
    description: "Structural elements installation"
  },
  {
    phase: "Walls & Partitions",
    order: 4,
    categories: ["Wall", "Partition", "Masonry", "Block"],
    duration: { min: 8, max: 15 },
    description: "Wall construction and partitions"
  },
  {
    phase: "Roofing System",
    order: 5,
    categories: ["Roof", "Truss", "Deck", "Membrane"],
    duration: { min: 5, max: 10 },
    description: "Roof structure and covering"
  },
  {
    phase: "MEP Rough-in",
    order: 6,
    categories: ["Pipe", "Duct", "Conduit", "Electrical", "Plumbing", "HVAC"],
    duration: { min: 10, max: 18 },
    description: "Mechanical, electrical, and plumbing rough installation"
  },
  {
    phase: "Exterior Envelope",
    order: 7,
    categories: ["Window", "Door", "Curtain", "Cladding", "Facade"],
    duration: { min: 8, max: 12 },
    description: "Windows, doors, and exterior finishes"
  },
  {
    phase: "Interior Finishes",
    order: 8,
    categories: ["Floor", "Ceiling", "Paint", "Tile", "Finish"],
    duration: { min: 12, max: 20 },
    description: "Interior flooring, ceiling, and finish work"
  },
  {
    phase: "MEP Final",
    order: 9,
    categories: ["Fixture", "Equipment", "Panel", "Device"],
    duration: { min: 5, max: 8 },
    description: "Final MEP installations and testing"
  },
  {
    phase: "Final Cleanup",
    order: 10,
    categories: ["Cleanup", "Inspection", "Commissioning"],
    duration: { min: 2, max: 5 },
    description: "Final cleanup and project closeout"
  }
]

// Task templates based on element types
const TASK_TEMPLATES = {
  "Foundation": [
    { name: "Excavate Foundation", factor: 0.3 },
    { name: "Install Reinforcement", factor: 0.4 },
    { name: "Pour Foundation Concrete", factor: 0.3 }
  ],
  "Column": [
    { name: "Install Column Reinforcement", factor: 0.4 },
    { name: "Erect Column Formwork", factor: 0.3 },
    { name: "Pour Column Concrete", factor: 0.3 }
  ],
  "Wall": [
    { name: "Install Wall Framing", factor: 0.4 },
    { name: "Install Wall Sheathing", factor: 0.3 },
    { name: "Apply Wall Finishes", factor: 0.3 }
  ],
  "Floor": [
    { name: "Install Floor Structure", factor: 0.5 },
    { name: "Install Floor Finishes", factor: 0.5 }
  ],
  "Roof": [
    { name: "Install Roof Structure", factor: 0.4 },
    { name: "Install Roof Covering", factor: 0.3 },
    { name: "Install Roof Accessories", factor: 0.3 }
  ],
  "Door": [
    { name: "Install Door Frames", factor: 0.4 },
    { name: "Install Door Hardware", factor: 0.6 }
  ],
  "Window": [
    { name: "Install Window Frames", factor: 0.5 },
    { name: "Install Window Glazing", factor: 0.5 }
  ]
}

interface ElementGroup {
  category: string
  family: string
  count: number
  elements: any[]
  phase: typeof CONSTRUCTION_PHASES[0]
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { projectId, options = {} } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: Number(projectId),
        ...(user.role === 'admin' || user.role === 'manager'
          ? {}
          : {
              team: {
                members: {
                  some: { userId: user.id }
                }
              }
            })
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    // Get all elements from project models
    const elements = await prisma.element.findMany({
      where: {
        model: {
          projectId: Number(projectId)
        }
      },
      include: {
        properties: true
      }
    })

    if (elements.length === 0) {
      return NextResponse.json({ 
        error: 'No BIM elements found in project. Please upload a model first.' 
      }, { status: 400 })
    }

    console.log(`🤖 AI Task Generation: Analyzing ${elements.length} elements...`)

    // Group elements by category and family
    const elementGroups: Record<string, ElementGroup> = {}
    
    elements.forEach(element => {
      const category = element.category || 'Other'
      const family = element.family || 'Generic'
      const key = `${category}-${family}`
      
      if (!elementGroups[key]) {
        // Find matching construction phase
        const phase = CONSTRUCTION_PHASES.find(p => 
          p.categories.some(cat => 
            category.toLowerCase().includes(cat.toLowerCase()) ||
            family.toLowerCase().includes(cat.toLowerCase())
          )
        ) || CONSTRUCTION_PHASES[CONSTRUCTION_PHASES.length - 1] // Default to last phase
        
        elementGroups[key] = {
          category,
          family,
          count: 0,
          elements: [],
          phase
        }
      }
      
      elementGroups[key].count++
      elementGroups[key].elements.push(element)
    })

    console.log(`📊 Grouped into ${Object.keys(elementGroups).length} element types`)

    // Generate tasks based on element groups
    const generatedTasks: any[] = []
    let taskOrder = 1
    
    // Sort groups by construction phase order
    const sortedGroups = Object.values(elementGroups).sort((a, b) => a.phase.order - b.phase.order)
    
    for (const group of sortedGroups) {
      const { category, family, count, elements, phase } = group
      
      // Get task templates for this category
      const templates = TASK_TEMPLATES[category] || [
        { name: `Install ${category}`, factor: 1.0 }
      ]
      
      // Calculate base duration (more elements = longer duration)
      const baseDuration = Math.max(
        phase.duration.min,
        Math.min(phase.duration.max, Math.ceil(count / 10) + phase.duration.min)
      )
      
      // Create tasks from templates
      for (const template of templates) {
        const taskDuration = Math.max(1, Math.round(baseDuration * template.factor))
        const taskName = template.name.replace(category, `${category} (${family})`)
        
        // Calculate start date based on task order
        const startDate = new Date()
        startDate.setDate(startDate.getDate() + (taskOrder - 1) * 2) // 2 days between task starts
        
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + taskDuration)
        
        generatedTasks.push({
          name: taskName,
          description: `${phase.description} - ${count} ${family} elements`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          durationDays: taskDuration,
          elementCount: count,
          elementIds: elements.map(e => e.id),
          phase: phase.phase,
          phaseOrder: phase.order,
          priority: phase.order <= 3 ? 'high' : phase.order <= 6 ? 'medium' : 'low',
          resource: getResourceType(category),
          estimatedCost: estimateCost(category, count),
          aiGenerated: true,
          metadata: {
            category,
            family,
            elementGuids: elements.map(e => e.guid),
            generatedAt: new Date().toISOString(),
            generatedBy: 'AI Task Generator v1.0'
          }
        })
        
        taskOrder++
      }
    }

    // Add dependencies between phases
    for (let i = 1; i < generatedTasks.length; i++) {
      const currentTask = generatedTasks[i]
      const previousTask = generatedTasks[i - 1]
      
      // Tasks in later phases depend on earlier phases
      if (currentTask.phaseOrder > previousTask.phaseOrder) {
        currentTask.dependencies = currentTask.dependencies || []
        currentTask.dependencies.push(previousTask.name)
      }
    }

    console.log(`✅ Generated ${generatedTasks.length} AI tasks across ${CONSTRUCTION_PHASES.length} phases`)

    return NextResponse.json({
      success: true,
      message: `AI generated ${generatedTasks.length} tasks from ${elements.length} BIM elements`,
      tasks: generatedTasks,
      statistics: {
        totalElements: elements.length,
        elementGroups: Object.keys(elementGroups).length,
        tasksGenerated: generatedTasks.length,
        phases: [...new Set(generatedTasks.map(t => t.phase))],
        estimatedDuration: Math.max(...generatedTasks.map(t => 
          Math.ceil((new Date(t.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        ))
      }
    })

  } catch (error) {
    console.error('AI Task Generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error during AI task generation' },
      { status: 500 }
    )
  }
}

// Helper functions
function getResourceType(category: string): string {
  const resourceMap: Record<string, string> = {
    'Foundation': 'Concrete Crew',
    'Column': 'Structural Team', 
    'Beam': 'Structural Team',
    'Wall': 'Masonry Crew',
    'Floor': 'Flooring Specialists',
    'Roof': 'Roofing Crew',
    'Door': 'Carpentry Team',
    'Window': 'Glazing Specialists',
    'Pipe': 'Plumbing Team',
    'Duct': 'HVAC Team',
    'Electrical': 'Electrical Team'
  }
  
  return resourceMap[category] || 'General Construction'
}

function estimateCost(category: string, count: number): number {
  const costPerUnit: Record<string, number> = {
    'Foundation': 15000, // ₹15,000 per unit
    'Column': 8000,
    'Beam': 6000, 
    'Wall': 3000,
    'Floor': 5000,
    'Roof': 4000,
    'Door': 2500,
    'Window': 3500,
    'Pipe': 1500,
    'Duct': 2000
  }
  
  const unitCost = costPerUnit[category] || 2000
  return unitCost * count
}