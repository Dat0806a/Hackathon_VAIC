'use client'

/**
 * Personalization form — email-keyed, remote Blob sync, survives logout.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ACTIVITY_OPTIONS,
  INDUSTRY_OPTIONS,
  PROFESSION_OPTIONS,
  fileToAvatarDataUrl,
  getPersonalProfile,
  hydratePersonalProfile,
  initialsFrom,
  nameChangeInfo,
  normalizeEmail,
  savePersonalProfileRemote,
  tryChangeDisplayName,
  type ActivityStatus,
  type PersonalProfile,
} from '@/lib/personal-profile'
import { useTx } from '@/lib/tx'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarBadge,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  CameraIcon,
  ClockIcon,
  SaveIcon,
  Trash2Icon,
  UserRoundIcon,
  CloudIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  userId: string
  email?: string
  fallbackName?: string
  onSaved?: (profile: PersonalProfile) => void
  className?: string
}

export function AccountPersonalization({
  userId,
  email: emailProp,
  fallbackName = '',
  onSaved,
  className,
}: Props) {
  const { tx, lang } = useTx()
  const email = normalizeEmail(emailProp)
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<PersonalProfile>(() =>
    getPersonalProfile(userId, fallbackName, email),
  )
  const [nameDraft, setNameDraft] = useState(
    () => getPersonalProfile(userId, fallbackName, email).displayName || fallbackName,
  )
  const [saving, setSaving] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [lastSaveOk, setLastSaveOk] = useState<string | null>(null)

  const applyProfile = useCallback(
    (p: PersonalProfile) => {
      setProfile(p)
      setNameDraft(p.displayName || fallbackName || '')
    },
    [fallbackName],
  )

  useEffect(() => {
    let cancelled = false
    setHydrating(true)
    const local = getPersonalProfile(userId, fallbackName, email)
    applyProfile(local)

    void (async () => {
      try {
        const p = await hydratePersonalProfile(userId, email, fallbackName)
        if (!cancelled) applyProfile(p)
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()

    const on = () => {
      applyProfile(getPersonalProfile(userId, fallbackName, email))
    }
    window.addEventListener('nf:personal-profile', on)
    return () => {
      cancelled = true
      window.removeEventListener('nf:personal-profile', on)
    }
  }, [userId, email, fallbackName, applyProfile])

  const cooldown = nameChangeInfo(profile)
  const initials = initialsFrom(
    nameDraft || profile.displayName || fallbackName,
    email,
  )
  const statusMeta =
    ACTIVITY_OPTIONS.find((a) => a.id === profile.activityStatus) ||
    ACTIVITY_OPTIONS[0]

  const onPickAvatar = async (file: File | null) => {
    if (!file) return
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      setProfile((p) => ({ ...p, avatarDataUrl: dataUrl }))
      toast.success(tx('Đã chọn ảnh — nhớ bấm Lưu', 'Photo selected — click Save'))
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      toast.error(
        code === 'too-large'
          ? tx('Ảnh tối đa 5MB', 'Max image size 5MB')
          : tx('Không đọc được ảnh', 'Could not read image'),
      )
    }
  }

  const toggleIndustry = (ind: string) => {
    setProfile((p) => {
      const has = p.industries.includes(ind)
      const industries = has
        ? p.industries.filter((x) => x !== ind)
        : [...p.industries, ind].slice(0, 8)
      return { ...p, industries }
    })
  }

  const onSave = async () => {
    if (!email || !email.includes('@')) {
      toast.error(
        tx(
          'Thiếu email tài khoản — đăng nhập lại rồi lưu.',
          'Missing account email — sign in again then save.',
        ),
      )
      return
    }

    setSaving(true)
    setLastSaveOk(null)
    try {
      let next: PersonalProfile = {
        ...profile,
        userId,
        email,
        displayName: nameDraft.trim() || profile.displayName || fallbackName,
      }

      if (nameDraft.trim() && nameDraft.trim() !== (profile.displayName || '')) {
        const res = tryChangeDisplayName(
          { ...next, displayName: profile.displayName || '' },
          nameDraft.trim(),
        )
        if (res.error === 'cooldown') {
          toast.error(
            tx(
              `Chỉ đổi tên mỗi 7 ngày. Còn ~${cooldown.daysLeft} ngày.`,
              `Name can change every 7 days. ~${cooldown.daysLeft} day(s) left.`,
            ),
          )
          setNameDraft(profile.displayName || fallbackName)
          setSaving(false)
          return
        }
        if (res.error === 'empty') {
          toast.error(tx('Tên không được trống', 'Name cannot be empty'))
          setSaving(false)
          return
        }
        next = {
          ...next,
          displayName: res.profile.displayName,
          nameChangedAt: res.profile.nameChangedAt,
        }
      }

      const saved = await savePersonalProfileRemote(next)
      let remoteOk = false
      try {
        const check = await fetch(
          `/api/personal-profile?email=${encodeURIComponent(email)}`,
          { cache: 'no-store' },
        )
        const body = await check.json()
        const rp = body?.data?.profile
        remoteOk = !!(rp && (rp.saved || rp.displayName || rp.profession))
        if (rp) {
          applyProfile({ ...saved, ...rp, email, userId, saved: true })
        } else {
          applyProfile(saved)
        }
      } catch {
        applyProfile(saved)
      }

      onSaved?.(saved)
      const msg = remoteOk
        ? tx(
            'Đã lưu cloud — logout/login vẫn còn',
            'Saved to cloud — survives logout/login',
          )
        : tx(
            'Đã lưu trình duyệt — cloud chưa xác nhận',
            'Saved in browser — cloud unconfirmed',
          )
      setLastSaveOk(msg)
      toast.success(msg)
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : tx('Lưu thất bại', 'Save failed'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {!email ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {tx(
            'Không thấy email session — mở lại trang sau khi đăng nhập.',
            'No session email — reopen this page after sign-in.',
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {tx('Tài khoản', 'Account')}: <strong className="text-foreground">{email}</strong>
          {hydrating ? ` · ${tx('Đang đồng bộ…', 'Syncing…')}` : null}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <Avatar className="size-20 rounded-2xl" size="lg">
            {profile.avatarDataUrl ? (
              <AvatarImage
                src={profile.avatarDataUrl}
                alt=""
                className="rounded-2xl"
              />
            ) : null}
            <AvatarFallback className="rounded-2xl bg-primary/15 text-lg font-semibold text-primary">
              {initials}
            </AvatarFallback>
            <AvatarBadge
              className={cn('size-3.5 ring-2', statusMeta.color)}
              title={lang === 'en' ? statusMeta.en : statusMeta.vi}
            />
          </Avatar>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onPickAvatar(e.target.files?.[0] || null)}
          />
          <div className="mt-2 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => fileRef.current?.click()}
            >
              <CameraIcon className="size-3.5" />
              {tx('Ảnh', 'Photo')}
            </Button>
            {profile.avatarDataUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() =>
                  setProfile((p) => ({ ...p, avatarDataUrl: null }))
                }
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">
              {tx('Tên hiển thị', 'Display name')}
            </Label>
            <Input
              id="display-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={80}
              placeholder={tx('Họ tên hoặc nickname', 'Full name or nickname')}
            />
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ClockIcon className="mt-0.5 size-3 shrink-0" />
              {cooldown.canChange
                ? tx(
                    'Đổi tên được 1 lần / 7 ngày.',
                    'Rename once every 7 days.',
                  )
                : tx(
                    `Đổi lại sau ~${cooldown.daysLeft} ngày.`,
                    `Next rename in ~${cooldown.daysLeft} day(s).`,
                  )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{tx('Trạng thái hoạt động', 'Activity status')}</Label>
          <Select
            value={profile.activityStatus}
            onValueChange={(v) =>
              setProfile((p) => ({
                ...p,
                activityStatus: (v || 'online') as ActivityStatus,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  <span className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', o.color)} />
                    {lang === 'en' ? o.en : o.vi}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{tx('Ghi chú trạng thái', 'Status note')}</Label>
          <Input
            value={profile.customStatus}
            onChange={(e) =>
              setProfile((p) => ({ ...p, customStatus: e.target.value }))
            }
            maxLength={80}
            placeholder={tx('VD: Đang họp pitch…', 'e.g. In a pitch call…')}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{tx('Nghề nghiệp / vai trò', 'Profession / role')}</Label>
          <Select
            value={profile.profession || undefined}
            onValueChange={(v) =>
              setProfile((p) => ({ ...p, profession: v || '' }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={tx('Chọn…', 'Select…')} />
            </SelectTrigger>
            <SelectContent>
              {PROFESSION_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="mt-1.5"
            value={
              PROFESSION_OPTIONS.includes(
                profile.profession as (typeof PROFESSION_OPTIONS)[number],
              )
                ? ''
                : profile.profession
            }
            onChange={(e) =>
              setProfile((p) => ({ ...p, profession: e.target.value }))
            }
            placeholder={tx('Hoặc tự nhập…', 'Or type custom…')}
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{tx('Dòng giới thiệu ngắn', 'Short headline')}</Label>
          <Textarea
            value={profile.headline}
            onChange={(e) =>
              setProfile((p) => ({ ...p, headline: e.target.value }))
            }
            rows={3}
            maxLength={160}
            placeholder={tx(
              'VD: Founder AI logistics · tìm pilot doanh nghiệp',
              'e.g. AI logistics founder · seeking corporate pilots',
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          {tx('Ngành quan tâm (tối đa 8)', 'Industries of interest (max 8)')}
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRY_OPTIONS.map((ind) => {
            const on = profile.industries.includes(ind)
            return (
              <button
                key={ind}
                type="button"
                onClick={() => toggleIndustry(ind)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  on
                    ? 'border-primary/40 bg-primary/15 font-medium text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {ind}
              </button>
            )
          })}
        </div>
        {profile.industries.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {profile.industries.map((i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {i}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          className="rounded-full"
          disabled={saving || !email}
          onClick={() => void onSave()}
        >
          <SaveIcon className="size-3.5" />
          {saving
            ? tx('Đang lưu…', 'Saving…')
            : tx('Lưu tùy chỉnh', 'Save personalization')}
        </Button>
        {lastSaveOk ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CloudIcon className="size-3" />
            {lastSaveOk}
          </span>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            <UserRoundIcon className="mr-1 inline size-3" />
            {tx(
              'Bắt buộc bấm Lưu. Gắn theo email — logout không mất.',
              'You must click Save. Tied to email — logout keeps it.',
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export function UserIdentityChip({
  userId,
  fallbackName,
  email,
  subtitle,
}: {
  userId?: string | null
  fallbackName?: string
  email?: string
  subtitle?: string
}) {
  const [p, setP] = useState(() =>
    getPersonalProfile(userId || '', fallbackName || '', email),
  )
  useEffect(() => {
    const load = () =>
      setP(getPersonalProfile(userId || '', fallbackName || '', email))
    load()
    void hydratePersonalProfile(userId, email, fallbackName).then(setP)
    window.addEventListener('nf:personal-profile', load)
    return () => window.removeEventListener('nf:personal-profile', load)
  }, [userId, fallbackName, email])

  const name = p.displayName || fallbackName || email?.split('@')[0] || 'User'
  const meta =
    ACTIVITY_OPTIONS.find((a) => a.id === p.activityStatus) ||
    ACTIVITY_OPTIONS[0]
  const line = p.customStatus || p.profession || subtitle || ''

  return (
    <>
      <Avatar className="size-8 rounded-lg">
        {p.avatarDataUrl ? (
          <AvatarImage src={p.avatarDataUrl} alt="" className="rounded-lg" />
        ) : null}
        <AvatarFallback className="rounded-lg bg-primary/15 text-primary">
          {initialsFrom(name, email)}
        </AvatarFallback>
        <AvatarBadge className={cn('size-2.5', meta.color)} />
      </Avatar>
      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {line || email || '—'}
        </span>
      </div>
    </>
  )
}
