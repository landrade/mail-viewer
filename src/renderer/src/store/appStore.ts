import { create } from 'zustand'
import type { Account, MailboxEntry } from '../types'

interface AppState {
  // Selected account
  selectedAccount: Account | null
  setSelectedAccount: (account: Account | null) => void

  // Selected folder
  selectedFolder: MailboxEntry | null
  setSelectedFolder: (folder: MailboxEntry | null) => void

  // Selected message UID
  selectedMessageUid: number | null
  setSelectedMessageUid: (uid: number | null) => void

  // Account modal state
  accountModalOpen: boolean
  accountModalMode: 'create' | 'edit'
  accountToEdit: Account | null
  openCreateAccountModal: () => void
  openEditAccountModal: (account: Account) => void
  closeAccountModal: () => void

  // Import modal state
  importModalOpen: boolean
  openImportModal: () => void
  closeImportModal: () => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedAccount: null,
  setSelectedAccount: (account) =>
    set({ selectedAccount: account, selectedFolder: null, selectedMessageUid: null }),

  selectedFolder: null,
  setSelectedFolder: (folder) => set({ selectedFolder: folder, selectedMessageUid: null }),

  selectedMessageUid: null,
  setSelectedMessageUid: (uid) => set({ selectedMessageUid: uid }),

  accountModalOpen: false,
  accountModalMode: 'create',
  accountToEdit: null,

  openCreateAccountModal: () =>
    set({ accountModalOpen: true, accountModalMode: 'create', accountToEdit: null }),

  openEditAccountModal: (account) =>
    set({ accountModalOpen: true, accountModalMode: 'edit', accountToEdit: account }),

  closeAccountModal: () => set({ accountModalOpen: false, accountToEdit: null }),

  importModalOpen: false,
  openImportModal: () => set({ importModalOpen: true }),
  closeImportModal: () => set({ importModalOpen: false })
}))
