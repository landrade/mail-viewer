import { ipcMain } from 'electron'
import { listMessages, getMessage } from '../imap/messageService'
import type { MessageSummary, ParsedMessage } from '../../shared/types'

export function registerMessageHandlers(): void {
  ipcMain.handle(
    'messages:list',
    async (
      _event,
      accountId: number,
      folderPath: string,
      page: number
    ): Promise<MessageSummary[]> => {
      return listMessages(accountId, folderPath, page)
    }
  )

  ipcMain.handle(
    'messages:get',
    async (_event, accountId: number, folderPath: string, uid: number): Promise<ParsedMessage> => {
      return getMessage(accountId, folderPath, uid)
    }
  )
}
