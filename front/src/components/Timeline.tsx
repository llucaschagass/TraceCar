import { Hand, LogIn, LogOut, Radio, User } from 'lucide-react'
import type { Movimentacao } from '../api/types'
import { fmtDataHora, fmtDuracao } from '../lib/format'
import { TIPO_PONTO } from '../lib/labels'
import { Badge, cx } from './ui'

/** Linha do tempo das permanências de um veículo (mais recente no topo). */
export function Timeline({ itens, expedido }: { itens: Movimentacao[]; expedido?: string | null }) {
  const lista = [...itens].reverse()
  const maior = Math.max(1, ...itens.map((m) => m.duracaoMinutos))

  return (
    <ol className="relative">
      {expedido && (
        <li className="relative flex gap-4 pb-6">
          <Linha />
          <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-ok text-white">
            <LogOut className="size-4" />
          </span>
          <div className="pt-1.5">
            <p className="font-semibold">Expedido</p>
            <p className="text-sm text-muted">{fmtDataHora(expedido)} · saiu do polo</p>
          </div>
        </li>
      )}
      {lista.map((m, i) => {
        const atual = m.emAndamento
        const auto = m.metodo === 'AUTOMATICA'
        return (
          <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < lista.length - 1 && <Linha />}
            <span
              className={cx(
                'relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2',
                atual ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted',
              )}
            >
              {atual && <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />}
              <span className="text-xs font-bold">{lista.length - i}</span>
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{m.area.nome}</p>
                {atual && (
                  <Badge tom="brand" dot>
                    Localização atual
                  </Badge>
                )}
                <Badge tom={auto ? 'info' : 'warn'} className="ml-auto">
                  {auto ? <Radio className="size-3" /> : <Hand className="size-3" />}
                  {auto ? 'Identificação automática' : 'Apontamento manual'}
                </Badge>
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-3">
                <span className="inline-flex items-center gap-1.5">
                  <LogIn className="size-3.5" /> {fmtDataHora(m.entradaEm)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LogOut className="size-3.5" /> {atual ? 'em andamento' : fmtDataHora(m.saidaEm)}
                </span>
                <span className="font-medium text-fg">{fmtDuracao(m.duracaoMinutos)}</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className={cx('h-full rounded-full', atual ? 'bg-brand' : 'bg-brand/45')} style={{ width: `${(m.duracaoMinutos / maior) * 100}%` }} />
              </div>
              <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">
                {m.pontoLeitura && (
                  <span>
                    {m.tipoPontoLeitura ? TIPO_PONTO[m.tipoPontoLeitura] : 'Ponto'}: <span className="font-mono">{m.pontoLeitura}</span>
                  </span>
                )}
                {m.operador && (
                  <span className="inline-flex items-center gap-1">
                    <User className="size-3" /> {m.operador}
                  </span>
                )}
                {m.observacao && <span>“{m.observacao}”</span>}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Linha() {
  return <span className="absolute top-9 bottom-0 left-[17px] w-0.5 bg-line" aria-hidden />
}
