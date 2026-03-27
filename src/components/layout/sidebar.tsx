'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Calendar, DollarSign, Package,
  ChevronLeft, ChevronRight, Triangle, ChevronDown, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const financeiroSubItems = [
  { href: '/financeiro', label: 'Visão Geral', exact: true },
  { href: '/financeiro/caixas', label: 'Caixas' },
  { href: '/financeiro/membros', label: 'Wallets dos Membros' },
  { href: '/financeiro/mensalidades', label: 'Mensalidades' },
]

const topNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Membros' },
  { href: '/cargos', icon: Shield, label: 'Cargos' },
  { href: '/sessoes', icon: Calendar, label: 'Sessões' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [financeiroOpen, setFinanceiroOpen] = useState(true)
  const pathname = usePathname()

  const isFinanceiroActive = pathname.startsWith('/financeiro')

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
        {!collapsed && <span className="font-bold text-sm text-primary">Luz da Sabedoria, Prosperidade e Fraternidade</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {topNavItems.map((item) => {
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

        {/* Financeiro with submenu */}
        {collapsed ? (
          <Link
            href="/financeiro"
            className={cn(
              'flex items-center justify-center px-2 py-2 rounded-md text-sm transition-colors',
              isFinanceiroActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <DollarSign className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <div>
            <button
              onClick={() => setFinanceiroOpen((v) => !v)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isFinanceiroActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <DollarSign className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Financeiro</span>
              {financeiroOpen
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />}
            </button>

            {financeiroOpen && (
              <div className="ml-7 mt-1 space-y-1">
                {financeiroSubItems.map((sub) => {
                  const isActive = sub.exact
                    ? pathname === sub.href
                    : pathname === sub.href || pathname.startsWith(sub.href + '/')
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        'flex items-center px-3 py-1.5 rounded-md text-xs transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {sub.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4 mr-2" /><span className="text-xs">Recolher</span></>}
        </Button>
      </div>
    </aside>
  )
}
