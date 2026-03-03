import { useAppStore } from '../../store/appStore'
import { useMessage } from '../../hooks/useMessages'
import { AttachmentBadge } from './AttachmentBadge'

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

export function MessageViewer() {
  const { selectedAccount, selectedFolder, selectedMessageUid } = useAppStore()

  const { data: message, isLoading, error } = useMessage(
    selectedAccount?.id ?? null,
    selectedFolder?.path ?? null,
    selectedMessageUid
  )

  if (!selectedMessageUid) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <p className="text-zinc-600 text-sm">Select a message to read</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <div className="text-zinc-500 text-sm animate-pulse">Loading message...</div>
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <p className="text-red-400 text-sm">Failed to load message</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0 space-y-2">
        <h2 className="text-lg font-semibold text-white leading-tight">{message.subject}</h2>

        <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
          <span className="text-zinc-500">From</span>
          <span className="text-zinc-200">{message.from}</span>

          <span className="text-zinc-500">To</span>
          <span className="text-zinc-300">{message.to}</span>

          {message.cc && (
            <>
              <span className="text-zinc-500">Cc</span>
              <span className="text-zinc-300">{message.cc}</span>
            </>
          )}

          <span className="text-zinc-500">Date</span>
          <span className="text-zinc-400">{formatDate(message.date)}</span>
        </div>

        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.attachments.map((att, i) => (
              <AttachmentBadge key={i} attachment={att} />
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {message.html ? (
          <iframe
            srcDoc={message.html}
            sandbox="allow-same-origin"
            className="w-full h-full bg-white"
            title="Email content"
          />
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {message.text ?? '(no content)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
