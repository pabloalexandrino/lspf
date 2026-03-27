import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { MobileNav } from './mobile-nav'
import { LogOut } from 'lucide-react'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-14 py-4 border-b border-border flex items-center justify-between px-4 sticky top-0 z-10 bg-black">
      <MobileNav />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px]">
            {user.email}
          </span>
        )}
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
