'use client'

/**
 * Platform admin "god mode" — full navigation + client ops tools.
 * Server-root still owns infra; this is product-level superuser UI.
 */

import Link from 'next/link'
import { useTx } from '@/lib/tx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPerfMode, setPerfModeOverride, type PerfMode } from '@/lib/perf'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import {
  RocketIcon,
  Building2Icon,
  LayoutDashboardIcon,
  UsersIcon,
  Settings2Icon,
  Trash2Icon,
  GaugeIcon,
  ExternalLinkIcon,
  ShieldIcon,
  FileTextIcon,
  NetworkIcon,
  SparklesIcon,
  ClipboardCheckIcon,
  BellIcon,
} from 'lucide-react'

const LINKS: {
  href: string
  labelVi: string
  labelEn: string
  icon: typeof RocketIcon
  group: string
}[] = [
  { href: '/dashboard', labelVi: 'Startup · Dashboard', labelEn: 'Startup · Dashboard', icon: LayoutDashboardIcon, group: 'startup' },
  { href: '/setup', labelVi: 'Startup · Hồ sơ', labelEn: 'Startup · Profile', icon: FileTextIcon, group: 'startup' },
  { href: '/matches', labelVi: 'Startup · So khớp', labelEn: 'Startup · Matches', icon: SparklesIcon, group: 'startup' },
  { href: '/connections', labelVi: 'Startup · Kết nối', labelEn: 'Startup · Connections', icon: NetworkIcon, group: 'startup' },
  { href: '/investor-matches', labelVi: 'Startup · NĐT match', labelEn: 'Startup · Investor match', icon: UsersIcon, group: 'startup' },
  { href: '/evaluations', labelVi: 'Startup · Kiểm chứng', labelEn: 'Startup · Evaluations', icon: ClipboardCheckIcon, group: 'startup' },
  { href: '/notifications', labelVi: 'Startup · Thông báo', labelEn: 'Startup · Notifications', icon: BellIcon, group: 'startup' },
  { href: '/programs', labelVi: 'Intake · Chương trình', labelEn: 'Intake · Programs', icon: Building2Icon, group: 'intake' },
  { href: '/programs/new', labelVi: 'Intake · Tạo program', labelEn: 'Intake · New program', icon: FileTextIcon, group: 'intake' },
  { href: '/settings/organization', labelVi: 'Intake · Tổ chức', labelEn: 'Intake · Organization', icon: Settings2Icon, group: 'intake' },
  { href: '/matching', labelVi: 'Intake · Matching', labelEn: 'Intake · Matching', icon: NetworkIcon, group: 'intake' },
  { href: '/login', labelVi: 'Auth · Login', labelEn: 'Auth · Login', icon: ShieldIcon, group: 'system' },
  { href: '/register', labelVi: 'Auth · Register', labelEn: 'Auth · Register', icon: RocketIcon, group: 'system' },
  { href: '/pending', labelVi: 'Auth · Pending', labelEn: 'Auth · Pending', icon: UsersIcon, group: 'system' },
  { href: '/', labelVi: 'Landing', labelEn: 'Landing', icon: LayoutDashboardIcon, group: 'system' },
]

export function AdminGodConsole() {
  const { tx, lang } = useTx()
  const [perf, setPerf] = useState<PerfMode>('full')

  useEffect(() => {
    setPerf(getPerfMode())
  }, [])

  const wipeClient = () => {
    if (
      !confirm(
        tx(
          'Xóa toàn bộ dữ liệu local trình duyệt (session startup/intake, dismiss, draft…)? Admin session giữ nguyên.',
          'Wipe browser local data (startup/intake sessions, dismissals, drafts)? Admin session kept.',
        ),
      )
    )
      return
    try {
      const keepAdmin = sessionStorage.getItem('nexora-admin-session')
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k) keys.push(k)
      }
      keys.forEach((k) => {
        // Keep personalization + announcements across wipe (user content)
        if (
          k.startsWith('nf.personal') ||
          k.startsWith('nf.announcements')
        ) {
          return
        }
        if (k.startsWith('nf.') || k.startsWith('nexora') || k.startsWith('dealflow')) {
          localStorage.removeItem(k)
        }
      })
      sessionStorage.clear()
      if (keepAdmin) sessionStorage.setItem('nexora-admin-session', keepAdmin)
      toast.success(tx('Đã dọn client store', 'Client store cleared'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  const setMode = (mode: PerfMode | 'auto') => {
    const m = setPerfModeOverride(mode)
    setPerf(m)
    toast.message(
      mode === 'auto'
        ? tx('Perf: tự động (Windows → lite)', 'Perf: auto (Windows → lite)')
        : `Perf: ${m}`,
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base">
            {tx('Quyền quản trị nền tảng', 'Platform superuser scope')}
          </CardTitle>
          <CardDescription>
            {tx(
              'Tài khoản admin = quyền product full: duyệt user, thông báo, vào mọi khu vực app, công cụ ops. Root server (Vercel/host) vẫn là lớp hạ tầng — admin app không xóa được máy chủ.',
              'Admin = full product control: users, announcements, every app area, ops tools. Server root remains infra — this UI cannot wipe the host.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>{tx('Duyệt tài khoản', 'Account gate')}</Badge>
          <Badge variant="secondary">{tx('Thông báo popup', 'Announcements')}</Badge>
          <Badge variant="secondary">{tx('Deep-link mọi module', 'Deep-link modules')}</Badge>
          <Badge variant="outline">{tx('Perf / wipe client', 'Perf / wipe client')}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GaugeIcon className="size-4 text-primary" />
              {tx('Hiệu năng (Windows / Mac)', 'Performance (Windows / Mac)')}
            </CardTitle>
            <CardDescription>
              {tx(
                'Windows hay lag vì blur + WebGL + smooth-scroll. Chế độ Lite tắt hiệu ứng nặng.',
                'Windows often lags on blur + WebGL + smooth-scroll. Lite mode disables heavy FX.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={perf === 'lite' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setMode('lite')}
            >
              Lite
            </Button>
            <Button
              size="sm"
              variant={perf === 'full' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setMode('full')}
            >
              Full
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setMode('auto')}
            >
              Auto
            </Button>
            <span className="w-full text-xs text-muted-foreground">
              {tx('Hiện tại', 'Current')}: <strong>{perf}</strong>
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Trash2Icon className="size-4 text-destructive" />
              {tx('Ops client', 'Client ops')}
            </CardTitle>
            <CardDescription>
              {tx(
                'Dọn cache trình duyệt khi demo kẹt state — không đụng API server.',
                'Clear browser cache when a demo sticks — does not touch server API.',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full"
              onClick={wipeClient}
            >
              <Trash2Icon className="size-3.5" />
              {tx('Wipe local data', 'Wipe local data')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {(['startup', 'intake', 'system'] as const).map((group) => (
        <div key={group}>
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {group === 'startup'
              ? 'Startup portal'
              : group === 'intake'
                ? 'Intake workspace'
                : 'System'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.filter((l) => l.group === group).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <l.icon className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {lang === 'en' ? l.labelEn : l.labelVi}
                </span>
                <ExternalLinkIcon className="size-3.5 opacity-40" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
