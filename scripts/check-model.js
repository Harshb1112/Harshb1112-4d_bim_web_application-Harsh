const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

prisma.model.findFirst({
  where: { projectId: 2 }
}).then(model => {
  console.log('📦 Model:', JSON.stringify(model, null, 2))
  prisma.$disconnect()
})
