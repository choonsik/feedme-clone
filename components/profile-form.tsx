'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export function ProfileForm({ userId, displayName }: { userId: string; displayName: string }) {
  const [value, setValue] = useState(displayName)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setMessage(null)
    setError(null)

    // RLS limits the update to the owner's row; zero returned rows means nothing was saved.
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: value })
      .eq('id', userId)
      .select('display_name')

    if (error) setError(error.message)
    else if (!data?.length) setError('Profile not found')
    else {
      setMessage('Saved')
      router.refresh()
    }
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="display-name">Display name</Label>
        <Input id="display-name" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
