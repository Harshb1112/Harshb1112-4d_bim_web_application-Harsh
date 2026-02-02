const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProjectDetails() {
  try {
    console.log('🔍 Checking project details (Address & Stakeholders)...\n')
    
    // Get all projects with full details
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        // Budget fields
        currency: true,
        totalBudget: true,
        contingencyPercentage: true,
        // Address fields
        location: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        // Stakeholders (JSON field)
        stakeholders: true
      }
    })
    
    if (projects.length === 0) {
      console.log('❌ No projects found!')
      return
    }
    
    console.log(`✅ Found ${projects.length} project(s):\n`)
    console.log('='.repeat(80))
    
    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. PROJECT: ${project.name} (ID: ${project.id})`)
      console.log('-'.repeat(80))
      
      // Budget Info
      console.log('\n💰 BUDGET:')
      console.log(`   Currency: ${project.currency || 'Not set'}`)
      console.log(`   Total Budget: ${project.totalBudget || 0}`)
      console.log(`   Contingency: ${project.contingencyPercentage || 0}%`)
      
      // Address Info
      console.log('\n📍 ADDRESS:')
      console.log(`   Location: ${project.location || 'Not set'}`)
      console.log(`   City: ${project.city || 'Not set'}`)
      console.log(`   State: ${project.state || 'Not set'}`)
      console.log(`   Country: ${project.country || 'Not set'}`)
      console.log(`   Postal Code: ${project.postalCode || 'Not set'}`)
      
      // Stakeholders Info
      console.log('\n👥 STAKEHOLDERS:')
      if (project.stakeholders && Array.isArray(project.stakeholders)) {
        if (project.stakeholders.length === 0) {
          console.log('   ⚠️  No stakeholders added')
        } else {
          project.stakeholders.forEach((stakeholder, idx) => {
            console.log(`   ${idx + 1}. ${stakeholder.role}:`)
            console.log(`      Name: ${stakeholder.name || 'Not set'}`)
            console.log(`      Company: ${stakeholder.company || 'Not set'}`)
            console.log(`      Email: ${stakeholder.email || 'Not set'}`)
            console.log(`      Phone: ${stakeholder.phone || 'Not set'}`)
          })
        }
      } else {
        console.log('   ⚠️  No stakeholders data')
      }
      
      console.log('\n' + '='.repeat(80))
    })
    
    // Summary
    console.log('\n📊 SUMMARY:')
    const projectsWithAddress = projects.filter(p => p.location || p.city || p.country)
    const projectsWithStakeholders = projects.filter(p => p.stakeholders && Array.isArray(p.stakeholders) && p.stakeholders.length > 0)
    const projectsWithBudget = projects.filter(p => (p.totalBudget || 0) > 0)
    
    console.log(`   Projects with Budget: ${projectsWithBudget.length}/${projects.length}`)
    console.log(`   Projects with Address: ${projectsWithAddress.length}/${projects.length}`)
    console.log(`   Projects with Stakeholders: ${projectsWithStakeholders.length}/${projects.length}`)
    
    if (projectsWithAddress.length === 0) {
      console.log('\n⚠️  No projects have address information!')
      console.log('💡 Go to Settings → Project Address and fill the details')
    }
    
    if (projectsWithStakeholders.length === 0) {
      console.log('\n⚠️  No projects have stakeholders!')
      console.log('💡 Go to Settings → Project Stakeholders and add stakeholders')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProjectDetails()
