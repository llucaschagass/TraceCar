import { Download, Hand, ListOrdered, Radio, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAreas, useMovimentacoes, type FiltroMovimentacoes } from '../api/hooks'
import type { MetodoIdentificacao, Movimentacao } from '../api/types'
import { Badge, Button, Card, CardHeader, Chassi, EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Skeleton, Table, Th, Toggle } from '../components/ui'
import { useDebounce } from '../hooks/useDebounce'
import { fmtDataHora, fmtDuracao, localInputToIso } from '../lib/format'
import { TIPO_PONTO } from '../lib/labels'

export function Movimentacoes() {
  const { data: areas } = useAreas()
  const [chassi, setChassi] = useState('')
  const [areaId, setAreaId] = useState('')
  const [metodo, setMetodo] = useState<MetodoIdentificacao | ''>('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [emAndamento, setEmAndamento] = useState(false)
  const [page, setPage] = useState(0)
  const chassiD = useDebounce(chassi.trim().toUpperCase(), 350)

  const filtro: FiltroMovimentacoes = {
    chassi: chassiD,
    areaId: areaId ? Number(areaId) : null,
    metodo,
    inicio: localInputToIso(inicio) ?? undefined,
    fim: localInputToIso(fim) ?? undefined,
    emAndamento: emAndamento || undefined,
    page,
    size: 25,
  }
  const { data, isLoading, isFetching, error, refetch } = useMovimentacoes(filtro)
  const temFiltro = chassi || areaId || metodo || inicio || fim || emAndamento

  const set = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(0)
  }
  const limpar = () => {
    setChassi('')
    setAreaId('')
    setMetodo('')
    setInicio('')
    setFim('')
    setEmAndamento(false)
    setPage(0)
  }

  return (
    <>
      <PageHeader
        title="Movimentações"
        description="Registro de todas as entradas e saídas de veículos nas áreas."
        actions={
          <Button icon={<Download className="size-4" />} disabled={!data?.content.length} onClick={() => data && exportarCsv(data.content)}>
            Exportar página (CSV)
          </Button>
        }
      />
      <Card>
        <CardHeader icon={<ListOrdered className="size-4" />} title="Filtros" subtitle={isFetching && !isLoading ? 'Atualizando…' : undefined} actions={temFiltro && <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={limpar}>Limpar</Button>} />
        <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
          <Input aria-label="Chassi" placeholder="Chassi (trecho)" value={chassi} onChange={(e) => set(setChassi)(e.target.value)} className="font-mono uppercase placeholder:font-sans placeholder:normal-case" />
          <Select aria-label="Área" value={areaId} onChange={(e) => set(setAreaId)(e.target.value)}>
            <option value="">Todas as áreas</option>
            {areas?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
          <Select aria-label="Método" value={metodo} onChange={(e) => set(setMetodo)(e.target.value as MetodoIdentificacao | '')}>
            <option value="">Todos os métodos</option>
            <option value="AUTOMATICA">Automática</option>
            <option value="MANUAL">Manual</option>
          </Select>
          <Input aria-label="Entrada a partir de" type="datetime-local" value={inicio} onChange={(e) => set(setInicio)(e.target.value)} title="Entrada a partir de" />
          <Input aria-label="Entrada até" type="datetime-local" value={fim} onChange={(e) => set(setFim)(e.target.value)} title="Entrada até" />
          <div className="flex h-10 items-center">
            <Toggle checked={emAndamento} onChange={set(setEmAndamento)} label="Em andamento" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data?.content.length ? (
          <EmptyState title="Nenhuma movimentação" description="Ajuste os filtros para ver resultados." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Chassi</Th>
                  <Th>Modelo</Th>
                  <Th>Área</Th>
                  <Th>Entrada</Th>
                  <Th>Saída</Th>
                  <Th className="text-right">Permanência</Th>
                  <Th>Identificação</Th>
                  <Th>Ponto / operador</Th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/consulta/${m.chassi}`} className="hover:underline">
                        <Chassi value={m.chassi} />
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{m.modelo}</td>
                    <td className="font-medium whitespace-nowrap">{m.area.nome}</td>
                    <td className="whitespace-nowrap tabular-nums">{fmtDataHora(m.entradaEm)}</td>
                    <td className="whitespace-nowrap tabular-nums">{m.emAndamento ? <Badge tom="brand" dot>Na área</Badge> : fmtDataHora(m.saidaEm)}</td>
                    <td className="text-right whitespace-nowrap tabular-nums">{fmtDuracao(m.duracaoMinutos)}</td>
                    <td>
                      <Badge tom={m.metodo === 'AUTOMATICA' ? 'info' : 'warn'}>
                        {m.metodo === 'AUTOMATICA' ? <Radio className="size-3" /> : <Hand className="size-3" />}
                        {m.tipoPontoLeitura ? TIPO_PONTO[m.tipoPontoLeitura] : 'Manual'}
                      </Badge>
                    </td>
                    <td className="text-xs whitespace-nowrap text-muted">
                      {m.pontoLeitura && <span className="font-mono">{m.pontoLeitura}</span>}
                      {m.operador && <span className="block">{m.operador}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.totalElements} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  )
}

function exportarCsv(itens: Movimentacao[]) {
  const cab = ['chassi', 'modelo', 'area', 'entrada', 'saida', 'duracao_min', 'metodo', 'ponto_leitura', 'operador', 'observacao']
  const esc = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
  const linhas = itens.map((m) =>
    [m.chassi, m.modelo, m.area.nome, m.entradaEm, m.saidaEm, m.duracaoMinutos, m.metodo, m.pontoLeitura, m.operador, m.observacao].map(esc).join(';'),
  )
  const blob = new Blob(['﻿' + [cab.join(';'), ...linhas].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `movimentacoes-${new Date().toISOString().slice(0, 16).replace(':', 'h')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
