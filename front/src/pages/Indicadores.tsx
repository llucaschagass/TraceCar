import { ArrowRight, BarChart3, Clock, Gauge, TableIcon, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PERIODOS, useFluxo, usePermanencia, useUtilizacao, type PeriodoKey } from '../api/hooks'
import { Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, ProgressBar, Segmented, Skeleton, Table, Th } from '../components/ui'
import { ChartTooltip, Legenda, useChartColors } from '../lib/chart'
import { fmtDataHora, fmtDec, fmtDuracao, fmtHora, fmtNum, fmtPct } from '../lib/format'
import { tomPercentual } from '../lib/labels'

export function Indicadores() {
  const [periodo, setPeriodo] = useState<PeriodoKey>('24h')
  return (
    <>
      <PageHeader
        title="Indicadores"
        description="Fluxo, permanência e utilização das áreas no período selecionado."
        actions={<Segmented value={periodo} onChange={setPeriodo} options={PERIODOS.map((p) => ({ value: p.key, label: p.label }))} />}
      />
      <div className="grid gap-6">
        <FluxoSection periodo={periodo} />
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <PermanenciaSection periodo={periodo} />
          <UtilizacaoSection periodo={periodo} />
        </div>
      </div>
    </>
  )
}

/** Alterna gráfico/tabela — a tabela é a alternativa acessível de cada gráfico. */
function VisaoToggle({ tabela, setTabela }: { tabela: boolean; setTabela: (v: boolean) => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={() => setTabela(!tabela)} icon={tabela ? <BarChart3 className="size-4" /> : <TableIcon className="size-4" />}>
      {tabela ? 'Gráfico' : 'Tabela'}
    </Button>
  )
}

function Estado({ isLoading, error, refetch, children, altura = 'h-72' }: { isLoading: boolean; error: unknown; refetch: () => void; children: ReactNode; altura?: string }) {
  if (isLoading) return <Skeleton className={`m-5 ${altura}`} />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  return <>{children}</>
}

// ------------------------------------------------------------------ fluxo

