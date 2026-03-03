import { Pool } from 'pg'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

let pool: Pool | null = null

interface DbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

function getConnectionConfig(): string | DbConfig {
  // Prefer DATABASE_URL env var
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // Fall back to userData/db-config.json
  const configPath = join(app.getPath('userData'), 'db-config.json')
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf-8')
    return JSON.parse(raw) as DbConfig
  }

  // Default local development config (matches docker-compose.yml)
  return {
    host: 'localhost',
    port: 5432,
    database: 'mail_viewer',
    user: 'mail_viewer',
    password: 'mail_viewer'
  }
}

export function getPool(): Pool {
  if (!pool) {
    const config = getConnectionConfig()
    if (typeof config === 'string') {
      pool = new Pool({ connectionString: config })
    } else {
      pool = new Pool(config)
    }

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err)
    })
  }
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
