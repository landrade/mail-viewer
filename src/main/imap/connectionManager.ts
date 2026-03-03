import { ImapFlow, ImapFlowOptions } from 'imapflow'
import { getDb } from '../db/client'
import { decryptPassword } from '../security/storage'

const connections = new Map<number, ImapFlow>()

function getAccountCredentials(accountId: number): ImapFlowOptions {
  const row = getDb()
    .prepare('SELECT imap_host, imap_port, imap_secure, username, password_enc FROM accounts WHERE id = ?')
    .get(accountId) as { imap_host: string; imap_port: number; imap_secure: number; username: string; password_enc: Buffer } | undefined

  if (!row) throw new Error(`Account ${accountId} not found`)

  return {
    host: row.imap_host,
    port: row.imap_port,
    secure: Boolean(row.imap_secure),
    auth: {
      user: row.username,
      pass: decryptPassword(row.password_enc)
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

  const options = getAccountCredentials(accountId)
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
