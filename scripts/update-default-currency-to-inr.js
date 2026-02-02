const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateDefaultCurrency() {
  try {
    console.log('🔄 Updating default currency to INR...\n')
    
    // Get all projects with USD currency
    const usdProjects = await prisma.project.findMany({
      where: {
        currency: 'USD'
      },
      select: {
        id: true,
        name: true,
        currency: true,
        totalBudget: true
      }
    })
    
    if (usdProjects.length === 0) {
      console.log('✅ No projects with USD currency found. All good!')
      return
    }
    
    console.log(`📋 Found ${usdProjects.length} project(s) with USD currency:\n`)
    
    for (const project of usdProjects) {
      console.log(`   - ${project.name} (ID: ${project.id})`)
      console.log(`     Current: USD, Budget: $${project.totalBudget || 0}`)
      
      // Convert budget from USD to INR if budget exists
      let newBudget = project.totalBudget || 0
      if (newBudget > 0) {
        newBudget = Math.round(newBudget * 83.12) // USD to INR conversion
        console.log(`     Converting budget: $${project.totalBudget} → ₹${newBudget}`)
      }
      
      // Update to INR
      await prisma.project.update({
        where: { id: project.id },
        data: { 
          currency: 'INR',
          totalBudget: newBudget
        }
      })
      
      console.log(`     ✅ Updated to INR\n`)
    }
    
    console.log('✨ Done! All projects now use INR as default currency.')
    console.log('\n💡 New projects will automatically use INR')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateDefaultCurrency()
