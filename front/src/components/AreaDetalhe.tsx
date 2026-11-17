import { Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMapaArea } from '../api/hooks'
import { fmtDataHora, fmtDuracao } from '../lib/format'
import { SITUACAO, tomSituacao } from '../lib/labels'
import { Badge, Chassi, EmptyState, ErrorState, Modal, ProgressBar, Skeleton } from './ui'

/** Lista os veículos presentes numa área agora, do mais antigo para o mais recente. */
export function AreaDetalhe({ areaId, onClose }: { areaId: number | null; onClose: () => void }) {
  const { data, isLoading, error, refetch } = useMapaArea(areaId)
  return (
    <Modal open={areaId != null} onClose={onClose} title={data ? `${data.nome} — veículos presentes` : 'Área'} width="max-w-2xl">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data ? (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">Ocupação</p>
              <p className="text-lg font-semibold tabular-nums">
                {data.ocupacao} / {data.capacidade}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Situação</p>
              <Badge tom={tomSituacao(data.situacao)} dot>
                {SITUACAO[data.situacao]} · {Math.round(data.percentualOcupacao)}%
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted">Permanência média atual</p>
              <p className="text-lg font-semibold">{fmtDuracao(data.permanenciaMediaAtualMinutos)}</p>
            </div>
          </div>
          <ProgressBar value={data.percentualOcupacao} tom={tomSituacao(data.situacao)} className="mb-4" />
          {!data.veiculos?.length ? (
            <EmptyState title="Área vazia" description="Nenhum veículo nesta área no momento." />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {data.veiculos.map((v) => (
                <li key={v.chassi}>
                  <Link to={`/consulta/${v.chassi}`} onClick={onClose} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-2">
                    <span className="min-w-0">
                      <Chassi value={v.chassi} />
                      <span className="block truncate text-xs text-muted">
                        {v.modelo} {v.versao} · {v.cor}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
                        <Clock className="size-3.5 text-muted" /> {fmtDuracao(v.minutosNaArea)}
                      </span>
                      <span className="block text-[11px] text-muted">desde {fmtDataHora(v.desde)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Modal>
  )
}
