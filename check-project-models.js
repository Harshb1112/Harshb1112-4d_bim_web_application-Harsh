const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkModels() {
  try {
    console.log('=== CHECKING ALL PROJECT MODELS ===\n')
    
    const projects = await prisma.project.findMany({
      include: {
        models: true
      }
    })
    
    for (const project of projects) {
      console.log(`\n📁 Project: ${project.name} (ID: ${project.id})`)
      console.log(`   Models: ${project.models.length}`)
      
      for (const model of project.models) {
        console.log(`\n   📦 Model: ${model.name} (ID: ${model.id})`)
        console.log(`      Source: ${model.source}`)
        console.log(`      File Path: ${model.filePath || 'N/A'}`)
        console.log(`      Source URL: ${model.sourceUrl || 'N/A'}`)
        console.log(`      Source ID: ${model.sourceId || 'N/A'}`)
        console.log(`      Speckle URL: ${model.speckleUrl || 'N/A'}`)
        
        // Check if file exists
        if (model.filePath) {
          const fs = require('fs')
          const exists = fs.existsSync(model.filePath)
          console.log(`      File Exists: ${exists ? '✅ Yes' : '❌ No'}`)
          
          if (exists) {
            const stats = fs.statSync(model.filePath)
            console.log(`      File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
          }
        }
      }
    }
    
    console.log('\n=== END ===')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkModels()
