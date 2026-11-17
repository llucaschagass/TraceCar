import { Clock, Filter, Map as MapIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMapa } from '../api/hooks'
import { FlowMap } from '../components/FlowMap'
import { Badge, Card, CardHeader, Chassi, EmptyState, ErrorState, Input, PageHeader, ProgressBar, Select, Skeleton } from '../components/ui'
import { fmtDataHora, fmtDuracao, fmtHoraSeg } from '../lib/format'
import { SITUACAO, tomSituacao } from '../lib/labels'

export function MapaPage() {
  const { data, isLoading, error, refetch } = useMapa(true)
  const [selecionada, setSelecionada] = useState<number | null>(null)
  const [modelo, setModelo] = useState('')
  const [busca, setBusca] = useState('')

  const areaId = selecionada ?? data?.areas[0]?.id ?? null
  const area = data?.areas.find((a) => a.id === areaId)

  const modelos = useMemo(() => [...new Set(data?.areas.flatMap((a) => a.veiculos?.map((v) => v.modelo) ?? []))].sort(), [data])
  const veiculos = (area?.veiculos ?? []).filter(
    (v) => (!modelo || v.modelo === modelo) && (!busca || v.chassi.includes(busca.trim().toUpperCase())),
  )

  return (
    <>
      <PageHeader
        title="Mapa em tempo real"
        description={data ? `${data.totalEmCirculacao} veículos em circulação · atualizado ${fmtHoraSeg(data.geradoEm)}` : 'Ocupação das áreas do giro industrial'}
      />

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader icon={<MapIcon className="size-4" />} title="Mapa conceitual" subtitle="Selecione uma área para ver os veículos presentes" />
            <div className="p-5">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-36" />
                  ))}
                </div>
              ) : (
                <FlowMap areas={data!.areas} selecionada={areaId} onSelect={setSelecionada} />
              )}

              {data && (
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.areas.map((a) => (
                    <div key={a.id} className="rounded-lg border border-line p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{a.nome}</span>
                        <span className="text-muted tabular-nums">
                          {a.ocupacao}/{a.capacidade}
                        </span>
                      </div>
                      <ProgressBar value={a.percentualOcupacao} tom={tomSituacao(a.situacao)} className="mt-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="flex max-h-[calc(100vh-8rem)] flex-col xl:sticky xl:top-24">
            <CardHeader
              title={area ? area.nome : 'Área'}
              subtitle={area ? `${area.ocupacao} de ${area.capacidade} vagas ocupadas` : undefined}
              actions={area && <Badge tom={tomSituacao(area.situacao)} dot>{SITUACAO[area.situacao]}</Badge>}
            />
            <div className="flex gap-2 border-b border-line px-5 py-3">
              <Input placeholder="Filtrar chassi" value={busca} onChange={(e) => setBusca(e.target.value)} className="h-9 font-mono uppercase placeholder:font-sans placeholder:normal-case" />
              <Select value={modelo} onChange={(e) => setModelo(e.target.value)} className="h-9 w-40" aria-label="Filtrar modelo">
                <option value="">Todos modelos</option>
                {modelos.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : veiculos.length === 0 ? (
                <EmptyState icon={<Filter className="size-5" />} title="Nenhum veículo" description={area?.ocupacao ? 'Nenhum veículo corresponde aos filtros.' : 'A área está vazia no momento.'} />
              ) : (
                <ul className="divide-y divide-line">
                  {veiculos.map((v) => (
                    <li key={v.chassi}>
                      <Link to={`/consulta/${v.chassi}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-2">
                        <span className="min-w-0">
                          <Chassi value={v.chassi} />
                          <span className="block truncate text-xs text-muted">
                            {v.modelo} {v.versao} · {v.cor}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
                            <Clock className="size-3.5 text-muted" />
                            {fmtDuracao(v.minutosNaArea)}
                          </span>
                          <span className="block text-[11px] text-muted">{fmtDataHora(v.desde)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
