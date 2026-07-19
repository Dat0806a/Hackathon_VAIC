'use client'

import { useEffect, type ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/lib/auth/session'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AnnouncementPopup } from '@/components/announcements/AnnouncementPopup'
import { applyPerfMode } from '@/lib/perf'

function PerfBootstrap() {
  useEffect(() => {
    applyPerfMode()
  }, [])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <PerfBootstrap />
            {children}
            <AnnouncementPopup />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
