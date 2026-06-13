import { PrismaClient } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

let prismaInstance = globalForPrisma.prisma || new PrismaClient({ adapter })

// Self-healing: If the cached client does not have the 'notification' or 'shoppingList' model (due to hot-reloads), re-create it
if (prismaInstance && (!(prismaInstance as any).notification || !(prismaInstance as any).shoppingList)) {
  prismaInstance = new PrismaClient({ adapter })
}

export const prisma = prismaInstance

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaInstance
}
