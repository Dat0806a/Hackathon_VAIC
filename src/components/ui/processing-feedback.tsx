'use client'

/**
 * Visual feedback for long-running work + animated reload controls.
 */

import * as React from 'react'
import { Loader2Icon, RefreshCwIcon, SparklesIcon, CheckCircle2Icon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatElapsed,
  formatEta,
  type UseProcessingOptions,
  useProcessing,
} from '@/lib/use-processing'
import { useTx } from '@/lib/tx'

type PanelProps = {
  active: boolean
  progressPct: number
  remainingMs: number
  elapsedMs: number
  phaseLabel?: string
  title?: string
  titleEn?: string
  done?: boolean
  className?: string
  /** compact = inline bar; card = full panel; overlay = modal-ish */
  variant?: 'compact' | 'card' | 'overlay'
}

export function ProcessingPanel({
  active,
  progressPct,
  remainingMs,
  elapsedMs,
  phaseLabel,
  title,
  titleEn,
  done,
  className,
  variant = 'card',
}: PanelProps) {
  const { tx, lang } = useTx()
  if (!active && !done) return null

  const heading =
    title || titleEn
      ? tx(title || 'Đang xử lý…', titleEn || 'Processing…')
      : tx('Đang xử lý…', 'Processing…')

  const body = (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl border',
            done
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
              : 'border-primary/25 bg-primary/10 text-primary',
          )}
        >
          {done ? (
            <CheckCircle2Icon className="size-5" />
          ) : (
            <Loader2Icon className="size-5 animate-spin" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold tracking-tight">
            {done ? tx('Xong!', 'Done!') : heading}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done
              ? tx(
                  `Hoàn tất trong ${formatElapsed(elapsedMs, lang === 'en' ? 'en' : 'vi')}`,
                  `Finished in ${formatElapsed(elapsedMs, 'en')}`,
                )
              : phaseLabel || tx('Vui lòng chờ…', 'Please wait…')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-lg font-semibold tabular-nums text-primary">
            {Math.min(100, progressPct)}%
          </p>
          {!done ? (
            <p className="text-[10px] font-medium text-muted-foreground tabular-nums">
              {formatEta(remainingMs, lang === 'en' ? 'en' : 'vi')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Progress value={Math.min(100, progressPct)} className="h-2" />
        {!done ? (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-processing-shimmer rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <SparklesIcon className="size-3 text-primary" />
          {tx('AI / máy chủ đang làm việc', 'AI / server at work')}
        </span>
        <span className="tabular-nums">
          {tx('Đã chạy', 'Elapsed')}:{' '}
          {formatElapsed(elapsedMs, lang === 'en' ? 'en' : 'vi')}
        </span>
      </div>
    </div>
  )

  if (variant === 'overlay') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/55 p-4 backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          {body}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5',
          className,
        )}
        role="status"
      >
        {body}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 shadow-sm',
        'animate-in fade-in slide-in-from-top-1 duration-200',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {body}
    </div>
  )
}

/** Hook + panel bundled for common use */
export function useProcessingFeedback(options?: UseProcessingOptions) {
  const { lang } = useTx()
  return useProcessing({ ...options, lang: lang === 'en' ? 'en' : 'vi' })
}

type ReloadProps = React.ComponentProps<typeof Button> & {
  loading?: boolean
  label?: string
  labelEn?: string
  /** Show only icon */
  iconOnly?: boolean
}

/** Reload / refresh button with spin animation while loading */
export function ReloadButton({
  loading,
  label,
  labelEn,
  iconOnly,
  className,
  disabled,
  children,
  ...props
}: ReloadProps) {
  const { tx } = useTx()
  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? 'icon-sm' : 'sm'}
      className={cn('rounded-full', loading && 'pointer-events-none', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <RefreshCwIcon
        className={cn(
          'size-3.5 transition-transform',
          loading && 'animate-spin text-primary',
        )}
      />
      {!iconOnly
        ? children ||
          tx(label || 'Làm mới', labelEn || 'Refresh')
        : null}
      {loading && !iconOnly ? (
        <span className="sr-only">{tx('Đang tải…', 'Loading…')}</span>
      ) : null}
    </Button>
  )
}

/** Inline spinner chip for lists / toolbars */
export function BusyChip({
  label,
  labelEn,
  className,
}: {
  label?: string
  labelEn?: string
  className?: string
}) {
  const { tx } = useTx()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary',
        className,
      )}
    >
      <Loader2Icon className="size-3 animate-spin" />
      {tx(label || 'Đang xử lý…', labelEn || 'Working…')}
    </span>
  )
}
