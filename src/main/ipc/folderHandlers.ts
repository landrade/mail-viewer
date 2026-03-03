import { ipcMain } from 'electron'
import { listFolders } from '../imap/folderService'
import type { MailboxEntry } from '../../shared/types'

export function registerFolderHandlers(): void {
  ipcMain.handle('folders:list', async (_event, accountId: number): Promise<MailboxEntry[]> => {
    return listFolders(accountId)
  })
}
