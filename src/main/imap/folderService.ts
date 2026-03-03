import { getConnection } from './connectionManager'
import type { MailboxEntry } from '../../shared/types'

export async function listFolders(accountId: number): Promise<MailboxEntry[]> {
  const client = await getConnection(accountId)
  const lock = await client.getMailboxLock('INBOX')

  try {
    const rawList = await client.list()
    return buildTree(rawList)
  } finally {
    lock.release()
  }
}

interface RawMailbox {
  path: string
  name: string
  delimiter: string
  flags: Set<string>
  specialUse?: string
  listed: boolean
  subscribed?: boolean
}

function buildTree(flat: RawMailbox[]): MailboxEntry[] {
  const map = new Map<string, MailboxEntry>()
  const roots: MailboxEntry[] = []

  // Sort so parents always come before children
  const sorted = [...flat].sort((a, b) => a.path.localeCompare(b.path))

  for (const box of sorted) {
    const entry: MailboxEntry = {
      path: box.path,
      name: box.name,
      delimiter: box.delimiter,
      flags: Array.from(box.flags),
      specialUse: box.specialUse,
      listed: box.listed,
      subscribed: box.subscribed,
      children: []
    }
    map.set(box.path, entry)

    if (!box.delimiter) {
      roots.push(entry)
      continue
    }

    const lastDelim = box.path.lastIndexOf(box.delimiter)
    if (lastDelim === -1) {
      roots.push(entry)
    } else {
      const parentPath = box.path.substring(0, lastDelim)
      const parent = map.get(parentPath)
      if (parent) {
        parent.children = parent.children ?? []
        parent.children.push(entry)
      } else {
        roots.push(entry)
      }
    }
  }

  return roots
}
