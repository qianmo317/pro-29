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
import ScheduledTickets from '@/pages/ScheduledTickets/ScheduledTickets'
import TemplateManage from '@/pages/TemplateManage/TemplateManage'
import KnowledgeList from '@/pages/Knowledge/KnowledgeList'
import KnowledgeDetail from '@/pages/Knowledge/KnowledgeDetail'
import KnowledgeEdit from '@/pages/Knowledge/KnowledgeEdit'
import Reports from '@/pages/Reports/Reports'
import { useUserStore } from '@/store/userStore'
import { useTicketStore } from '@/store/ticketStore'
import { useTemplateStore } from '@/store/templateStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useScheduledTicketStore } from '@/store/scheduledTicketStore'
import { useDepartmentStore } from '@/store/departmentStore'
import { useKnowledgeStore } from '@/store/knowledgeStore'
import { useTagStore } from '@/store/tagStore'

export default function App() {
  const initAuth = useUserStore((s) => s.initAuth)
  const initUsers = useUserStore((s) => s.initialize)
  const initTickets = useTicketStore((s) => s.initialize)
  const initTemplates = useTemplateStore((s) => s.initialize)
  const initNotifications = useNotificationStore((s) => s.initialize)
  const initScheduled = useScheduledTicketStore((s) => s.initialize)
  const initDepartments = useDepartmentStore((s) => s.initialize)
  const initKnowledge = useKnowledgeStore((s) => s.initialize)
  const initTags = useTagStore((s) => s.initialize)
  const processDueTickets = useScheduledTicketStore((s) => s.processDueTickets)

  useEffect(() => {
    initAuth()
    initUsers()
    initTickets()
    initTemplates()
    initNotifications()
    initScheduled()
    initDepartments()
    initKnowledge()
    initTags()
    processDueTickets()
    const interval = setInterval(() => {
      processDueTickets()
    }, 30000)
    return () => clearInterval(interval)
  }, [initAuth, initUsers, initTickets, initTemplates, initNotifications, initScheduled, initDepartments, initKnowledge, initTags, processDueTickets])

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
          <Route path="scheduled-tickets" element={<ScheduledTickets />} />
          <Route path="templates" element={<TemplateManage />} />
          <Route path="knowledge" element={<KnowledgeList />} />
          <Route path="knowledge/create" element={<KnowledgeEdit />} />
          <Route path="knowledge/:id" element={<KnowledgeDetail />} />
          <Route path="knowledge/:id/edit" element={<KnowledgeEdit />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
