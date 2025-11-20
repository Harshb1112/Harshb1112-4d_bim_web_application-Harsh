import { PrismaClient } from "@prisma/client/edge";
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

jest.mock('../db', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>()
}))

import { prisma } from '../db'

// Reset mock before each test
beforeEach(() => {
  mockReset(prisma)
})

export const mockPrisma = prisma as unknown as DeepMockProxy<PrismaClient>
