import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  Account,
  AccountInput,
  MailboxEntry,
  MessageSummary,
  ParsedMessage,
  TestConnectionResult,
  DeleteResult,
  XlsxFileData,
  XlsxImportConfig,
  XlsxImportResult
} from '../shared/types'

// Custom API exposed to renderer
const api = {
  accounts: {
    list: (): Promise<Account[]> => ipcRenderer.invoke('accounts:list'),

    create: (input: AccountInput): Promise<Account> =>
      ipcRenderer.invoke('accounts:create', input),

    update: (id: number, input: AccountInput): Promise<Account> =>
      ipcRenderer.invoke('accounts:update', id, input),

    delete: (id: number): Promise<DeleteResult> => ipcRenderer.invoke('accounts:delete', id),

    testConnection: (input: AccountInput): Promise<TestConnectionResult> =>
      ipcRenderer.invoke('accounts:testConnection', input),

    fetchUnseenCounts: (): Promise<{ updated: number }> =>
      ipcRenderer.invoke('accounts:fetchUnseenCounts')
  },

  folders: {
    list: (accountId: number): Promise<MailboxEntry[]> =>
      ipcRenderer.invoke('folders:list', accountId)
  },

  messages: {
    list: (accountId: number, folderPath: string, page: number): Promise<MessageSummary[]> =>
      ipcRenderer.invoke('messages:list', accountId, folderPath, page),

    get: (accountId: number, folderPath: string, uid: number): Promise<ParsedMessage> =>
      ipcRenderer.invoke('messages:get', accountId, folderPath, uid)
  },

  import: {
    openXlsxFile: (): Promise<XlsxFileData> => ipcRenderer.invoke('accounts:openXlsxFile'),

    importFromXlsx: (config: XlsxImportConfig): Promise<XlsxImportResult> =>
      ipcRenderer.invoke('accounts:importFromXlsx', config)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
// Conditionally expose based on context isolation
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in global scope)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export type ApiType = typeof api
