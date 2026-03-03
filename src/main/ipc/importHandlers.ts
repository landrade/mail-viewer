import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import { getDb } from '../db/client'
import { encryptPassword } from '../security/storage'
import type { XlsxFileData, XlsxImportConfig, XlsxImportResult } from '../../shared/types'

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
    (_event, config: XlsxImportConfig): XlsxImportResult => {
      const db = getDb()
      const { rows, hasHeader, columns, imapSettings } = config
      const dataRows = hasHeader ? rows.slice(1) : rows

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

        ready.push({ rowNumber, displayName, emailAddress, username, passwordEnc: encryptPassword(password) })
      }

      // Single prepared statement reused across all rows inside one transaction
      const stmt = db.prepare(
        `INSERT INTO accounts (display_name, email_address, imap_host, imap_port, imap_secure, username, password_enc)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (email_address) DO NOTHING`
      )

      const imapSecureInt = imapSettings.imapSecure ? 1 : 0

      let imported = 0

      const runAll = db.transaction((readyRows: ReadyRow[]) => {
        for (const r of readyRows) {
          try {
            const result = stmt.run(
              r.displayName, r.emailAddress,
              imapSettings.imapHost, imapSettings.imapPort, imapSecureInt,
              r.username, r.passwordEnc
            )
            imported += result.changes
          } catch (err) {
            errors.push({ row: r.rowNumber, message: (err as Error).message })
          }
        }
      })

      runAll(ready)

      return { imported, errors }
    }
  )
}
