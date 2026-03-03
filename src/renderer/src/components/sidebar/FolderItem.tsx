import { useState } from 'react'
import type { MailboxEntry } from '../../types'
import { useAppStore } from '../../store/appStore'

interface Props {
  folder: MailboxEntry
  depth?: number
}

const SPECIAL_USE_ICONS: Record<string, string> = {
  '\\Inbox': '📥',
  '\\Sent': '📤',
  '\\Drafts': '📝',
  '\\Trash': '🗑',
  '\\Junk': '🚫',
  '\\Spam': '🚫',
  '\\Archive': '📦',
  '\\All': '📬',
  '\\Flagged': '⭐'
}

export function FolderItem({ folder, depth = 0 }: Props) {
  const { selectedFolder, setSelectedFolder } = useAppStore()
  const [expanded, setExpanded] = useState(depth === 0)

  const hasChildren = folder.children && folder.children.length > 0
  const isSelected = selectedFolder?.path === folder.path
  const icon = folder.specialUse ? (SPECIAL_USE_ICONS[folder.specialUse] ?? '📁') : '📁'

  return (
    <div>
      <button
        onClick={() => {
          setSelectedFolder(folder)
          if (hasChildren) setExpanded((e) => !e)
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors text-left ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
        }`}
        style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
      >
        {hasChildren && (
          <span className="text-xs opacity-60 w-3 shrink-0">{expanded ? '▾' : '▸'}</span>
        )}
        {!hasChildren && <span className="w-3 shrink-0" />}
        <span className="text-xs">{icon}</span>
        <span className="truncate">{folder.name}</span>
      </button>

      {hasChildren && expanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderItem key={child.path} folder={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
