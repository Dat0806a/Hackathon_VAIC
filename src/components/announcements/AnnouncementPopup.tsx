'use client'

/**
 * Platform announcements popup — only on "inner" work pages.
 * Never on: login/register, 404-ish, marketing, startup /dashboard, intake /programs home.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  dismissForever,
  dismissOnce,
  fetchPublicAnnouncements,
  pickVisibleAnnouncements,
  type Announcement,
  type ViewerKind,
} from '@/lib/announcements'
import { useAuth } from '@/lib/auth/session'
import { useAuthStore } from '@/deal-flow/frontend/store/useAuthStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MegaphoneIcon } from 'lucide-react'
import { useTx } from '@/lib/tx'
import { cn } from '@/lib/utils'

/** Paths where announcement must never interrupt */
function isAnnouncementBlockedPath(pathname: string): boolean {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  const exact = new Set([
    '/',
    '/login',
    '/register',
    '/workspace/login',
    '/pending',
    '/auth/callback',
    '/privacy',
    '/terms',
    '/apply',
    // Startup home dashboard
    '/dashboard',
    // Intake home (programs list)
    '/programs',
    // Auth/error shells
    '/not-found',
  ])
  if (exact.has(p)) return true
  // Any login-ish or public auth
  if (p.startsWith('/login') || p.startsWith('/register')) return true
  if (p.startsWith('/workspace/login')) return true
  if (p.startsWith('/auth/')) return true
  // Public apply wizard
  if (p.startsWith('/apply/')) return true
  // Admin writes announcements — don't pop on admin itself
  if (p.startsWith('/admin')) return true
  return false
}

function usePathnameLite() {
  const [path, setPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  )
  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    sync()
    window.addEventListener('popstate', sync)
    // SPA (react-router) + Next soft nav
    const id = window.setInterval(sync, 500)
    return () => {
      window.removeEventListener('popstate', sync)
      clearInterval(id)
    }
  }, [])
  return path
}

function useViewerKind(): ViewerKind {
  const { session, ready: intakeReady } = useAuth()
  const startupToken = useAuthStore((s) => s.accessToken)
  const startupHydrated = useAuthStore((s) => s._hasHydrated)

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    try {
      if (sessionStorage.getItem('nexora-admin-session')) return 'admin'
    } catch {
      /* */
    }
  }
  if (startupHydrated && startupToken) return 'startup'
  if (intakeReady && session) return 'intake'
  return 'guest'
}

export function AnnouncementPopup() {
  const { tx } = useTx()
  const viewer = useViewerKind()
  const pathname = usePathnameLite()
  const blocked = isAnnouncementBlockedPath(pathname)
  const [queue, setQueue] = useState<Announcement[]>([])
  const [open, setOpen] = useState(false)
  const current = queue[0] || null

  const load = useCallback(async () => {
    if (viewer === 'guest' || blocked) {
      setQueue([])
      setOpen(false)
      return
    }
    // small delay so route settles
    await new Promise((r) => setTimeout(r, 450))
    // re-check path after delay (user may navigate)
    if (isAnnouncementBlockedPath(window.location.pathname)) {
      setQueue([])
      setOpen(false)
      return
    }
    const list = await fetchPublicAnnouncements()
    const visible = pickVisibleAnnouncements(list, viewer)
    setQueue(visible)
    setOpen(visible.length > 0)
  }, [viewer, blocked])

  useEffect(() => {
    void load()
    const onAnn = () => void load()
    window.addEventListener('nf:announcements', onAnn)
    window.addEventListener('nf:auth', onAnn)
    return () => {
      window.removeEventListener('nf:announcements', onAnn)
      window.removeEventListener('nf:auth', onAnn)
    }
  }, [load])

  // Hide immediately when navigating onto a blocked page
  useEffect(() => {
    if (blocked) {
      setOpen(false)
    }
  }, [blocked])

  const advance = (mode: 'once' | 'forever') => {
    if (!current) return
    if (mode === 'once') dismissOnce(current.id)
    else dismissForever(current.id)
    setQueue((q) => {
      const next = q.slice(1)
      if (next.length === 0) setOpen(false)
      return next
    })
  }

  // Never mount dialog chrome on blocked routes
  if (blocked || !current) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && advance('once')}>
      <DialogContent className="max-h-[85svh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-2 border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MegaphoneIcon className="size-4" />
            </span>
            <Badge variant="secondary" className="text-[10px] uppercase">
              {tx('Thông báo hệ thống', 'System notice')}
            </Badge>
            {queue.length > 1 ? (
              <Badge variant="outline" className="ml-auto text-[10px]">
                1 / {queue.length}
              </Badge>
            ) : null}
          </div>
          <DialogTitle className="font-heading text-lg leading-snug">
            {current.title || tx('Thông báo', 'Announcement')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tx('Thông báo từ quản trị viên', 'Message from platform admin')}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'nf-announcement-body max-h-[min(50svh,420px)] overflow-y-auto px-5 py-4 text-sm leading-relaxed',
            'prose prose-sm dark:prose-invert max-w-none',
            '[&_a]:text-primary [&_a]:underline',
          )}
          dangerouslySetInnerHTML={{ __html: current.bodyHtml || '<p></p>' }}
        />

        <DialogFooter className="flex-col gap-2 border-t border-border/60 bg-muted/20 px-5 py-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-full sm:w-auto"
            onClick={() => advance('forever')}
          >
            {tx('Không hiện lại', "Don't show again")}
          </Button>
          <Button
            type="button"
            className="w-full rounded-full sm:w-auto"
            onClick={() => advance('once')}
          >
            {tx('Đã hiểu · tắt lần này', 'Got it · dismiss once')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
