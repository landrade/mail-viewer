import type { MessageSummary } from '../../types'
import { useAppStore } from '../../store/appStore'

interface Props {
  message: MessageSummary
  style?: React.CSSProperties
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isThisYear = d.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

export function MessageRow({ message, style }: Props) {
  const { selectedMessageUid, setSelectedMessageUid } = useAppStore()
  const isSelected = selectedMessageUid === message.uid

  return (
    <div
      style={style}
      onClick={() => setSelectedMessageUid(message.uid)}
      className={`px-3 py-3 cursor-pointer border-b border-zinc-800 transition-colors ${
        isSelected ? 'bg-blue-600' : 'hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className={`text-sm truncate flex-1 ${
            !message.seen
              ? isSelected
                ? 'font-bold text-white'
                : 'font-bold text-zinc-100'
              : isSelected
                ? 'text-white'
                : 'text-zinc-300'
          }`}
        >
          {message.from || '(unknown sender)'}
        </span>
        <span
          className={`text-xs shrink-0 ${isSelected ? 'text-blue-200' : 'text-zinc-500'}`}
        >
          {formatDate(message.date)}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm truncate ${
              !message.seen
                ? isSelected
                  ? 'font-semibold text-white'
                  : 'font-semibold text-zinc-100'
                : isSelected
                  ? 'text-blue-100'
                  : 'text-zinc-300'
            }`}
          >
            {message.subject}
          </p>
          <p
            className={`text-xs truncate mt-0.5 ${
              isSelected ? 'text-blue-200' : 'text-zinc-500'
            }`}
          >
            {message.textPreview}
          </p>
        </div>
        {message.hasAttachments && (
          <span className="text-xs shrink-0 mt-0.5" title="Has attachments">
            📎
          </span>
        )}
      </div>
    </div>
  )
}
