import { useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAccounts, useUnseenRefresh, useDeleteAllAccounts } from '../../hooks/useAccounts'
import { useAppStore } from '../../store/appStore'
import { AccountItem } from './AccountItem'

export function Sidebar() {
  const { data: accounts, isLoading, error } = useAccounts()
  const { openCreateAccountModal, openImportModal, setSelectedAccount } = useAppStore()
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const deleteAll = useDeleteAllAccounts()
  useUnseenRefresh()

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL accounts? This cannot be undone.')) return
    setSelectedAccount(null)
    await deleteAll.mutateAsync()
  }
  const parentRef = useRef<HTMLDivElement>(null)

  const accountList = accounts ?? []

  const rowVirtualizer = useVirtualizer({
    count: accountList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height
  })

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 shrink-0">
        <h1 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Accounts</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={openImportModal}
            title="Import from XLSX"
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors text-sm leading-none"
          >
            ↑
          </button>
          <button
            onClick={openCreateAccountModal}
            title="Add account"
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors text-lg leading-none"
          >
            +
          </button>
          {accountList.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deleteAll.isPending}
              title="Delete all accounts"
              className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors text-sm leading-none disabled:opacity-40"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="px-3 py-4 text-xs text-zinc-500 animate-pulse">Loading accounts...</div>
      )}

      {error && (
        <div className="mx-2 mt-2 px-3 py-2 text-xs text-red-400 bg-red-900/20 rounded-md">
          Failed to load accounts
        </div>
      )}

      {accountList.length === 0 && !isLoading && (
        <div className="px-3 py-4 text-xs text-zinc-500 text-center">
          <p>No accounts yet.</p>
          <button
            onClick={openCreateAccountModal}
            className="mt-2 text-blue-400 hover:text-blue-300 underline"
          >
            Add your first account
          </button>
        </div>
      )}

      {accountList.length > 0 && (
        <div ref={parentRef} className="flex-1 overflow-y-auto p-2">
          <div
            style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const account = accountList[virtualItem.index]
              return (
                <div
                  key={account.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  <AccountItem
                    account={account}
                    expanded={expandedIds.has(account.id)}
                    onToggle={() => toggleExpanded(account.id)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