function FluxoSection({ periodo }: { periodo: PeriodoKey }) {
  const q = useFluxo(periodo)
  const c = useChartColors()
  const [tabela, setTabela] = useState(false)
  const horas = PERIODOS.find((p) => p.key === periodo)!.horas
  const d = q.data
  // descarta a hora corrente (incompleta), que apareceria como uma queda falsa
  const fimMs = d ? new Date(d.fim).getTime() : 0
  const serie = d?.porHora.filter((h) => new Date(h.hora).getTime() + 3_600_000 <= fimMs + 60_000).map((h) => ({ ...h, label: horas > 48 ? fmtDataHora(h.hora) : fmtHora(h.hora) })) ?? []
  const maxTrans = Math.max(1, ...(d?.transicoes.map((t) => t.quantidade) ?? []))

  return (
    <>
      <Card>
        <CardHeader
          icon={<TrendingUp className="size-4" />}
          title="Fluxo de veículos por hora"
          subtitle="Entradas e saídas de áreas (todas as áreas somadas)"
          actions={
            <>
              <Legenda
                itens={[
                  { cor: c.s1, label: 'Entradas' },
                  { cor: c.s2, label: 'Saídas', tracejado: true },
                ]}
              />
              <VisaoToggle tabela={tabela} setTabela={setTabela} />
            </>
          }
        />
        <Estado {...q}>
          {tabela ? (
            <Table className="max-h-80">
              <thead>
                <tr>
                  <Th>Hora</Th>
                  <Th className="text-right">Entradas</Th>
                  <Th className="text-right">Saídas</Th>
                </tr>
              </thead>
              <tbody>
                {serie.map((h) => (
                  <tr key={h.hora}>
                    <td>{fmtDataHora(h.hora)}</td>
                    <td className="text-right tabular-nums">{h.entradas}</td>
                    <td className="text-right tabular-nums">{h.saidas}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="h-72 px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 280 }}>
                <AreaChart data={serie} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.s1} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={c.s1} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.grid }} minTickGap={28} />
                  <YAxis tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="entradas" name="Entradas" stroke={c.s1} strokeWidth={2} fill="url(#gEnt)" activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface }} />
                  <Area type="monotone" dataKey="saidas" name="Saídas" stroke={c.s2} strokeWidth={2} strokeDasharray="5 3" fill="none" activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Estado>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader
            title="Entradas e saídas por área"
            subtitle="Vazão = saídas por hora no período"
            actions={
              <Legenda
                itens={[
                  { cor: c.s1, label: 'Entradas' },
                  { cor: c.s2, label: 'Saídas' },
                ]}
              />
            }
          />
          <Estado {...q}>
            <div className="h-72 px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 280 }}>
                <BarChart data={d?.porArea} margin={{ top: 4, right: 16, left: -8, bottom: 0 }} barGap={2} barCategoryGap="28%">
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="nome" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.grid }} interval={0} />
                  <YAxis tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c.track }} />
                  <Bar dataKey="entradas" name="Entradas" fill={c.s1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="saidas" name="Saídas" fill={c.s2} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line px-5 py-3 text-xs text-muted">
              {d?.porArea.map((a) => (
                <span key={a.areaId}>
                  {a.nome}: <span className="font-semibold text-fg tabular-nums">{fmtDec(a.vazaoPorHora)}/h</span>
                </span>
              ))}
            </div>
          </Estado>
        </Card>

        <Card>
          <CardHeader title="Transições entre áreas" subtitle="Quantos veículos seguiram cada caminho" />
          <Estado {...q}>
            {!d?.transicoes.length ? (
              <EmptyState title="Sem transições no período" />
            ) : (
              <ul className="space-y-3 p-5">
                {d.transicoes.map((t) => (
                  <li key={`${t.origem}-${t.destino}`}>
                    <div className="mb-1 flex items-center gap-1.5 text-sm">
                      <span>{t.origemNome}</span>
                      <ArrowRight className="size-3.5 text-muted" />
                      <span className="font-medium">{t.destinoNome}</span>
                      <span className="ml-auto font-semibold tabular-nums">{fmtNum(t.quantidade)}</span>
                    </div>
                    <ProgressBar value={(t.quantidade / maxTrans) * 100} tom={t.destino === 'RETRABALHO' ? 'warn' : 'info'} className="h-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </Estado>
        </Card>
      </div>
    </>
  )
}

// ------------------------------------------------------------ permanência

function PermanenciaSection({ periodo }: { periodo: PeriodoKey }) {
  const q = usePermanencia(periodo)
  const c = useChartColors()
  const [tabela, setTabela] = useState(false)
  const areas = q.data?.areas ?? []

  return (
    <Card>
      <CardHeader
        icon={<Clock className="size-4" />}
        title="Tempo de permanência por área"
        subtitle="Passagens encerradas no período — mediana e P90"
        actions={
          <>
            <Legenda
              itens={[
                { cor: c.s1, label: 'Mediana' },
                { cor: c.s2, label: 'P90' },
              ]}
            />
            <VisaoToggle tabela={tabela} setTabela={setTabela} />
          </>
        }
      />
      <Estado {...q}>
        {tabela ? (
          <Table>
            <thead>
              <tr>
                <Th>Área</Th>
                <Th className="text-right">Passagens</Th>
                <Th className="text-right">Média</Th>
                <Th className="text-right">Mediana</Th>
                <Th className="text-right">P90</Th>
                <Th className="text-right">Máx.</Th>
                <Th className="text-right">Agora</Th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.areaId}>
                  <td className="font-medium">{a.nome}</td>
                  <td className="text-right tabular-nums">{fmtNum(a.passagens)}</td>
                  <td className="text-right tabular-nums">{fmtDuracao(a.mediaMinutos)}</td>
                  <td className="text-right tabular-nums">{fmtDuracao(a.medianaMinutos)}</td>
                  <td className="text-right tabular-nums">{fmtDuracao(a.p90Minutos)}</td>
                  <td className="text-right tabular-nums">{fmtDuracao(a.maximoMinutos)}</td>
                  <td className="text-right tabular-nums">{fmtDuracao(a.mediaAtualMinutos)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="h-80 px-2 pt-4 pb-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 280 }}>
              <BarChart data={areas} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barGap={2} barCategoryGap="24%">
                <CartesianGrid stroke={c.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtDuracao(v)} />
                <YAxis type="category" dataKey="nome" tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip content={<ChartTooltip formatValue={fmtDuracao} />} cursor={{ fill: c.track }} />
                <Bar dataKey="medianaMinutos" name="Mediana" fill={c.s1} radius={[0, 4, 4, 0]} maxBarSize={14} />
                <Bar dataKey="p90Minutos" name="P90" fill={c.s2} radius={[0, 4, 4, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Estado>
    </Card>
  )
}

// ------------------------------------------------------------- utilização

function UtilizacaoSection({ periodo }: { periodo: PeriodoKey }) {
  const q = useUtilizacao(periodo)
  return (
    <Card>
      <CardHeader icon={<Gauge className="size-4" />} title="Utilização das áreas" subtitle="Ocupação média no período e ocupação agora, em relação à capacidade" />
      <Estado {...q}>
        <ul className="divide-y divide-line">
          {q.data?.areas.map((a) => (
            <li key={a.areaId} className="px-5 py-3.5">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="font-medium">{a.nome}</span>
                <span className="text-xs text-muted">capacidade {a.capacidade}</span>
              </div>
              <div className="grid grid-cols-[64px_1fr_120px] items-center gap-3 text-xs">
                <span className="text-muted">Média</span>
                <ProgressBar value={a.percentualMedio} tom={tomPercentual(a.percentualMedio)} />
                <span className="text-right tabular-nums">
                  <span className="font-semibold text-fg">{fmtPct(a.percentualMedio)}</span> <span className="text-muted">({fmtDec(a.ocupacaoMedia)})</span>
                </span>
                <span className="text-muted">Agora</span>
                <ProgressBar value={a.percentualAtual} tom={tomPercentual(a.percentualAtual)} />
                <span className="text-right tabular-nums">
                  <span className="font-semibold text-fg">{fmtPct(a.percentualAtual)}</span> <span className="text-muted">({a.ocupacaoAtual})</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">Faixas: até 70% normal · 70–90% atenção · acima de 90% crítica.</p>
      </Estado>
    </Card>
  )
}
