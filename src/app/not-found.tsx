'use client'

import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { useTx } from '@/lib/tx'
import { ThemeToggle, LangToggle } from '@/components/Controls'
import { HomeIcon, LayoutDashboardIcon, SearchIcon } from 'lucide-react'

export default function NotFound() {
  const { tx } = useTx()

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 size-[28rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={32} />
        </Link>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
        <p className="font-heading text-7xl font-bold tracking-tighter text-primary/90 sm:text-8xl">
          404
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">
          {tx('Không tìm thấy trang', 'Page not found')}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
          {tx(
            'Link có thể đã đổi, bị gõ sai, hoặc bạn chưa có quyền mở trang này. Quay về trang chủ hoặc vào không gian làm việc.',
            'The link may have moved, been mistyped, or you may not have access. Head home or open a workspace.',
          )}
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button className="rounded-full" render={<Link href="/" />} nativeButton={false}>
            <HomeIcon className="size-4" />
            {tx('Trang chủ', 'Home')}
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href="/dashboard" />}
            nativeButton={false}
          >
            <LayoutDashboardIcon className="size-4" />
            {tx('Startup portal', 'Startup portal')}
          </Button>
          <Button
            variant="ghost"
            className="rounded-full"
            render={<Link href="/programs" />}
            nativeButton={false}
          >
            <SearchIcon className="size-4" />
            {tx('Intake programs', 'Intake programs')}
          </Button>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Nexora Flow ·{' '}
          <Link href="/login" className="text-primary hover:underline">
            {tx('Đăng nhập', 'Sign in')}
          </Link>
          {' · '}
          <Link href="/admin" className="text-primary hover:underline">
            Admin
          </Link>
        </p>
      </main>
    </div>
  )
}
