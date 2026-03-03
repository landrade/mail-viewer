import { ipcMain } from 'electron'
import { getDb } from '../db/client'
import { encryptPassword, decryptPassword } from '../security/storage'
import { testConnection, getConnection, closeConnection, closeAllConnections } from '../imap/connectionManager'
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
    imapSecure: Boolean(row.imap_secure),
    username: row.username as string,
    unseenCount: (row.unseen_count as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function registerAccountHandlers(): void {
  ipcMain.handle('accounts:list', (): Account[] => {
    const db = getDb()
    const rows = db.prepare(
      `SELECT id, display_name, email_address, imap_host, imap_port, imap_secure,
              username, unseen_count, created_at, updated_at
       FROM accounts ORDER BY unseen_count DESC, display_name ASC`
    ).all() as Record<string, unknown>[]
    return rows.map(rowToAccount)
  })

  ipcMain.handle('accounts:create', (_event, input: AccountInput): Account => {
    const db = getDb()
    const passwordEnc = encryptPassword(input.password)
    const row = db.prepare(
      `INSERT INTO accounts (display_name, email_address, imap_host, imap_port, imap_secure, username, password_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id, display_name, email_address, imap_host, imap_port, imap_secure,
                 username, unseen_count, created_at, updated_at`
    ).get(
      input.displayName, input.emailAddress, input.imapHost, input.imapPort,
      input.imapSecure ? 1 : 0, input.username, passwordEnc
    ) as Record<string, unknown>
    return rowToAccount(row)
  })

  ipcMain.handle(
    'accounts:update',
    async (_event, id: number, input: AccountInput): Promise<Account> => {
      const db = getDb()
      const passwordEnc = encryptPassword(input.password)
      const row = db.prepare(
        `UPDATE accounts
         SET display_name = ?, email_address = ?, imap_host = ?, imap_port = ?,
             imap_secure = ?, username = ?, password_enc = ?, updated_at = datetime('now')
         WHERE id = ?
         RETURNING id, display_name, email_address, imap_host, imap_port, imap_secure,
                   username, unseen_count, created_at, updated_at`
      ).get(
        input.displayName, input.emailAddress, input.imapHost, input.imapPort,
        input.imapSecure ? 1 : 0, input.username, passwordEnc, id
      ) as Record<string, unknown> | undefined

      if (!row) throw new Error(`Account ${id} not found`)

      await closeConnection(id)
      return rowToAccount(row)
    }
  )

  ipcMain.handle('accounts:delete', async (_event, id: number): Promise<DeleteResult> => {
    await closeConnection(id)
    getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('accounts:deleteAll', async (): Promise<{ deleted: number }> => {
    await closeAllConnections()
    const result = getDb().prepare('DELETE FROM accounts').run()
    return { deleted: result.changes }
  })

  ipcMain.handle(
    'accounts:testConnection',
    async (_event, input: AccountInput): Promise<TestConnectionResult> => {
      try {
        await testConnection({
          host: input.imapHost,
          port: input.imapPort,
          secure: input.imapSecure,
          auth: { user: input.username, pass: input.password }
        })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('accounts:fetchUnseenCounts', async (): Promise<{ updated: number }> => {
    const db = getDb()
    const ids = (db.prepare('SELECT id FROM accounts').all() as { id: number }[]).map((r) => r.id)
    const updateStmt = db.prepare('UPDATE accounts SET unseen_count = ? WHERE id = ?')

    let updated = 0

    await runWithConcurrency(ids, UNSEEN_CONCURRENCY, async (id) => {
      try {
        const client = await getConnection(id)
        const status = await client.status('INBOX', { unseen: true })
        updateStmt.run(status.unseen ?? 0, id)
        updated++
      } catch (err) {
        console.error(`[unseen] account ${id}:`, (err as Error).message)
      }
    })

    return { updated }
  })
}

export function getDecryptedPassword(accountId: number): string {
  const row = getDb()
    .prepare('SELECT password_enc FROM accounts WHERE id = ?')
    .get(accountId) as { password_enc: Buffer } | undefined
  if (!row) throw new Error(`Account ${accountId} not found`)
  return decryptPassword(row.password_enc)
}
