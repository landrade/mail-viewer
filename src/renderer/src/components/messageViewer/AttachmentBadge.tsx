import type { Attachment } from '../../types'

interface Props {
  attachment: Attachment
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return '🖼'
  if (contentType.includes('pdf')) return '📄'
  if (contentType.includes('zip') || contentType.includes('archive')) return '🗜'
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊'
  if (contentType.includes('word') || contentType.includes('document')) return '📝'
  return '📎'
}

export function AttachmentBadge({ attachment }: Props) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 border border-zinc-600 text-sm">
      <span>{getIcon(attachment.contentType)}</span>
      <div>
        <div className="text-zinc-200 text-xs font-medium truncate max-w-xs">
          {attachment.filename}
        </div>
        <div className="text-zinc-400 text-xs">{formatSize(attachment.size)}</div>
      </div>
    </div>
  )
}
