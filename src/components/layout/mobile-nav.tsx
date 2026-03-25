'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, DollarSign, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Membros' },
  { href: '/sessoes', icon: Calendar, label: 'Sessões' },
  { href: '/financeiro', icon: DollarSign, label: 'Finan.' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Bottom nav - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[hsl(var(--sidebar))] border-t border-border">
        <div className="flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
