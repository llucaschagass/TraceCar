import { CheckCircle2, Hand, Info, Radio, Truck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '../api/client'
import { useAreas, useExpedir, usePontos, useRegistrarLeitura, useRegistrarManual } from '../api/hooks'
import type { LeituraResponse, Movimentacao } from '../api/types'
import { ChassiSearch } from '../components/ChassiSearch'
import { Badge, Button, Card, CardHeader, Chassi, Field, Input, PageHeader, Segmented, Select, Textarea } from '../components/ui'
import { CHASSI_REGEX, fmtDataHora, localInputToIso } from '../lib/format'
import { TIPO_PONTO } from '../lib/labels'
import { gravarLocal, lerLocal } from '../lib/storage'

type Aba = 'leitura' | 'manual' | 'expedicao'

export function Registrar() {
  const [params] = useSearchParams()
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) ?? 'leitura')
  const [ultimo, setUltimo] = useState<{ titulo: string; mov: Movimentacao; nova: boolean } | null>(null)
  const chassiInicial = params.get('chassi') ?? ''

  return (
    <>
      <PageHeader title="Registrar movimentação" description="Simule um dispositivo de identificação automática, faça um apontamento manual ou registre a expedição." />

      <div className="mb-5">
        <Segmented<Aba>
          value={aba}
          onChange={setAba}
          options={[
            { value: 'leitura', label: 'Leitura automática' },
            { value: 'manual', label: 'Apontamento manual' },
            { value: 'expedicao', label: 'Expedição' },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          {aba === 'leitura' && <FormLeitura chassiInicial={chassiInicial} onOk={(r) => setUltimo({ titulo: r.mensagem, mov: r.movimentacao, nova: r.novaMovimentacao })} />}
          {aba === 'manual' && <FormManual chassiInicial={chassiInicial} onOk={(r) => setUltimo({ titulo: r.mensagem, mov: r.movimentacao, nova: r.novaMovimentacao })} />}
          {aba === 'expedicao' && <FormExpedicao chassiInicial={chassiInicial} onOk={(m) => setUltimo({ titulo: 'Veículo expedido.', mov: m, nova: true })} />}
        </Card>

        <div className="flex flex-col gap-6">
          {ultimo ? (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${ultimo.nova ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>
                  {ultimo.nova ? <CheckCircle2 className="size-5" /> : <Info className="size-5" />}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{ultimo.titulo}</p>
                  <Link to={`/consulta/${ultimo.mov.chassi}`} className="hover:underline">
                    <Chassi value={ultimo.mov.chassi} />
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {ultimo.mov.modelo} · {ultimo.mov.area.nome} · {fmtDataHora(ultimo.mov.saidaEm ?? ultimo.mov.entradaEm)}
                  </p>
                  <Link to={`/consulta/${ultimo.mov.chassi}`} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
                    Ver histórico →
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}
          <Card className="p-5 text-sm text-muted">
            <p className="mb-2 font-semibold text-fg">Como funciona</p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>Uma leitura em área diferente da atual encerra a permanência anterior e abre uma nova.</li>
              <li>Leituras repetidas na mesma área são ignoradas (portais RFID leem a mesma tag várias vezes).</li>
              <li>O identificador pode ser o chassi (VIN) ou o código da tag RFID.</li>
              <li>A expedição só é permitida a partir da última área do fluxo.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}

function erroDe(e: unknown) {
  return e instanceof ApiError ? e : null
}

function DataHora({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Data/hora da leitura" hint="Opcional — vazio usa o horário atual.">
      {(id) => <Input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}

function CampoChassi({ value, onChange, erro }: { value: string; onChange: (v: string) => void; erro?: string }) {
  return (
    <Field label="Chassi" error={erro}>
      {(id) => (
        <div className="space-y-2">
          <Input id={id} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder="17 caracteres" maxLength={17} className="font-mono uppercase" aria-invalid={!!erro} />
          <ChassiSearch onSelect={onChange} />
        </div>
      )}
    </Field>
  )
}

// ---------------------------------------------------------------------------

function FormLeitura({ chassiInicial, onOk }: { chassiInicial: string; onOk: (r: LeituraResponse) => void }) {
  const { data: pontos } = usePontos()
  const mut = useRegistrarLeitura()
  const [ponto, setPonto] = useState('')
  const [ident, setIdent] = useState(chassiInicial)
  const [quando, setQuando] = useState('')
  const err = erroDe(mut.error)

  const grupos = useMemo(() => {
    const m = new Map<string, NonNullable<typeof pontos>>()
    pontos?.filter((p) => p.ativo && p.tipo !== 'MANUAL').forEach((p) => m.set(p.area.nome, [...(m.get(p.area.nome) ?? []), p]))
    return [...m.entries()]
  }, [pontos])

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    mut.mutate(
      { codigoPontoLeitura: ponto, identificador: ident.trim(), dataHora: localInputToIso(quando) },
      {
        onSuccess: (r) => {
          onOk(r)
          if (r.novaMovimentacao) toast.success(r.mensagem)
          else toast.info(r.mensagem)
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <form onSubmit={enviar}>
      <CardHeader icon={<Radio className="size-4" />} title="Leitura automática" subtitle="Simula o evento enviado por um portal RFID, câmera OCR ou leitor QR" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Ponto de leitura" className="sm:col-span-2" error={err?.campos.codigoPontoLeitura}>
          {(id) => (
            <Select id={id} required value={ponto} onChange={(e) => setPonto(e.target.value)}>
              <option value="">Selecione o dispositivo…</option>
              {grupos.map(([area, ps]) => (
                <optgroup key={area} label={area}>
                  {ps.map((p) => (
                    <option key={p.id} value={p.codigo}>
                      {p.codigo} — {TIPO_PONTO[p.tipo]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Identificador lido" hint="Chassi (VIN) ou tag RFID" className="sm:col-span-2" error={err?.campos.identificador}>
          {(id) => (
            <div className="space-y-2">
              <Input id={id} required value={ident} onChange={(e) => setIdent(e.target.value.toUpperCase())} className="font-mono uppercase" placeholder="9BD… ou E2806894…" />
              <ChassiSearch onSelect={setIdent} />
            </div>
          )}
        </Field>
        <DataHora value={quando} onChange={setQuando} />
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button type="submit" variant="primary" loading={mut.isPending} icon={<Radio className="size-4" />}>
          Enviar leitura
        </Button>
      </div>
    </form>
  )
}

function FormManual({ chassiInicial, onOk }: { chassiInicial: string; onOk: (r: LeituraResponse) => void }) {
  const { data: areas } = useAreas()
  const mut = useRegistrarManual()
  const [chassi, setChassi] = useState(chassiInicial)
  const [areaId, setAreaId] = useState('')
  const [operador, setOperador] = useState(() => lerLocal('tracecar-operador'))
  const [obs, setObs] = useState('')
  const [quando, setQuando] = useState('')
  const err = erroDe(mut.error)
  const chassiInvalido = chassi.length > 0 && !CHASSI_REGEX.test(chassi)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    gravarLocal('tracecar-operador', operador)
    mut.mutate(
      { chassi, areaId: Number(areaId), operador, observacao: obs || null, dataHora: localInputToIso(quando) },
      {
        onSuccess: (r) => {
          onOk(r)
          if (r.novaMovimentacao) toast.success(r.mensagem)
          else toast.info(r.mensagem)
          setObs('')
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <form onSubmit={enviar}>
      <CardHeader icon={<Hand className="size-4" />} title="Apontamento manual" subtitle="Contingência ou áreas sem leitor automático" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CampoChassi value={chassi} onChange={setChassi} erro={chassiInvalido ? 'Chassi deve ter 17 caracteres (sem I, O, Q).' : err?.campos.chassi} />
        </div>
        <Field label="Área de destino" error={err?.campos.areaId}>
          {(id) => (
            <Select id={id} required value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">Selecione…</option>
              {areas
                ?.filter((a) => a.ativa)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.ordemFluxo}. {a.nome}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Operador" error={err?.campos.operador}>
          {(id) => <Input id={id} required maxLength={80} value={operador} onChange={(e) => setOperador(e.target.value)} placeholder="Nome ou matrícula" />}
        </Field>
        <Field label="Observação" className="sm:col-span-2">
          {(id) => <Textarea id={id} maxLength={255} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />}
        </Field>
        <DataHora value={quando} onChange={setQuando} />
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button type="submit" variant="primary" loading={mut.isPending} disabled={chassiInvalido} icon={<Hand className="size-4" />}>
          Registrar apontamento
        </Button>
      </div>
    </form>
  )
}

function FormExpedicao({ chassiInicial, onOk }: { chassiInicial: string; onOk: (m: Movimentacao) => void }) {
  const mut = useExpedir()
  const [chassi, setChassi] = useState(chassiInicial)
  const [operador, setOperador] = useState(() => lerLocal('tracecar-operador'))
  const [quando, setQuando] = useState('')
  const chassiInvalido = chassi.length > 0 && !CHASSI_REGEX.test(chassi)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    mut.mutate(
      { chassi, data: { operador: operador || null, dataHora: localInputToIso(quando) } },
      {
        onSuccess: (m) => {
          onOk(m)
          toast.success('Veículo expedido.')
          setChassi('')
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <form onSubmit={enviar}>
      <CardHeader
        icon={<Truck className="size-4" />}
        title="Expedição"
        subtitle="Encerra o rastreamento: o veículo deixa o polo"
        actions={<Badge tom="warn">Somente a partir da última área</Badge>}
      />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CampoChassi value={chassi} onChange={setChassi} erro={chassiInvalido ? 'Chassi deve ter 17 caracteres (sem I, O, Q).' : undefined} />
        </div>
        <Field label="Operador">{(id) => <Input id={id} maxLength={80} value={operador} onChange={(e) => setOperador(e.target.value)} placeholder="Opcional" />}</Field>
        <DataHora value={quando} onChange={setQuando} />
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button type="submit" variant="primary" loading={mut.isPending} disabled={!chassi || chassiInvalido} icon={<Truck className="size-4" />}>
          Confirmar expedição
        </Button>
      </div>
    </form>
  )
}
