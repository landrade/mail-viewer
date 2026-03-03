import { getConnection } from './connectionManager'
import { simpleParser } from 'mailparser'
import type { MessageSummary, ParsedMessage, Attachment } from '../../shared/types'

const PAGE_SIZE = 50

export async function listMessages(
  accountId: number,
  folderPath: string,
  page: number
): Promise<MessageSummary[]> {
  const client = await getConnection(accountId)
  const lock = await client.getMailboxLock(folderPath)

  try {
    const mailbox = client.mailbox
    if (!mailbox || mailbox.exists === 0) return []

    const total = mailbox.exists
    const end = total - page * PAGE_SIZE
    if (end <= 0) return []

    const start = Math.max(1, end - PAGE_SIZE + 1)
    const range = `${start}:${end}`

    const messages: MessageSummary[] = []

    for await (const msg of client.fetch(range, {
      uid: true,
      flags: true,
      envelope: true,
      bodyStructure: true,
      bodyParts: ['TEXT']
    })) {
      const from = msg.envelope?.from?.[0]
      const fromStr = from
        ? from.name
          ? `${from.name} <${from.address}>`
          : (from.address ?? '')
        : ''

      const flags = msg.flags ?? new Set<string>()
      const seen = flags.has('\\Seen')

      // Detect attachments from body structure
      let hasAttachments = false
      if (msg.bodyStructure) {
        hasAttachments = hasAttachmentParts(msg.bodyStructure)
      }

      // Use text body part for preview
      const textPart = msg.bodyParts?.get('TEXT')
      const preview = textPart
        ? textPart.toString('utf-8').replace(/\s+/g, ' ').slice(0, 120)
        : ''

      messages.push({
        uid: msg.uid,
        seq: msg.seq,
        subject: msg.envelope?.subject ?? '(no subject)',
        from: fromStr,
        date: msg.envelope?.date?.toISOString() ?? '',
        seen,
        hasAttachments,
        textPreview: preview
      })
    }

    // Return newest first
    return messages.reverse()
  } finally {
    lock.release()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasAttachmentParts(structure: any): boolean {
  if (!structure) return false
  if (structure.disposition === 'attachment') return true
  if (Array.isArray(structure.childNodes)) {
    return structure.childNodes.some(hasAttachmentParts)
  }
  return false
}

export async function getMessage(
  accountId: number,
  folderPath: string,
  uid: number
): Promise<ParsedMessage> {
  const client = await getConnection(accountId)
  const lock = await client.getMailboxLock(folderPath)

  try {
    let rawSource: Buffer | null = null

    for await (const msg of client.fetch(
      { uid: uid },
      { uid: true, source: true },
      { uid: true }
    )) {
      rawSource = msg.source ?? null
    }

    if (!rawSource) {
      throw new Error(`Message UID ${uid} not found in ${folderPath}`)
    }

    const parsed = await simpleParser(rawSource)

    const fromAddr = parsed.from?.value?.[0]
    const fromStr = fromAddr
      ? fromAddr.name
        ? `${fromAddr.name} <${fromAddr.address}>`
        : (fromAddr.address ?? '')
      : ''

    const toStr = (parsed.to
      ? Array.isArray(parsed.to)
        ? parsed.to.flatMap((a) => a.value).map((a) => (a.name ? `${a.name} <${a.address}>` : (a.address ?? '')))
        : parsed.to.value.map((a) => (a.name ? `${a.name} <${a.address}>` : (a.address ?? '')))
      : []
    ).join(', ')

    const ccStr = (parsed.cc
      ? Array.isArray(parsed.cc)
        ? parsed.cc.flatMap((a) => a.value).map((a) => (a.name ? `${a.name} <${a.address}>` : (a.address ?? '')))
        : parsed.cc.value.map((a) => (a.name ? `${a.name} <${a.address}>` : (a.address ?? '')))
      : []
    ).join(', ')

    const attachments: Attachment[] = (parsed.attachments ?? []).map((att) => ({
      filename: att.filename ?? 'attachment',
      contentType: att.contentType,
      size: att.size ?? 0,
      contentId: att.contentId ?? undefined
    }))

    return {
      uid,
      subject: parsed.subject ?? '(no subject)',
      from: fromStr,
      to: toStr,
      cc: ccStr || undefined,
      date: parsed.date?.toISOString() ?? '',
      html: parsed.html || undefined,
      text: parsed.text || undefined,
      attachments
    }
  } finally {
    lock.release()
  }
}
