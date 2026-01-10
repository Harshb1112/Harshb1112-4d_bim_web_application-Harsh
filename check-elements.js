const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkElements() {
  try {
    const count = await prisma.element.count({
      where: {
        model: {
          projectId: 37
        }
      }
    })
    
    console.log('✅ Elements in project 37:', count)
    
    if (count > 0) {
      const sample = await prisma.element.findMany({
        where: {
          model: {
            projectId: 37
          }
        },
        take: 5,
        select: {
          id: true,
          category: true,
          family: true,
          typeName: true,
          model: {
            select: {
              name: true,
              source: true
            }
          }
        }
      })
      
      console.log('\n📊 Sample elements:')
      sample.forEach(el => {
        console.log(`  - ${el.category || 'Unknown'}: ${el.typeName || el.family || 'Unnamed'} (Model: ${el.model.name}, Source: ${el.model.source})`)
      })
    } else {
      console.log('⚠️ No elements found in database!')
      console.log('   AI is using fake sample elements because database is empty.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkElements()
