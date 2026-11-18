import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { ProfileForm } from '@/components/profile-form'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: claimsData, error } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (error || !claims) {
    redirect('/auth/login?next=/settings')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', claims.sub)
    .single()

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>{claims.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ProfileForm userId={claims.sub} displayName={profile?.display_name ?? ''} />
            <div className="flex gap-2">
              <Link
                href="/"
                data-component="Button"
                className={buttonVariants({ variant: "outline" })}
              >
                홈으로
              </Link>
              <LogoutButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
