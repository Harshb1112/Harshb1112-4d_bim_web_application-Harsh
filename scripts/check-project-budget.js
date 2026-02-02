const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProjectBudget() {
  try {
    console.log('🔍 Checking project budgets in database...\n')
    
    // Get all projects with budget info
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        currency: true,
        budget: true,
        totalBudget: true,
        contingencyPercentage: true
      }
    })
    
    if (projects.length === 0) {
      console.log('❌ No projects found!')
      return
    }
    
    console.log(`✅ Found ${projects.length} project(s):\n`)
    
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (ID: ${project.id})`)
      console.log(`   Currency: ${project.currency}`)
      console.log(`   Old Budget Field: ${project.budget || 0}`)
      console.log(`   New Total Budget: ${project.totalBudget || 0}`)
      console.log(`   Contingency: ${project.contingencyPercentage || 0}%`)
      console.log('')
    })
    
    // Check if any project has budget set
    const projectsWithBudget = projects.filter(p => (p.totalBudget || p.budget) > 0)
    
    if (projectsWithBudget.length === 0) {
      console.log('⚠️  No projects have budget set!')
      console.log('\n💡 Solution:')
      console.log('   1. Go to Project → Settings tab')
      console.log('   2. Enter budget in "Total Project Budget" field')
      console.log('   3. Click "Save Settings" button')
      console.log('   4. Check for success message')
    } else {
      console.log(`✅ ${projectsWithBudget.length} project(s) have budget set`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProjectBudget()
