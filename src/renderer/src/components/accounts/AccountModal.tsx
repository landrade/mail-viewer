import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppStore } from '../../store/appStore'
import { useCreateAccount, useUpdateAccount, useDeleteAccount, useTestConnection } from '../../hooks/useAccounts'
import type { AccountInput } from '../../types'

const accountSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  emailAddress: z.string().email('Invalid email address'),
  imapHost: z.string().min(1, 'IMAP host is required'),
  imapPort: z.coerce.number().int().min(1).max(65535),
  imapSecure: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

type FormValues = z.infer<typeof accountSchema>

export function AccountModal() {
  const { accountModalOpen, accountModalMode, accountToEdit, closeAccountModal } = useAppStore()
  const { setSelectedAccount } = useAppStore()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const testConnection = useTestConnection()
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      imapPort: 993,
      imapSecure: true
    }
  })

  useEffect(() => {
    if (accountModalOpen) {
      setTestResult(null)
      if (accountToEdit) {
        reset({
          displayName: accountToEdit.displayName,
          emailAddress: accountToEdit.emailAddress,
          imapHost: accountToEdit.imapHost,
          imapPort: accountToEdit.imapPort,
          imapSecure: accountToEdit.imapSecure,
          username: accountToEdit.username,
          password: '' // Never prefill password
        })
      } else {
        reset({
          displayName: '',
          emailAddress: '',
          imapHost: '',
          imapPort: 993,
          imapSecure: true,
          username: '',
          password: ''
        })
      }
    }
  }, [accountModalOpen, accountToEdit, reset])

  const onSubmit = async (data: FormValues) => {
    const input: AccountInput = data
    try {
      if (accountModalMode === 'create') {
        await createAccount.mutateAsync(input)
      } else if (accountToEdit) {
        await updateAccount.mutateAsync({ id: accountToEdit.id, input })
      }
      closeAccountModal()
    } catch (err) {
      console.error('Failed to save account:', err)
    }
  }

  const handleTestConnection = async () => {
    const values = getValues()
    setTestResult(null)
    const result = await testConnection.mutateAsync(values as AccountInput)
    setTestResult(result)
  }

  const handleDelete = async () => {
    if (!accountToEdit) return
    if (!confirm(`Delete account "${accountToEdit.displayName}"?`)) return
    await deleteAccount.mutateAsync(accountToEdit.id)
    setSelectedAccount(null)
    closeAccountModal()
  }

  if (!accountModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 shadow-2xl border border-zinc-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">
            {accountModalMode === 'create' ? 'Add Account' : 'Edit Account'}
          </h2>
          <button
            onClick={closeAccountModal}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Display Name</label>
              <input
                {...register('displayName')}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Gmail"
              />
              {errors.displayName && (
                <p className="mt-1 text-xs text-red-400">{errors.displayName.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Email Address</label>
              <input
                {...register('emailAddress')}
                type="email"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
              {errors.emailAddress && (
                <p className="mt-1 text-xs text-red-400">{errors.emailAddress.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">IMAP Host</label>
              <input
                {...register('imapHost')}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="imap.gmail.com"
              />
              {errors.imapHost && (
                <p className="mt-1 text-xs text-red-400">{errors.imapHost.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">IMAP Port</label>
              <input
                {...register('imapPort')}
                type="number"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.imapPort && (
                <p className="mt-1 text-xs text-red-400">{errors.imapPort.message}</p>
              )}
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                {...register('imapSecure')}
                type="checkbox"
                id="imapSecure"
                className="w-4 h-4 rounded accent-blue-500"
              />
              <label htmlFor="imapSecure" className="text-sm text-zinc-300">
                Use SSL/TLS
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Username</label>
              <input
                {...register('username')}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-400">{errors.username.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Password {accountModalMode === 'edit' && '(leave blank to keep current)'}
              </label>
              <input
                {...register('password')}
                type="password"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="App password or IMAP password"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>
          </div>

          {testResult && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                testResult.ok
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-red-900/50 text-red-300 border border-red-700'
              }`}
            >
              {testResult.ok ? 'Connection successful!' : `Error: ${testResult.error}`}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {accountModalMode === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 text-sm rounded-lg bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-800 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
                className="px-3 py-2 text-sm rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors disabled:opacity-50"
              >
                {testConnection.isPending ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeAccountModal}
                className="px-4 py-2 text-sm rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : accountModalMode === 'create' ? 'Add Account' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
