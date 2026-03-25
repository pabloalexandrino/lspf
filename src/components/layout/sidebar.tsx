'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Calendar, DollarSign, Package, ChevronLeft, ChevronRight, Triangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Membros' },
  { href: '/sessoes', icon: Calendar, label: 'Sessões' },
  { href: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-border transition-all duration-300',
        'bg-[hsl(var(--sidebar))]',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 p-4 border-b border-border', collapsed && 'justify-center')}>
        <Triangle className="h-6 w-6 text-primary shrink-0" strokeWidth={1.5} />
        {!collapsed && <span className="font-bold text-sm text-primary">Loja Maçônica</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4 mr-2" /><span className="text-xs">Recolher</span></>}
        </Button>
      </div>
    </aside>
  )
}
