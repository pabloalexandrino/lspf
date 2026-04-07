import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { MobileNav } from './mobile-nav'
import { LogOut } from 'lucide-react'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userInitial = user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <header className="h-13 border-b border-border/60 flex items-center justify-between px-4 sticky top-0 z-10 bg-background/70 backdrop-blur-md">
      <MobileNav />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {user && (
          <>
            <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-primary">{userInitial}</span>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px]">
              {user.email}
            </span>
          </>
        )}
        <form action={logout}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="sr-only">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
