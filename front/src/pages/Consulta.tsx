import { Check, Clock, History, MapPin, Radio, ScanLine, Search, Tag, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAreas, useHistorico } from '../api/hooks'
import type { HistoricoVeiculo } from '../api/types'
import { ChassiSearch } from '../components/ChassiSearch'
import { Timeline } from '../components/Timeline'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Skeleton, cx } from '../components/ui'
import { fmtDataHora, fmtDuracao, fmtRelativo, splitChassi } from '../lib/format'
import { STATUS } from '../lib/labels'

export function Consulta() {
  const { chassi } = useParams()
  const navigate = useNavigate()
  const hist = useHistorico(chassi?.toUpperCase())

  return (
    <>
      <div className={cx('mx-auto transition-all', chassi ? 'mb-6 max-w-3xl' : 'max-w-2xl pt-10 sm:pt-20')}>
        {!chassi && (
          <div className="mb-8 text-center">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Search className="size-7" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight">Consulta por chassi</h1>
            <p className="mt-2 text-muted">Localização atual e histórico completo de movimentação do veículo.</p>
          </div>
        )}
        <ChassiSearch size="lg" autoFocus={!chassi} onSelect={(c) => navigate(`/consulta/${c}`)} />
        {!chassi && <p className="mt-3 text-center text-xs text-muted">Dica: digite apenas os últimos 6 dígitos (número de série) — ex.: 200136</p>}
      </div>

      {chassi &&
        (hist.isLoading ? (
          <Carregando />
        ) : hist.error ? (
          <Card>
            {hist.error instanceof ApiError && hist.error.status === 404 ? (
              <EmptyState icon={<Search className="size-5" />} title="Veículo não encontrado" description={`Não há veículo rastreado com o chassi ${chassi.toUpperCase()}.`} />
            ) : (
              <ErrorState error={hist.error} onRetry={hist.refetch} />
            )}
          </Card>
        ) : hist.data ? (
          <Resultado h={hist.data} />
        ) : null)}
    </>
  )
}

function Resultado({ h }: { h: HistoricoVeiculo }) {
  const v = h.veiculo
  const [ini, serie] = splitChassi(v.chassi)
  const expedido = v.status === 'EXPEDIDO'

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden">
          <div className="bg-[#14204a] px-5 py-5 text-white dark:bg-[#0d1530]">
            <p className="text-xs font-medium tracking-wider text-white/60 uppercase">Chassi</p>
            <p className="mt-1 font-mono text-xl tracking-tight break-all">
              <span className="text-white/60">{ini}</span>
              <span className="font-bold">{serie}</span>
            </p>
            <p className="mt-2 text-sm text-white/80">
              {v.marca} {v.modelo} {v.versao} · {v.cor} · {v.anoModelo}
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <span className={cx('grid size-10 place-items-center rounded-xl', expedido ? 'bg-ok-soft text-ok' : 'bg-brand-soft text-brand')}>
                {expedido ? <Truck className="size-5" /> : <MapPin className="size-5" />}
              </span>
              <div>
                <p className="text-xs text-muted">{expedido ? 'Situação' : 'Localização atual'}</p>
                <p className="text-lg font-semibold">{expedido ? 'Expedido' : v.areaAtual?.nome}</p>
              </div>
              <Badge tom={expedido ? 'ok' : 'brand'} dot className="ml-auto">
                {STATUS[v.status]}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Info icon={<Clock />} label={expedido ? 'Expedido em' : 'Na área há'} value={expedido ? fmtDataHora(v.ultimaMovimentacaoEm) : fmtDuracao(v.minutosNaAreaAtual)} />
              <Info icon={<History />} label="Última leitura" value={fmtRelativo(v.ultimaMovimentacaoEm)} />
              <Info icon={<Tag />} label="Tag RFID" value={<span className="font-mono text-xs">{v.tagRfid ?? '—'}</span>} />
              <Info icon={<Radio />} label="Leituras" value={`${h.leiturasAutomaticas} auto · ${h.leiturasManuais} manual`} />
            </dl>
            {!expedido && (
              <Link to={`/registrar?chassi=${v.chassi}`} className="block">
                <Button variant="primary" className="w-full" icon={<ScanLine className="size-4" />}>
                  Registrar movimentação
                </Button>
              </Link>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Percurso no fluxo" subtitle={`${h.quantidadeAreas} áreas · tempo total ${fmtDuracao(h.tempoTotalMinutos)}`} />
          <Percurso h={h} />
        </Card>
      </div>

      <Card>
        <CardHeader icon={<History className="size-4" />} title="Histórico de movimentação" subtitle={`${h.movimentacoes.length} registros por área`} />
        <div className="p-5">
          {h.movimentacoes.length === 0 ? (
            <EmptyState title="Sem movimentações" description="O veículo foi cadastrado mas ainda não foi identificado em nenhuma área." />
          ) : (
            <Timeline itens={h.movimentacoes} expedido={expedido ? v.ultimaMovimentacaoEm : null} />
          )}
        </div>
      </Card>
    </div>
  )
}

/** Etapas do fluxo marcadas como concluída / atual / pendente / não passou. */
function Percurso({ h }: { h: HistoricoVeiculo }) {
  const { data: areas } = useAreas()
  if (!areas) return <Skeleton className="m-5 h-40" />
  const visitadas = new Map(h.movimentacoes.map((m) => [m.area.id, m]))
  const atual = h.veiculo.areaAtual?.id
  const ordemAtual = areas.find((a) => a.id === atual)?.ordemFluxo ?? Infinity
  const expedido = h.veiculo.status === 'EXPEDIDO'

  return (
    <ol className="space-y-1 p-5">
      {areas
        .filter((a) => a.ativa)
        .map((a) => {
          const m = visitadas.get(a.id)
          const estado = a.id === atual ? 'atual' : m ? 'ok' : a.ordemFluxo < ordemAtual || expedido ? 'pulou' : 'pendente'
          return (
            <li key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <span
                className={cx(
                  'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                  estado === 'ok' && 'bg-ok text-white',
                  estado === 'atual' && 'bg-brand text-white ring-4 ring-brand/20',
                  estado === 'pendente' && 'border-2 border-line text-muted',
                  estado === 'pulou' && 'border-2 border-dashed border-line text-muted',
                )}
              >
                {estado === 'ok' ? <Check className="size-3.5" /> : a.ordemFluxo}
              </span>
              <span className={cx('flex-1 text-sm', estado === 'pulou' || estado === 'pendente' ? 'text-muted' : 'font-medium')}>
                {a.nome}
                {estado === 'pulou' && <span className="ml-1 text-xs">(não passou)</span>}
              </span>
              {m && <span className="text-xs text-muted tabular-nums">{fmtDuracao(m.duracaoMinutos)}</span>}
            </li>
          )
        })}
    </ol>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}

function Carregando() {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-[520px] rounded-xl" />
    </div>
  )
}
