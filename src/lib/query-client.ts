import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 10,   // 10 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

/** Centralised query key factory — ensures consistent cache keys */
export const qk = {
  profile: (userId: string) => ['profile', userId] as const,
  categories: (clinicId: string) => ['categories', clinicId] as const,
  checklistTemplates: (clinicId: string) => ['checklist-templates', clinicId] as const,
  checklistCompletions: (clinicId: string, fecha: string) =>
    ['checklist-completions', clinicId, fecha] as const,
  weeklyRecords: (userId: string, semanaInicio: string) =>
    ['weekly-records', userId, semanaInicio] as const,
  globalActivity: (clinicId: string, semanaInicio: string) =>
    ['global-activity', clinicId, semanaInicio] as const,
  dashboardStats: (clinicId: string, fecha: string) =>
    ['dashboard-stats', clinicId, fecha] as const,
  checklistRecentCompletions: (clinicId: string) =>
    ['checklist-recent-completions', clinicId] as const,
  incidencias: (clinicId: string) => ['incidencias', clinicId] as const,
}
