import { ImapFlow, ImapFlowOptions } from 'imapflow'
import { getPool } from '../db/client'
import { decryptPassword } from '../security/storage'

const connections = new Map<number, ImapFlow>()

async function getAccountCredentials(accountId: number): Promise<ImapFlowOptions> {
  const pool = getPool()
  const result = await pool.query(
    `SELECT imap_host, imap_port, imap_secure, username, password_enc
     FROM accounts WHERE id = $1`,
    [accountId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Account ${accountId} not found`)
  }

  const row = result.rows[0]
  const password = decryptPassword(Buffer.from(row.password_enc))

  return {
    host: row.imap_host,
    port: row.imap_port,
    secure: row.imap_secure,
    auth: {
      user: row.username,
      pass: password
    },
    logger: false
  }
}

export async function getConnection(accountId: number): Promise<ImapFlow> {
  let client = connections.get(accountId)

  if (client && client.usable) {
    return client
  }

  // Close stale connection if any
  if (client) {
    try {
      await client.logout()
    } catch {
      // ignore errors on stale connections
    }
    connections.delete(accountId)
  }

  const options = await getAccountCredentials(accountId)
  client = new ImapFlow(options)

  client.on('close', () => {
    connections.delete(accountId)
  })

  client.on('error', (err) => {
    console.error(`[IMAP] Account ${accountId} error:`, err.message)
    connections.delete(accountId)
  })

  await client.connect()
  connections.set(accountId, client)
  return client
}

export async function closeConnection(accountId: number): Promise<void> {
  const client = connections.get(accountId)
  if (client) {
    try {
      await client.logout()
    } catch {
      // ignore
    }
    connections.delete(accountId)
  }
}

export async function closeAllConnections(): Promise<void> {
  const ids = Array.from(connections.keys())
  await Promise.allSettled(ids.map((id) => closeConnection(id)))
}

export async function testConnection(options: ImapFlowOptions): Promise<void> {
  const client = new ImapFlow({ ...options, logger: false })
  await client.connect()
  await client.logout()
}
