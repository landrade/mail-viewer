import type {
  Account,
  AccountInput,
  MailboxEntry,
  MessageSummary,
  ParsedMessage,
  TestConnectionResult,
  DeleteResult,
  DeleteAllResult,
  XlsxFileData,
  XlsxImportConfig,
  XlsxImportResult
} from '../types'

// Typed wrappers over the preload bridge (window.api)
declare global {
  interface Window {
    api: {
      accounts: {
        list(): Promise<Account[]>
        create(input: AccountInput): Promise<Account>
        update(id: number, input: AccountInput): Promise<Account>
        delete(id: number): Promise<DeleteResult>
        testConnection(input: AccountInput): Promise<TestConnectionResult>
        fetchUnseenCounts(): Promise<{ updated: number }>
        deleteAll(): Promise<DeleteAllResult>
      }
      folders: {
        list(accountId: number): Promise<MailboxEntry[]>
      }
      messages: {
        list(accountId: number, folderPath: string, page: number): Promise<MessageSummary[]>
        get(accountId: number, folderPath: string, uid: number): Promise<ParsedMessage>
      }
      import: {
        openXlsxFile(): Promise<XlsxFileData>
        importFromXlsx(config: XlsxImportConfig): Promise<XlsxImportResult>
      }
    }
  }
}

export const ipc = {
  accounts: {
    list: () => window.api.accounts.list(),
    create: (input: AccountInput) => window.api.accounts.create(input),
    update: (id: number, input: AccountInput) => window.api.accounts.update(id, input),
    delete: (id: number) => window.api.accounts.delete(id),
    testConnection: (input: AccountInput) => window.api.accounts.testConnection(input),
    fetchUnseenCounts: () => window.api.accounts.fetchUnseenCounts(),
    deleteAll: () => window.api.accounts.deleteAll()
  },
  folders: {
    list: (accountId: number) => window.api.folders.list(accountId)
  },
  messages: {
    list: (accountId: number, folderPath: string, page: number) =>
      window.api.messages.list(accountId, folderPath, page),
    get: (accountId: number, folderPath: string, uid: number) =>
      window.api.messages.get(accountId, folderPath, uid)
  },
  import: {
    openXlsxFile: () => window.api.import.openXlsxFile(),
    importFromXlsx: (config: XlsxImportConfig) => window.api.import.importFromXlsx(config)
  }
}
