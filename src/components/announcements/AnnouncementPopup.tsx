'use client'

/**
 * After login, show active platform announcements as a modal queue.
 * User can dismiss once (this session) or forever (this browser).
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

function useViewerKind(): ViewerKind {
  const { session, ready: intakeReady } = useAuth()
  const startupToken = useAuthStore((s) => s.accessToken)
  const startupHydrated = useAuthStore((s) => s._hasHydrated)

  // Admin page uses sessionStorage — detect path
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
  const [queue, setQueue] = useState<Announcement[]>([])
  const [open, setOpen] = useState(false)
  const current = queue[0] || null

  const load = useCallback(async () => {
    if (viewer === 'guest') {
      setQueue([])
      setOpen(false)
      return
    }
    // small delay so login navigation settles
    await new Promise((r) => setTimeout(r, 400))
    const list = await fetchPublicAnnouncements()
    const visible = pickVisibleAnnouncements(list, viewer)
    setQueue(visible)
    setOpen(visible.length > 0)
  }, [viewer])

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

  if (!current) return null

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
            {tx('Không hiện lại', 'Don\'t show again')}
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
