import { ArrowRight, Hand, Radio } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMovimentacoes } from '../api/hooks'
import { fmtHora, fmtRelativo } from '../lib/format'
import { TIPO_PONTO } from '../lib/labels'
import { Chassi, EmptyState, ErrorState, Skeleton, cx } from './ui'

/**
 * Últimas leituras. A lista é recarregada automaticamente a cada evento SSE
 * (o LiveProvider invalida as consultas), e itens novos piscam ao entrar.
 */
export function RecentFeed({ limite = 12, areaId }: { limite?: number; areaId?: number }) {
  const { data, isLoading, error, refetch } = useMovimentacoes({ size: limite, areaId })
  // padrão "ajustar estado durante o render": compara com a lista anterior para destacar itens novos
  const [anterior, setAnterior] = useState(data)
  const [novos, setNovos] = useState<Set<number>>(new Set())
  if (data !== anterior) {
    const antes = new Set(anterior?.content.map((m) => m.id))
    setNovos(anterior ? new Set(data?.content.filter((m) => !antes.has(m.id)).map((m) => m.id)) : new Set())
    setAnterior(data)
  }

  if (isLoading)
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    )
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data?.content.length) return <EmptyState title="Sem leituras recentes" />

  return (
    <ul className="divide-y divide-line">
      {data.content.map((m) => (
        <li key={m.id} className={cx('flex items-center gap-3 px-5 py-3', novos.has(m.id) && 'flash-in')}>
          <span
            className={cx('grid size-8 shrink-0 place-items-center rounded-full', m.metodo === 'AUTOMATICA' ? 'bg-info-soft text-info' : 'bg-warn-soft text-warn')}
            title={m.tipoPontoLeitura ? TIPO_PONTO[m.tipoPontoLeitura] : 'Manual'}
          >
            {m.metodo === 'AUTOMATICA' ? <Radio className="size-4" /> : <Hand className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <Link to={`/consulta/${m.chassi}`} className="hover:underline">
              <Chassi value={m.chassi} />
            </Link>
            <p className="flex items-center gap-1 truncate text-xs text-muted">
              {m.modelo} <ArrowRight className="size-3" /> <span className="font-medium text-fg">{m.area.nome}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium tabular-nums">{fmtHora(m.entradaEm)}</p>
            <p className="text-[11px] text-muted">{fmtRelativo(m.entradaEm)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
