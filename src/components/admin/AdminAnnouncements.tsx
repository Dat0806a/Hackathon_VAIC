'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createEmptyAnnouncement,
  htmlToText,
  readLocalAnnouncements,
  saveAnnouncementsRemote,
  type Announcement,
  type AnnouncementAudience,
} from '@/lib/announcements'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { useTx } from '@/lib/tx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  MegaphoneIcon,
  PlusIcon,
  Trash2Icon,
  SaveIcon,
  EyeIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = { token: string }

export function AdminAnnouncements({ token }: Props) {
  const { tx } = useTx()
  const [items, setItems] = useState<Announcement[]>([])
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/announcements', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const body = await res.json()
        const list = (body?.data?.items || []) as Announcement[]
        setItems(list)
        return
      }
    } catch {
      /* */
    }
    setItems(readLocalAnnouncements())
  }, [token])

  useEffect(() => {
    void reload()
  }, [reload])

  const startNew = () => {
    setEditing(
      createEmptyAnnouncement({
        title: tx('Thông báo mới', 'New announcement'),
        bodyHtml: `<p>${tx('Xin chào — nội dung thông báo…', 'Hello — announcement body…')}</p>`,
        priority: items.length + 1,
      }),
    )
  }

  const persist = async (next: Announcement[]) => {
    setSaving(true)
    try {
      const saved = await saveAnnouncementsRemote(next, token)
      setItems(saved)
      toast.success(tx('Đã lưu thông báo', 'Announcements saved'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const saveCurrent = async () => {
    if (!editing) return
    const bodyText = htmlToText(editing.bodyHtml)
    const row: Announcement = {
      ...editing,
      bodyText,
      updatedAt: new Date().toISOString(),
      title: editing.title.trim() || tx('Không tiêu đề', 'Untitled'),
    }
    const exists = items.some((i) => i.id === row.id)
    const next = exists
      ? items.map((i) => (i.id === row.id ? row : i))
      : [row, ...items]
    await persist(next)
    setEditing(row)
  }

  const remove = async (id: string) => {
    if (!confirm(tx('Xóa thông báo này?', 'Delete this announcement?'))) return
    const next = items.filter((i) => i.id !== id)
    await persist(next)
    if (editing?.id === id) setEditing(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <MegaphoneIcon className="size-4 text-primary" />
            {tx('Danh sách', 'List')}
          </p>
          <Button type="button" size="sm" className="rounded-full" onClick={startNew}>
            <PlusIcon className="size-3.5" />
            {tx('Tạo', 'New')}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            {tx('Chưa có thông báo. Tạo mới để hiển thị sau login.', 'No notices yet.')}
          </p>
        ) : (
          <ul className="flex max-h-[480px] flex-col gap-1 overflow-y-auto">
            {items.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ ...a })}
                  className={cn(
                    'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    editing?.id === a.id
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-muted',
                  )}
                >
                  <span className="line-clamp-1 font-medium">{a.title}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Badge
                      variant={a.active ? 'default' : 'outline'}
                      className="h-4 px-1 text-[9px]"
                    >
                      {a.active ? 'ON' : 'OFF'}
                    </Badge>
                    {a.audience}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {!editing ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <EyeIcon className="size-8 opacity-40" />
            <p className="text-sm">
              {tx('Chọn hoặc tạo thông báo để soạn thảo', 'Select or create an announcement')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{tx('Tiêu đề', 'Title')}</Label>
                <Input
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                  className="font-heading"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tx('Đối tượng', 'Audience')}</Label>
                <Select
                  value={editing.audience}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      audience: (v || 'all') as AnnouncementAudience,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tx('Tất cả (đã login)', 'All logged-in')}</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="intake">Intake</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(c) =>
                      setEditing({ ...editing, active: !!c })
                    }
                  />
                  <Label>{tx('Đang bật', 'Active')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">
                    {tx('Ưu tiên', 'Priority')}
                  </Label>
                  <Input
                    type="number"
                    className="h-8 w-20"
                    value={editing.priority}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        priority: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                {tx(
                  'Nội dung (đậm · nghiêng · gạch chân · gạch ngang · màu · list…)',
                  'Body (bold · italic · underline · strike · color · lists…)',
                )}
              </Label>
              <RichTextEditor
                value={editing.bodyHtml}
                onChange={(html) => setEditing({ ...editing, bodyHtml: html })}
                minHeight={220}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full"
                disabled={saving}
                onClick={() => void saveCurrent()}
              >
                <SaveIcon className="size-3.5" />
                {tx('Lưu & phát hành', 'Save & publish')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                onClick={() => void remove(editing.id)}
              >
                <Trash2Icon className="size-3.5" />
                {tx('Xóa', 'Delete')}
              </Button>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {tx('Xem trước popup', 'Popup preview')}
              </p>
              <p className="font-heading text-base font-semibold">{editing.title}</p>
              <div
                className="nf-announcement-body prose prose-sm dark:prose-invert mt-2 max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: editing.bodyHtml }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
