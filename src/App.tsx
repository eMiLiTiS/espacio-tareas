import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/auth/auth-guard'
import { LoginPage } from '@/auth/login-page'
import { AppLayout } from '@/layouts/app-layout'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { ChecklistPage } from '@/features/checklist/checklist-page'
import { SemanalPage } from '@/features/semanal/semanal-page'
import { ActividadPage } from '@/features/actividad/actividad-page'
import { AjustesPage } from '@/features/ajustes/ajustes-page'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/semanal" element={<SemanalPage />} />
          <Route path="/actividad" element={<ActividadPage />} />
          <Route path="/ajustes" element={<AjustesPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
