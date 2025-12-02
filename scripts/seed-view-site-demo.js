/**
 * Seed demo data for View Site feature
 * Run: node scripts/seed-view-site-demo.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding View Site demo data...')

  // Get first project
  const project = await prisma.project.findFirst({
    orderBy: { id: 'asc' }
  })

  if (!project) {
    console.log('❌ No project found. Please create a project first.')
    return
  }

  console.log(`📁 Using project: ${project.name} (ID: ${project.id})`)

  // Update project with location
  await prisma.project.update({
    where: { id: project.id },
    data: {
      location: 'Sector 62, Noida, Uttar Pradesh',
      latitude: 28.6273,
      longitude: 77.3714
    }
  })

  // Add demo cameras - Hikvision pole-mounted 360° camera
  const cameras = await Promise.all([
    prisma.siteCamera.create({
      data: {
        projectId: project.id,
        name: 'Main Site Camera (Pole-mounted)',
        cameraType: '360',
        brand: 'Hikvision',
        model: 'DS-2CD6986F-H PanoVu',
        streamUrl: 'rtsp://admin:password@192.168.1.100:554/Streaming/Channels/103',
        snapshotUrl: 'http://admin:password@192.168.1.100/ISAPI/Streaming/channels/103/picture',
        location: 'Main Entrance Pole - 15m Height',
        latitude: 28.6273,
        longitude: 77.3714,
        altitude: 15,
        isActive: true,
        isLive: true,
        settings: {
          resolution: '4096x1800',
          frameRate: 25,
          codec: 'H.265',
          panoramicMode: true
        }
      }
    }),
    prisma.siteCamera.create({
      data: {
        projectId: project.id,
        name: 'Tower A Camera',
        cameraType: '360',
        brand: 'Hikvision',
        model: 'DS-2CD6365G0E-IVS',
        streamUrl: 'rtsp://admin:password@192.168.1.101:554/Streaming/Channels/101',
        location: 'Tower A, Floor 5 Corner',
        isActive: true,
        isLive: false
      }
    }),
    prisma.siteCamera.create({
      data: {
        projectId: project.id,
        name: 'Site Overview Camera',
        cameraType: 'fixed',
        brand: 'Hikvision',
        model: 'DS-2CD2T87G2-L',
        streamUrl: 'rtsp://admin:password@192.168.1.102:554/Streaming/Channels/101',
        location: 'Site Office Rooftop',
        isActive: true,
        isLive: false
      }
    })
  ])

  console.log(`📷 Created ${cameras.length} cameras`)

  // Add demo captures (last 30 days)
  const captureTypes = ['360_photo', '360_video', 'drone', 'photo']
  const weathers = ['sunny', 'cloudy', 'overcast', 'rainy']
  const captures = []

  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // 2-4 captures per day
    const capturesPerDay = Math.floor(Math.random() * 3) + 2
    
    for (let j = 0; j < capturesPerDay; j++) {
      const captureDate = new Date(date)
      captureDate.setHours(8 + j * 3, Math.floor(Math.random() * 60), 0)
      
      captures.push({
        projectId: project.id,
        cameraId: cameras[Math.floor(Math.random() * cameras.length)].id,
        captureType: captureTypes[Math.floor(Math.random() * captureTypes.length)],
        url: `https://storage.example.com/captures/${project.id}/day-${i}-capture-${j}.jpg`,
        thumbnailUrl: `https://storage.example.com/captures/${project.id}/thumbs/day-${i}-capture-${j}.jpg`,
        capturedAt: captureDate,
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        temperature: 25 + Math.floor(Math.random() * 15),
        notes: j === 0 ? `Morning site inspection - Day ${30 - i}` : null,
        isProcessed: true
      })
    }
  }

  await prisma.siteCapture.createMany({ data: captures })
  console.log(`📸 Created ${captures.length} captures`)

  // Add demo costs (last 30 days)
  const costCategories = ['labor', 'material', 'equipment', 'subcontractor', 'overhead']
  const costs = []

  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    // Labor costs
    costs.push({
      projectId: project.id,
      date,
      category: 'labor',
      description: 'Daily labor wages',
      quantity: 15 + Math.floor(Math.random() * 10),
      unit: 'workers',
      unitCost: 800,
      totalCost: (15 + Math.floor(Math.random() * 10)) * 800,
      currency: 'INR',
      notes: 'Regular construction workers'
    })

    // Material costs (random days)
    if (Math.random() > 0.3) {
      const materials = [
        { desc: 'Cement bags', qty: 50, unit: 'bags', cost: 350 },
        { desc: 'Steel rods', qty: 100, unit: 'kg', cost: 75 },
        { desc: 'Bricks', qty: 1000, unit: 'pieces', cost: 8 },
        { desc: 'Sand', qty: 5, unit: 'trucks', cost: 8000 },
        { desc: 'Aggregate', qty: 3, unit: 'trucks', cost: 12000 }
      ]
      const mat = materials[Math.floor(Math.random() * materials.length)]
      costs.push({
        projectId: project.id,
        date,
        category: 'material',
        description: mat.desc,
        quantity: mat.qty,
        unit: mat.unit,
        unitCost: mat.cost,
        totalCost: mat.qty * mat.cost,
        currency: 'INR',
        vendor: ['ABC Suppliers', 'XYZ Materials', 'BuildMart'][Math.floor(Math.random() * 3)]
      })
    }

    // Equipment costs (some days)
    if (Math.random() > 0.5) {
      costs.push({
        projectId: project.id,
        date,
        category: 'equipment',
        description: ['Crane rental', 'Excavator', 'Concrete mixer'][Math.floor(Math.random() * 3)],
        quantity: 1,
        unit: 'day',
        unitCost: 15000 + Math.floor(Math.random() * 10000),
        totalCost: 15000 + Math.floor(Math.random() * 10000),
        currency: 'INR'
      })
    }
  }

  await prisma.dailySiteCost.createMany({ data: costs })
  console.log(`💰 Created ${costs.length} cost entries`)

  // Add demo progress entries
  const progressEntries = []
  const workDescriptions = [
    'Foundation excavation work',
    'RCC column casting',
    'Beam reinforcement',
    'Slab shuttering',
    'Brick masonry work',
    'Plumbing rough-in',
    'Electrical conduit installation',
    'Plastering work',
    'Waterproofing application',
    'Floor tiling'
  ]

  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    progressEntries.push({
      projectId: project.id,
      date,
      workDescription: workDescriptions[Math.floor(Math.random() * workDescriptions.length)],
      teamName: ['Team A', 'Team B', 'Team C'][Math.floor(Math.random() * 3)],
      workersCount: 10 + Math.floor(Math.random() * 15),
      hoursWorked: 8 + Math.random() * 2,
      progressPercent: Math.random() * 5,
      weather: weathers[Math.floor(Math.random() * weathers.length)],
      issues: Math.random() > 0.8 ? 'Minor delay due to material shortage' : null
    })
  }

  await prisma.dailySiteProgress.createMany({ data: progressEntries })
  console.log(`📊 Created ${progressEntries.length} progress entries`)

  console.log('\n✅ View Site demo data seeded successfully!')
  console.log(`\n🔗 Visit: /project/${project.id}/view-site to see the feature`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
