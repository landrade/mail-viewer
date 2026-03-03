import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import { getPool } from '../db/client'
import { encryptPassword } from '../security/storage'
import type { XlsxFileData, XlsxImportConfig, XlsxImportResult } from '../../shared/types'

const COLS_PER_ROW = 7
const CHUNK_SIZE = 500

export function registerImportHandlers(): void {
  ipcMain.handle('accounts:openXlsxFile', async (): Promise<XlsxFileData> => {
    const win = BrowserWindow.getAllWindows()[0] ?? null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select spreadsheet',
      filters: [
        { name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) {
      return { rows: [] }
    }

    const buffer = readFileSync(filePaths[0])
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: ''
    }) as string[][]

    return { rows }
  })

  ipcMain.handle(
    'accounts:importFromXlsx',
    async (_event, config: XlsxImportConfig): Promise<XlsxImportResult> => {
      const pool = getPool()
      const { rows, hasHeader, columns, imapSettings } = config
      const dataRows = hasHeader ? rows.slice(1) : rows

      // --- Build typed row objects, collecting blank-field errors upfront ---
      type ReadyRow = {
        rowNumber: number
        displayName: string
        emailAddress: string
        username: string
        passwordEnc: Buffer
      }

      const ready: ReadyRow[] = []
      const errors: Array<{ row: number; message: string }> = []

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        const rowNumber = hasHeader ? i + 2 : i + 1

        const username = (row[columns.username] ?? '').trim()
        const password = (row[columns.password] ?? '').trim()

        if (!username || !password) {
          errors.push({ row: rowNumber, message: 'Username or password is blank' })
          continue
        }

        const displayName =
          columns.displayName !== undefined
            ? (row[columns.displayName] ?? '').trim() || username
            : username

        const emailAddress =
          columns.emailAddress !== undefined
            ? (row[columns.emailAddress] ?? '').trim() || username
            : username

        ready.push({
          rowNumber,
          displayName,
          emailAddress,
          username,
          passwordEnc: encryptPassword(password)
        })
      }

      // --- Insert in chunks of CHUNK_SIZE ---
      let imported = 0

      for (let start = 0; start < ready.length; start += CHUNK_SIZE) {
        const chunk = ready.slice(start, start + CHUNK_SIZE)

        // Build  ($1,$2,...,$7), ($8,...,$14), ...
        const valuePlaceholders = chunk
          .map(
            (_, i) =>
              `($${i * COLS_PER_ROW + 1},$${i * COLS_PER_ROW + 2},$${i * COLS_PER_ROW + 3},$${i * COLS_PER_ROW + 4},$${i * COLS_PER_ROW + 5},$${i * COLS_PER_ROW + 6},$${i * COLS_PER_ROW + 7})`
          )
          .join(',')

        const values = chunk.flatMap((r) => [
          r.displayName,
          r.emailAddress,
          imapSettings.imapHost,
          imapSettings.imapPort,
          imapSettings.imapSecure,
          r.username,
          r.passwordEnc
        ])

        try {
          const result = await pool.query(
            `INSERT INTO accounts
               (display_name, email_address, imap_host, imap_port, imap_secure, username, password_enc)
             VALUES ${valuePlaceholders}
             ON CONFLICT (email_address) DO NOTHING`,
            values
          )
          imported += result.rowCount ?? 0
        } catch (err) {
          // Chunk failed — fall back to per-row inserts to surface individual errors
          for (const r of chunk) {
            try {
              const single = await pool.query(
                `INSERT INTO accounts
                   (display_name, email_address, imap_host, imap_port, imap_secure, username, password_enc)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT (email_address) DO NOTHING`,
                [
                  r.displayName,
                  r.emailAddress,
                  imapSettings.imapHost,
                  imapSettings.imapPort,
                  imapSettings.imapSecure,
                  r.username,
                  r.passwordEnc
                ]
              )
              imported += single.rowCount ?? 0
            } catch (rowErr) {
              errors.push({ row: r.rowNumber, message: (rowErr as Error).message })
            }
          }
        }
      }

      return { imported, errors }
    }
  )
}
