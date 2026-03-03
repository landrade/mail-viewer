import { useQuery } from '@tanstack/react-query'
import { ipc } from '../api/ipc'

export function useMessages(accountId: number | null, folderPath: string | null, page = 0) {
  return useQuery({
    queryKey: ['messages', accountId, folderPath, page],
    queryFn: () => ipc.messages.list(accountId!, folderPath!, page),
    enabled: accountId != null && folderPath != null,
    staleTime: 30 * 1000 // 30 seconds
  })
}

export function useMessage(
  accountId: number | null,
  folderPath: string | null,
  uid: number | null
) {
  return useQuery({
    queryKey: ['message', accountId, folderPath, uid],
    queryFn: () => ipc.messages.get(accountId!, folderPath!, uid!),
    enabled: accountId != null && folderPath != null && uid != null,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}
