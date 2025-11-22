import { PrismaClient } from "@/generated/prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

jest.mock("../db", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

import { prisma } from "../db";

beforeEach(() => {
  mockReset(prisma);
});

export const mockPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;
