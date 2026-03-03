import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/sidebar/Sidebar'
import { MessageList } from './components/messageList/MessageList'
import { MessageViewer } from './components/messageViewer/MessageViewer'
import { AccountModal } from './components/accounts/AccountModal'
import { ImportModal } from './components/accounts/ImportModal'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen grid grid-cols-[240px_320px_1fr] overflow-hidden bg-zinc-950 text-zinc-100">
        <Sidebar />
        <MessageList />
        <MessageViewer />
      </div>
      <AccountModal />
      <ImportModal />
    </QueryClientProvider>
  )
}
