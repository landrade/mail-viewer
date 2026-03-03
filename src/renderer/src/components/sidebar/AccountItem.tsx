import { useRef, useEffect } from 'react'
import { useState } from 'react'
import type { Account } from '../../types'
import { useAppStore } from '../../store/appStore'
import { useFolders } from '../../hooks/useFolders'
import { FolderItem } from './FolderItem'

interface Props {
  account: Account
  expanded: boolean
  onToggle: () => void
}

export function AccountItem({ account, expanded, onToggle }: Props) {
  const { selectedAccount, setSelectedAccount, openEditAccountModal } = useAppStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isSelected = selectedAccount?.id === account.id
  const { data: folders, isLoading } = useFolders(expanded ? account.id : null)

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const handleClick = () => {
    setSelectedAccount(account)
    onToggle()
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <div>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
          isSelected
            ? 'bg-zinc-700 text-white'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        <span className="text-base">📧</span>
        <div className="flex-1 min-w-0">
          <div className="truncate">{account.displayName}</div>
          <div className="text-xs text-zinc-500 truncate">{account.emailAddress}</div>
        </div>
        {account.unseenCount > 0 && (
          <span className="shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold leading-none">
            {account.unseenCount > 999 ? '999+' : account.unseenCount}
          </span>
        )}
        <span className="text-xs opacity-50">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="mt-1 ml-2">
          {isLoading && (
            <div className="px-3 py-2 text-xs text-zinc-500 animate-pulse">Loading folders...</div>
          )}
          {folders?.map((folder) => (
            <FolderItem key={folder.path} folder={folder} depth={0} />
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-44 rounded-lg bg-zinc-800 border border-zinc-600 shadow-xl py-1 text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full text-left px-4 py-2 text-zinc-200 hover:bg-zinc-700"
            onClick={() => {
              openEditAccountModal(account)
              setContextMenu(null)
            }}
          >
            Edit Account
          </button>
        </div>
      )}
    </div>
  )
}
