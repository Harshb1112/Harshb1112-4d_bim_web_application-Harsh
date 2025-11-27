const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

prisma.element.findMany({
  where: { modelId: 1 },
  take: 10,
  select: {
    id: true,
    guid: true,
    typeName: true
  }
}).then(elements => {
  console.log('📦 Elements in database:')
  console.log(JSON.stringify(elements, null, 2))
  prisma.$disconnect()
})
