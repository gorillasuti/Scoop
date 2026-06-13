import fs from 'fs'
import path from 'path'

let databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  try {
    const envPath = path.join(process.cwd(), '.env')
    const envFile = fs.readFileSync(envPath, 'utf8')
    const match = envFile.match(/^DATABASE_URL=["']?([^"'\r\n]+)/m)
    if (match) {
      databaseUrl = match[1]
    }
  } catch (err) {
    console.error("Failed to read .env file for database URL:", err)
  }
}

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
}
