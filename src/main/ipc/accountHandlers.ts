import { ipcMain } from 'electron'
import { getPool } from '../db/client'
import { encryptPassword, decryptPassword } from '../security/storage'
import { testConnection, getConnection, closeConnection } from '../imap/connectionManager'
import type { Account, AccountInput, TestConnectionResult, DeleteResult } from '../../shared/types'

const UNSEEN_CONCURRENCY = 20

async function runWithConcurrency(
  ids: number[],
  concurrency: number,
  fn: (id: number) => Promise<void>
): Promise<void> {
  let index = 0
  async function worker() {
    while (index < ids.length) {
      const id = ids[index++]
      await fn(id)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker))
}

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as number,
    displayName: row.display_name as string,
    emailAddress: row.email_address as string,
    imapHost: row.imap_host as string,
    imapPort: row.imap_port as number,
    imapSecure: row.imap_secure as boolean,
    username: row.username as string,
    unseenCount: (row.unseen_count as number) ?? 0,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString()
  }
}

export function registerAccountHandlers(): void {
  ipcMain.handle('accounts:list', async (): Promise<Account[]> => {
    const pool = getPool()
    const result = await pool.query(
      `SELECT id, display_name, email_address, imap_host, imap_port, imap_secure,
              username, unseen_count, created_at, updated_at
       FROM accounts ORDER BY unseen_count DESC, display_name ASC`
    )
    return result.rows.map(rowToAccount)
  })

  ipcMain.handle('accounts:create', async (_event, input: AccountInput): Promise<Account> => {
    const pool = getPool()
    const passwordEnc = encryptPassword(input.password)

    const result = await pool.query(
      `INSERT INTO accounts (display_name, email_address, imap_host, imap_port, imap_secure, username, password_enc)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, display_name, email_address, imap_host, imap_port, imap_secure, username, created_at, updated_at`,
      [
        input.displayName,
        input.emailAddress,
        input.imapHost,
        input.imapPort,
        input.imapSecure,
        input.username,
        passwordEnc
      ]
    )
    return rowToAccount(result.rows[0])
  })

  ipcMain.handle(
    'accounts:update',
    async (_event, id: number, input: AccountInput): Promise<Account> => {
      const pool = getPool()
      const passwordEnc = encryptPassword(input.password)

      const result = await pool.query(
        `UPDATE accounts
         SET display_name = $1, email_address = $2, imap_host = $3, imap_port = $4,
             imap_secure = $5, username = $6, password_enc = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING id, display_name, email_address, imap_host, imap_port, imap_secure, username, created_at, updated_at`,
        [
          input.displayName,
          input.emailAddress,
          input.imapHost,
          input.imapPort,
          input.imapSecure,
          input.username,
          passwordEnc,
          id
        ]
      )

      if (result.rows.length === 0) {
        throw new Error(`Account ${id} not found`)
      }

      // Close existing IMAP connection so it reconnects with new credentials
      await closeConnection(id)

      return rowToAccount(result.rows[0])
    }
  )

  ipcMain.handle('accounts:delete', async (_event, id: number): Promise<DeleteResult> => {
    const pool = getPool()
    await closeConnection(id)
    await pool.query('DELETE FROM accounts WHERE id = $1', [id])
    return { success: true }
  })

  ipcMain.handle(
    'accounts:testConnection',
    async (_event, input: AccountInput): Promise<TestConnectionResult> => {
      try {
        await testConnection({
          host: input.imapHost,
          port: input.imapPort,
          secure: input.imapSecure,
          auth: {
            user: input.username,
            pass: input.password
          }
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('accounts:fetchUnseenCounts', async (): Promise<{ updated: number }> => {
    const pool = getPool()
    const { rows } = await pool.query('SELECT id FROM accounts')
    const ids = rows.map((r) => r.id as number)

    let updated = 0

    await runWithConcurrency(ids, UNSEEN_CONCURRENCY, async (id) => {
      try {
        const client = await getConnection(id)
        const status = await client.status('INBOX', { unseen: true })
        const unseen = status.unseen ?? 0
        await pool.query('UPDATE accounts SET unseen_count = $1 WHERE id = $2', [unseen, id])
        updated++
      } catch (err) {
        console.error(`[unseen] account ${id}:`, (err as Error).message)
      }
    })

    return { updated }
  })
}

export async function getDecryptedPassword(accountId: number): Promise<string> {
  const pool = getPool()
  const result = await pool.query('SELECT password_enc FROM accounts WHERE id = $1', [accountId])
  if (result.rows.length === 0) throw new Error(`Account ${accountId} not found`)
  return decryptPassword(Buffer.from(result.rows[0].password_enc))
}
