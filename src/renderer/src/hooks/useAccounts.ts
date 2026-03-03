import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ipc } from '../api/ipc'
import type { AccountInput } from '../types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => ipc.accounts.list()
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AccountInput) => ipc.accounts.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AccountInput }) =>
      ipc.accounts.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ipc.accounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}

export function useDeleteAllAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => ipc.accounts.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (input: AccountInput) => ipc.accounts.testConnection(input)
  })
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useUnseenRefresh() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      try {
        await ipc.accounts.fetchUnseenCounts()
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
        }
      } catch (err) {
        console.error('[unseen] refresh failed:', err)
      }
    }

    refresh()
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [queryClient])
}
