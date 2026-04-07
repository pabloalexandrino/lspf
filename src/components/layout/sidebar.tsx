'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Calendar, DollarSign, Package,
  ChevronLeft, ChevronRight, ChevronDown, Shield, Triangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const financeiroSubItems = [
  { href: '/financeiro', label: 'Visão Geral', exact: true },
  { href: '/financeiro/caixas', label: 'Caixas' },
  { href: '/financeiro/membros', label: 'Wallets' },
  { href: '/financeiro/mensalidades', label: 'Mensalidades' },
]

const topNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
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
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-[hsl(var(--sidebar-border))] transition-all duration-300',
        'bg-[hsl(var(--sidebar))]',
        collapsed ? 'w-[68px]' : 'w-[216px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 border-b border-[hsl(var(--sidebar-border))] shrink-0',
        collapsed ? 'justify-center p-4' : 'px-4 py-[18px]'
      )}>
        <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <Triangle className="h-[14px] w-[14px] text-primary" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-none">
            <p className="text-[11px] font-bold text-primary tracking-wider">LSPF</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Luz · Sabedoria · Fraternidade</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">

        {!collapsed && (
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40 px-3 pt-1 pb-2">
            Menu
          </p>
        )}

        {topNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-[17px] w-[17px] shrink-0 transition-colors', isActive ? 'text-primary' : 'group-hover:text-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                </>
              )}
            </Link>
          )
        })}

        {/* Financeiro group */}
        <div className={cn('pt-2', collapsed && 'pt-1')}>
          {!collapsed && (
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40 px-3 pb-2">
              Financeiro
            </p>
          )}

          {collapsed ? (
            <Link
              href="/financeiro"
              className={cn(
                'flex items-center justify-center px-2 py-2 rounded-lg text-[13px] transition-all duration-150',
                isFinanceiroActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
              )}
            >
              <DollarSign className="h-[17px] w-[17px]" />
            </Link>
          ) : (
            <div>
              <button
                onClick={() => setFinanceiroOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group',
                  isFinanceiroActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                )}
              >
                <DollarSign className="h-[17px] w-[17px] shrink-0" />
                <span className="flex-1 text-left">Financeiro</span>
                <ChevronDown className={cn(
                  'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                  !financeiroOpen && '-rotate-90'
                )} />
              </button>

              {financeiroOpen && (
                <div className="ml-[22px] mt-0.5 pl-3 border-l border-[hsl(var(--sidebar-border))] space-y-0.5">
                  {financeiroSubItems.map((sub) => {
                    const isActive = sub.exact
                      ? pathname === sub.href
                      : pathname === sub.href || pathname.startsWith(sub.href + '/')
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-all duration-150',
                          isActive
                            ? 'text-primary font-medium bg-primary/8'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                        )}
                      >
                        {isActive && <span className="h-1 w-1 rounded-full bg-primary shrink-0" />}
                        {sub.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-[hsl(var(--sidebar-border))]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.04] transition-all duration-150',
            collapsed && 'justify-center'
          )}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <><ChevronLeft className="h-3.5 w-3.5" /><span>Recolher</span></>
          }
        </button>
      </div>
    </aside>
  )
}
