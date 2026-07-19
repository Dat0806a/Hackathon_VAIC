// @ts-nocheck
'use client'

import React from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { usePortalI18n } from '../i18n'
import { AccountPersonalization } from '@/components/account/AccountPersonalization'
import { PortalHero, PortalSection } from '../components/PortalUI'
import { UserRound } from 'lucide-react'

export default function AccountSettings() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const { lang } = usePortalI18n()
  const tx = (vi, en) => (lang === 'en' ? en : vi)

  if (!user?.id) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {tx('Cần đăng nhập', 'Sign in required')}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <PortalHero
        eyebrow={
          <>
            <UserRound className="size-3" />
            {tx('Tài khoản', 'Account')}
          </>
        }
        title={tx('Tùy chỉnh cá nhân', 'Personalization')}
        description={tx(
          'Đổi tên (7 ngày/lần), avatar, trạng thái hoạt động, nghề nghiệp & ngành quan tâm.',
          'Rename (every 7 days), avatar, activity status, profession & industries.',
        )}
      />
      <PortalSection>
        <AccountPersonalization
          userId={user.id}
          email={user.email}
          fallbackName={user.fullName || ''}
          onSaved={(p) => {
            if (accessToken && user) {
              setAuth(
                { ...user, fullName: p.displayName || user.fullName },
                accessToken,
                refreshToken || '',
              )
            }
          }}
        />
      </PortalSection>
    </div>
  )
}
