import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/Layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute/ProtectedRoute'
import Login from '@/pages/Login/Login'
import Dashboard from '@/pages/Dashboard/Dashboard'
import TicketList from '@/pages/TicketList/TicketList'
import TicketDetail from '@/pages/TicketDetail/TicketDetail'
import TicketCreate from '@/pages/TicketCreate/TicketCreate'
import TicketImport from '@/pages/TicketImport/TicketImport'
import TemplateManage from '@/pages/TemplateManage/TemplateManage'
import KnowledgeList from '@/pages/Knowledge/KnowledgeList'
import KnowledgeDetail from '@/pages/Knowledge/KnowledgeDetail'
import Reports from '@/pages/Reports/Reports'
import { useUserStore } from '@/store/userStore'
import { useTicketStore } from '@/store/ticketStore'
import { useTemplateStore } from '@/store/templateStore'
import { useNotificationStore } from '@/store/notificationStore'

export default function App() {
  const initAuth = useUserStore((s) => s.initAuth)
  const initTickets = useTicketStore((s) => s.initialize)
  const initTemplates = useTemplateStore((s) => s.initialize)
  const initNotifications = useNotificationStore((s) => s.initialize)

  useEffect(() => {
    initAuth()
    initTickets()
    initTemplates()
    initNotifications()
  }, [initAuth, initTickets, initTemplates, initNotifications])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tickets" element={<TicketList />} />
          <Route path="tickets/create" element={<TicketCreate />} />
          <Route path="tickets/import" element={<TicketImport />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="templates" element={<TemplateManage />} />
          <Route path="knowledge" element={<KnowledgeList />} />
          <Route path="knowledge/:id" element={<KnowledgeDetail />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
