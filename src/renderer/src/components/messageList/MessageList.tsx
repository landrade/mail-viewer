import { useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '../../store/appStore'
import { useMessages } from '../../hooks/useMessages'
import { MessageRow } from './MessageRow'

export function MessageList() {
  const { selectedAccount, selectedFolder } = useAppStore()
  const [page, setPage] = useState(0)
  const parentRef = useRef<HTMLDivElement>(null)

  const { data: messages, isLoading, error } = useMessages(
    selectedAccount?.id ?? null,
    selectedFolder?.path ?? null,
    page
  )

  const rowVirtualizer = useVirtualizer({
    count: messages?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10
  })

  if (!selectedFolder) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 border-r border-zinc-700">
        <p className="text-zinc-500 text-sm">Select a folder</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-200 truncate">{selectedFolder.name}</h2>
        {messages && (
          <span className="text-xs text-zinc-500">{messages.length} messages</span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <div className="text-zinc-500 text-sm animate-pulse">Loading messages...</div>
        </div>
      )}

      {error && (
        <div className="p-4 text-sm text-red-400">Failed to load messages</div>
      )}

      {!isLoading && messages?.length === 0 && (
        <div className="flex items-center justify-center flex-1">
          <p className="text-zinc-500 text-sm">No messages</p>
        </div>
      )}

      {messages && messages.length > 0 && (
        <div ref={parentRef} className="flex-1 overflow-y-auto">
          <div
            style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const message = messages[virtualItem.index]
              return (
                <MessageRow
                  key={message.uid}
                  message={message}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-700 shrink-0">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Newer
        </button>
        <span className="text-xs text-zinc-500">Page {page + 1}</span>
        <button
          disabled={!messages || messages.length < 50}
          onClick={() => setPage((p) => p + 1)}
          className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Older →
        </button>
      </div>
    </div>
  )
}
