import { useQuery } from '@tanstack/react-query'
import { ipc } from '../api/ipc'

export function useFolders(accountId: number | null) {
  return useQuery({
    queryKey: ['folders', accountId],
    queryFn: () => ipc.folders.list(accountId!),
    enabled: accountId != null,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}
