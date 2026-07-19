'use client'

/**
 * Shared personalization form: name (7-day), avatar, activity, profession/industries.
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
  savePersonalProfileRemote,
  tryChangeDisplayName,
  type ActivityStatus,
  type PersonalProfile,
} from '@/lib/personal-profile'
import { useTx } from '@/lib/tx'
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from '@/components/ui/avatar'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  userId: string
  email?: string
  fallbackName?: string
  /** Called after save so parent can sync auth displayName */
  onSaved?: (profile: PersonalProfile) => void
  className?: string
}

export function AccountPersonalization({
  userId,
  email,
  fallbackName = '',
  onSaved,
  className,
}: Props) {
  const { tx, lang } = useTx()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<PersonalProfile>(() =>
    getPersonalProfile(userId, fallbackName, email),
  )
  const [nameDraft, setNameDraft] = useState(profile.displayName)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(() => {
    const p = getPersonalProfile(userId, fallbackName, email)
    setProfile(p)
    setNameDraft(p.displayName)
  }, [userId, fallbackName, email])

  useEffect(() => {
    reload()
    // Pull shared profile after login (survives logout on other sessions)
    void hydratePersonalProfile(userId, email, fallbackName).then((p) => {
      setProfile(p)
      setNameDraft(p.displayName)
    })
    const on = () => reload()
    window.addEventListener('nf:personal-profile', on)
    return () => window.removeEventListener('nf:personal-profile', on)
  }, [reload, userId, email, fallbackName])

  const cooldown = nameChangeInfo(profile)
  const initials = initialsFrom(profile.displayName || fallbackName, email)
  const statusMeta =
    ACTIVITY_OPTIONS.find((a) => a.id === profile.activityStatus) ||
    ACTIVITY_OPTIONS[0]

  const onPickAvatar = async (file: File | null) => {
    if (!file) return
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      setProfile((p) => ({ ...p, avatarDataUrl: dataUrl }))
      toast.success(tx('Đã chọn ảnh đại diện', 'Avatar selected'))
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
    setSaving(true)
    try {
      let next: PersonalProfile = {
        ...profile,
        userId,
        email: (email || profile.email || '').trim().toLowerCase(),
      }

      // Name change with cooldown
      if (nameDraft.trim() !== profile.displayName) {
        const res = tryChangeDisplayName(next, nameDraft)
        if (res.error === 'cooldown') {
          toast.error(
            tx(
              `Chỉ đổi tên mỗi 7 ngày. Còn ~${cooldown.daysLeft} ngày.`,
              `Name can change every 7 days. ~${cooldown.daysLeft} day(s) left.`,
            ),
          )
          setNameDraft(profile.displayName)
          setSaving(false)
          return
        }
        if (res.error === 'empty') {
          toast.error(tx('Tên không được trống', 'Name cannot be empty'))
          setSaving(false)
          return
        }
        next = {
          ...res.profile,
          avatarDataUrl: profile.avatarDataUrl,
          activityStatus: profile.activityStatus,
          customStatus: profile.customStatus,
          profession: profile.profession,
          industries: profile.industries,
          headline: profile.headline,
          email: next.email,
          userId,
        }
      }

      next = await savePersonalProfileRemote(next)
      setProfile(next)
      setNameDraft(next.displayName)
      onSaved?.(next)
      toast.success(
        tx(
          'Đã lưu — giữ sau logout/login (theo email)',
          'Saved — survives logout/login (keyed by email)',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Avatar + identity */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <Avatar className="size-20 rounded-2xl" size="lg">
            {profile.avatarDataUrl ? (
              <AvatarImage src={profile.avatarDataUrl} alt="" className="rounded-2xl" />
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
                onClick={() => setProfile((p) => ({ ...p, avatarDataUrl: null }))}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">{tx('Tên hiển thị', 'Display name')}</Label>
            <Input
              id="display-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              disabled={!cooldown.canChange && nameDraft === profile.displayName}
              maxLength={80}
              placeholder={tx('Họ tên hoặc nickname', 'Full name or nickname')}
            />
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ClockIcon className="mt-0.5 size-3 shrink-0" />
              {cooldown.canChange
                ? tx(
                    'Đổi tên được 1 lần mỗi 7 ngày. Lần này còn lượt.',
                    'You can rename once every 7 days. Available now.',
                  )
                : tx(
                    `Đã đổi gần đây — có thể đổi lại sau ~${cooldown.daysLeft} ngày (${cooldown.nextAt?.toLocaleDateString(lang === 'en' ? 'en' : 'vi-VN')}).`,
                    `Recently changed — next rename in ~${cooldown.daysLeft} day(s) (${cooldown.nextAt?.toLocaleDateString('en')}).`,
                  )}
            </p>
          </div>
          {email ? (
            <p className="text-xs text-muted-foreground">
              {tx('Email', 'Email')}: <span className="font-medium text-foreground">{email}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Activity */}
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

      {/* Profession */}
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
              PROFESSION_OPTIONS.includes(profile.profession as (typeof PROFESSION_OPTIONS)[number])
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

      {/* Industries */}
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
          disabled={saving}
          onClick={() => void onSave()}
        >
          <SaveIcon className="size-3.5" />
          {tx('Lưu tùy chỉnh', 'Save personalization')}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          <UserRoundIcon className="mr-1 inline size-3" />
          {tx(
            'Gắn với email — logout/login vẫn còn · đồng bộ menu ngay.',
            'Tied to your email — survives logout · menu updates immediately.',
          )}
        </p>
      </div>
    </div>
  )
}

/** Compact avatar + status for sidebars */
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
    ACTIVITY_OPTIONS.find((a) => a.id === p.activityStatus) || ACTIVITY_OPTIONS[0]
  const line =
    p.customStatus ||
    p.profession ||
    subtitle ||
    ''

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
