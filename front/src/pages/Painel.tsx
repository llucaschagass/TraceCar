import { AlarmClock, Car, Gauge, Map as MapIcon, Radio, Timer, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PERIODOS, useMapa, useResumo, type PeriodoKey } from '../api/hooks'
import { AreaDetalhe } from '../components/AreaDetalhe'
import { FlowMap } from '../components/FlowMap'
import { KpiCard } from '../components/KpiCard'
import { RecentFeed } from '../components/RecentFeed'
import { Button, Card, CardHeader, Chassi, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '../components/ui'
import { fmtDuracao, fmtHoraSeg, fmtNum, fmtPct } from '../lib/format'

export function Painel() {
  const [periodo, setPeriodo] = useState<PeriodoKey>('24h')
  const [area, setArea] = useState<number | null>(null)
  const resumo = useResumo(periodo)
  const mapa = useMapa(false)
  const r = resumo.data
  const label = PERIODOS.find((p) => p.key === periodo)!.label.toLowerCase()

  return (
    <>
      <PageHeader
        title="Rastreamento no giro industrial"
        description="Visão geral do fluxo de veículos no Polo Automotivo de Betim."
        actions={<Segmented value={periodo} onChange={setPeriodo} options={PERIODOS.slice(0, 4).map((p) => ({ value: p.key, label: p.label }))} />}
      />

      {resumo.error ? (
        <Card className="mb-6">
          <ErrorState error={resumo.error} onRetry={resumo.refetch} />
        </Card>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard loading={!r} label="Em circulação" value={fmtNum(r?.emCirculacao)} hint={`de ${fmtNum(r?.totalVeiculos)} rastreados`} icon={<Car />} />
          <KpiCard loading={!r} label="Expedidos" value={fmtNum(r?.expedidosNoPeriodo)} hint={label} icon={<Truck />} tom="ok" />
          <KpiCard loading={!r} label="Movimentações" value={fmtNum(r?.movimentacoesNoPeriodo)} hint={label} icon={<Gauge />} tom="info" />
          <KpiCard loading={!r} label="Identificação automática" value={fmtPct(r?.percentualIdentificacaoAutomatica)} hint="RFID + câmera OCR" icon={<Radio />} tom="info" />
          <KpiCard className="col-span-2 lg:col-span-1" loading={!r} label="Tempo médio de ciclo" value={fmtDuracao(r?.tempoMedioCicloMinutos)} hint="da montagem à expedição" icon={<Timer />} tom="warn" />
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            icon={<MapIcon className="size-4" />}
            title="Áreas conectadas pelo registro de movimentações"
            subtitle={mapa.data ? `Mapa conceitual · sem escala · atualizado ${fmtHoraSeg(mapa.data.geradoEm)}` : 'Mapa conceitual · sem escala'}
            actions={
              <Link to="/mapa">
                <Button size="sm" variant="ghost">
                  Abrir mapa
                </Button>
              </Link>
            }
          />
          <div className="p-5">
            {mapa.isLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </div>
            ) : mapa.error ? (
              <ErrorState error={mapa.error} onRetry={mapa.refetch} />
            ) : (
              <FlowMap areas={mapa.data!.areas} selecionada={area} onSelect={setArea} />
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader icon={<Radio className="size-4" />} title="Últimas leituras" subtitle="Atualiza em tempo real" />
            <div className="scroll-thin max-h-[420px] overflow-y-auto">
              <RecentFeed limite={10} />
            </div>
          </Card>

          <Card>
            <CardHeader icon={<AlarmClock className="size-4" />} title="Parados há mais tempo" subtitle="Maiores permanências na área atual" />
            {!r ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9" />
                ))}
              </div>
            ) : r.maioresPermanenciasAtuais.length === 0 ? (
              <EmptyState title="Nenhum veículo em circulação" />
            ) : (
              <ul className="divide-y divide-line">
                {r.maioresPermanenciasAtuais.map((p) => (
                  <li key={p.chassi}>
                    <Link to={`/consulta/${p.chassi}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-2">
                      <span className="min-w-0">
                        <Chassi value={p.chassi} />
                        <span className="block truncate text-xs text-muted">
                          {p.modelo} · {p.area}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-warn tabular-nums">{fmtDuracao(p.minutos)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <AreaDetalhe areaId={area} onClose={() => setArea(null)} />
    </>
  )
}
