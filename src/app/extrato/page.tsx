import Image from 'next/image'
import { BuscaCimForm } from '@/components/financeiro/busca-cim-form'

/**
 * Public CIM lookup page — no authentication required.
 * Route: /extrato
 */
export default function ExtratoIndexPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-8 shadow-sm">
          <Image
            src="/logo.png"
            alt="Logo"
            width={100}
            height={100}
            className="object-contain"
          />

          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              Extrato da Carteira
            </h1>
            <p className="text-sm text-muted-foreground">
              Digite seu CIM para consultar seu saldo e movimentações
            </p>
          </div>

          <div className="w-full pt-2">
            <BuscaCimForm />
          </div>
        </div>
      </div>
    </main>
  )
}
