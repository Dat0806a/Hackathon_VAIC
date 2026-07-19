'use client'

import { useAuth } from '@/lib/auth/session'
import { useTx } from '@/lib/tx'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { PageShell, Section } from '@/components/dashboard/Section'
import { AccountPersonalization } from '@/components/account/AccountPersonalization'

export default function IntakeAccountSettingsPage() {
  const { tx } = useTx()
  const { session, updateProfile } = useAuth()

  if (!session) return null

  return (
    <PageShell>
      <PageHeader
        title={tx('Tùy chỉnh tài khoản', 'Account personalization')}
        description={tx(
          'Tên hiển thị (đổi mỗi 7 ngày), avatar, trạng thái, nghề nghiệp & ngành.',
          'Display name (every 7 days), avatar, activity status, profession & industries.',
        )}
      />
      <Section>
        <AccountPersonalization
          userId={session.userId}
          email={session.email}
          fallbackName={session.displayName || ''}
          onSaved={(p) => {
            if (p.displayName) updateProfile({ displayName: p.displayName })
          }}
        />
      </Section>
    </PageShell>
  )
}
