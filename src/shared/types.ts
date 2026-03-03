// ============================================================
// Shared types used by both main and renderer processes
// ============================================================

export interface Account {
  id: number
  displayName: string
  emailAddress: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  username: string
  unseenCount: number
  createdAt: string
  updatedAt: string
}

export interface AccountInput {
  displayName: string
  emailAddress: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  username: string
  password: string
}

export interface MailboxEntry {
  path: string
  name: string
  delimiter: string
  flags: Set<string> | string[]
  specialUse?: string
  listed: boolean
  subscribed?: boolean
  children?: MailboxEntry[]
}

export interface MessageSummary {
  uid: number
  seq: number
  subject: string
  from: string
  date: string
  seen: boolean
  hasAttachments: boolean
  textPreview: string
}

export interface Attachment {
  filename: string
  contentType: string
  size: number
  contentId?: string
}

export interface ParsedMessage {
  uid: number
  subject: string
  from: string
  to: string
  cc?: string
  date: string
  html?: string
  text?: string
  attachments: Attachment[]
}

export interface TestConnectionResult {
  ok: boolean
  error?: string
}

export interface DeleteResult {
  success: boolean
}

export interface XlsxFileData {
  rows: string[][]
}

export interface XlsxImportConfig {
  rows: string[][]
  hasHeader: boolean
  columns: {
    username: number
    password: number
    displayName?: number
    emailAddress?: number
  }
  imapSettings: {
    imapHost: string
    imapPort: number
    imapSecure: boolean
  }
}

export interface XlsxImportResult {
  imported: number
  errors: Array<{ row: number; message: string }>
}
