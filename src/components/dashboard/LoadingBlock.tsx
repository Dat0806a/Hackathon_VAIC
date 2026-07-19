'use client'
import { useEffect, useState } from 'react'
import { useTx } from '@/lib/tx'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatEta } from '@/lib/use-processing'

export function LoadingBlock({
  label = 'Đang tải…',
  labelEn = 'Loading…',
  /** Soft ETA estimate for indeterminate loads */
  estimateMs = 4000,
}: {
  label?: string
  labelEn?: string
  estimateMs?: number
}) {
  const { tx, lang } = useTx()
  const [pct, setPct] = useState(8)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t0 = Date.now()
    const id = window.setInterval(() => {
      const e = Date.now() - t0
      setElapsed(e)
      const ratio = e / Math.max(1500, estimateMs)
      setPct(Math.min(92, Math.round((1 - Math.exp(-1.5 * ratio)) * 100)))
    }, 120)
    return () => clearInterval(id)
  }, [estimateMs])

  const remaining = Math.max(0, estimateMs * (1 - pct / 100))

  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-10">
      <Spinner className="size-5 text-primary" />
      <p className="text-sm font-medium">{tx(label, labelEn)}</p>
      <div className="w-full max-w-xs space-y-1.5">
        <Progress value={pct} className="h-1.5" />
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{pct}%</span>
          <span>
            {formatEta(remaining, lang === 'en' ? 'en' : 'vi')} ·{' '}
            {Math.floor(elapsed / 1000)}s
          </span>
        </div>
      </div>
    </div>
  )
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-44 rounded-xl lg:col-span-3" />
        <Skeleton className="h-44 rounded-xl lg:col-span-2" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
