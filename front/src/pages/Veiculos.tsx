import { Car, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '../api/client'
import { useAreas, useCriarVeiculo, useVeiculos } from '../api/hooks'
import type { StatusVeiculo, VeiculoRequest } from '../api/types'
import { Badge, Button, Card, CardHeader, Chassi, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, Select, Skeleton, Table, Th } from '../components/ui'
import { useDebounce } from '../hooks/useDebounce'
import { CHASSI_REGEX, fmtDuracao, fmtRelativo } from '../lib/format'
import { STATUS } from '../lib/labels'

const ANO_PADRAO = new Date().getFullYear() + 1
const MODELOS = ['Strada', 'Argo', 'Mobi', 'Pulse', 'Fastback']

export function Veiculos() {
  const { data: areas } = useAreas()
  const [chassi, setChassi] = useState('')
  const [modelo, setModelo] = useState('')
  const [areaId, setAreaId] = useState('')
  const [status, setStatus] = useState<StatusVeiculo | ''>('')
  const [page, setPage] = useState(0)
  const [novo, setNovo] = useState(false)
  const chassiD = useDebounce(chassi.trim().toUpperCase(), 350)

  const { data, isLoading, error, refetch } = useVeiculos({ chassi: chassiD, modelo, areaId: areaId ? Number(areaId) : null, status, page, size: 25 })
  const temFiltro = chassi || modelo || areaId || status
  const reset = (fn: (v: string) => void) => (v: string) => {
    fn(v)
    setPage(0)
  }

  return (
    <>
      <PageHeader
        title="Veículos"
        description="Todos os veículos rastreados no polo."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setNovo(true)}>
            Novo veículo
          </Button>
        }
      />
      <Card>
        <CardHeader
          icon={<Car className="size-4" />}
          title="Frota rastreada"
          actions={
            temFiltro && (
              <Button
                size="sm"
                variant="ghost"
                icon={<X className="size-3.5" />}
                onClick={() => {
                  setChassi('')
                  setModelo('')
                  setAreaId('')
                  setStatus('')
                  setPage(0)
                }}
              >
                Limpar
              </Button>
            )
          }
        />
        <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input aria-label="Chassi" placeholder="Chassi (trecho)" value={chassi} onChange={(e) => reset(setChassi)(e.target.value)} className="font-mono uppercase placeholder:font-sans placeholder:normal-case" />
          <Select aria-label="Modelo" value={modelo} onChange={(e) => reset(setModelo)(e.target.value)}>
            <option value="">Todos os modelos</option>
            {MODELOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          <Select aria-label="Área atual" value={areaId} onChange={(e) => reset(setAreaId)(e.target.value)}>
            <option value="">Qualquer área</option>
            {areas?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
          <Select aria-label="Status" value={status} onChange={(e) => reset((v) => setStatus(v as StatusVeiculo | ''))(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="EM_PRODUCAO">Em produção</option>
            <option value="EXPEDIDO">Expedido</option>
          </Select>
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
          <EmptyState title="Nenhum veículo encontrado" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Chassi</Th>
                  <Th>Modelo</Th>
                  <Th>Cor</Th>
                  <Th>Status</Th>
                  <Th>Área atual</Th>
                  <Th className="text-right">Na área há</Th>
                  <Th>Última leitura</Th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link to={`/consulta/${v.chassi}`} className="hover:underline">
                        <Chassi value={v.chassi} />
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">
                      {v.modelo} <span className="text-muted">{v.versao}</span>
                    </td>
                    <td className="whitespace-nowrap text-muted">{v.cor}</td>
                    <td>
                      <Badge tom={v.status === 'EXPEDIDO' ? 'ok' : 'brand'} dot>
                        {STATUS[v.status]}
                      </Badge>
                    </td>
                    <td className="font-medium whitespace-nowrap">{v.areaAtual?.nome ?? '—'}</td>
                    <td className="text-right tabular-nums">{fmtDuracao(v.minutosNaAreaAtual)}</td>
                    <td className="whitespace-nowrap text-muted">{fmtRelativo(v.ultimaMovimentacaoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.totalElements} onChange={setPage} />
          </>
        )}
      </Card>

      <NovoVeiculo open={novo} onClose={() => setNovo(false)} />
    </>
  )
}

function NovoVeiculo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: areas } = useAreas()
  const mut = useCriarVeiculo()
  const navigate = useNavigate()
  const vazio: VeiculoRequest = { chassi: '', tagRfid: '', marca: 'Fiat', modelo: 'Strada', versao: '', cor: '', anoModelo: ANO_PADRAO, areaInicialId: null, operador: '' }
  const [f, setF] = useState<VeiculoRequest>(vazio)
  const err = mut.error instanceof ApiError ? mut.error.campos : {}
  const chassiInvalido = f.chassi.length > 0 && !CHASSI_REGEX.test(f.chassi)
  const up = <K extends keyof VeiculoRequest>(k: K, v: VeiculoRequest[K]) => setF((x) => ({ ...x, [k]: v }))

  const fechar = () => {
    mut.reset()
    setF(vazio)
    onClose()
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const body: VeiculoRequest = {
      ...f,
      tagRfid: f.tagRfid || null,
      versao: f.versao || null,
      cor: f.cor || null,
      operador: f.operador || null,
    }
    mut.mutate(body, {
      onSuccess: (v) => {
        toast.success(`Veículo ${v.chassi} cadastrado.`)
        fechar()
        navigate(`/consulta/${v.chassi}`)
      },
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Novo veículo"
      width="max-w-2xl"
      footer={
        <>
          <Button onClick={fechar}>Cancelar</Button>
          <Button variant="primary" type="submit" form="form-veiculo" loading={mut.isPending} disabled={chassiInvalido}>
            Cadastrar
          </Button>
        </>
      }
    >
      <form id="form-veiculo" onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Chassi (VIN)" className="sm:col-span-2" error={chassiInvalido ? '17 caracteres alfanuméricos, sem I, O ou Q.' : err.chassi}>
          {(id) => <Input id={id} required maxLength={17} value={f.chassi} onChange={(e) => up('chassi', e.target.value.toUpperCase())} className="font-mono uppercase" aria-invalid={chassiInvalido} placeholder="9BD281A2XVB300001" />}
        </Field>
        <Field label="Marca" error={err.marca}>
          {(id) => <Input id={id} required value={f.marca} onChange={(e) => up('marca', e.target.value)} />}
        </Field>
        <Field label="Modelo" error={err.modelo}>
          {(id) => <Input id={id} required list="modelos" value={f.modelo} onChange={(e) => up('modelo', e.target.value)} />}
        </Field>
        <datalist id="modelos">
          {MODELOS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <Field label="Versão">{(id) => <Input id={id} value={f.versao ?? ''} onChange={(e) => up('versao', e.target.value)} />}</Field>
        <Field label="Cor">{(id) => <Input id={id} value={f.cor ?? ''} onChange={(e) => up('cor', e.target.value)} />}</Field>
        <Field label="Ano modelo" error={err.anoModelo}>
          {(id) => <Input id={id} type="number" min={1990} max={2100} value={f.anoModelo ?? ''} onChange={(e) => up('anoModelo', e.target.value ? Number(e.target.value) : null)} />}
        </Field>
        <Field label="Tag RFID" hint="Opcional" error={err.tagRfid}>
          {(id) => <Input id={id} value={f.tagRfid ?? ''} onChange={(e) => up('tagRfid', e.target.value.toUpperCase())} className="font-mono uppercase" />}
        </Field>
        <Field label="Área inicial" hint="Opcional — já registra a primeira movimentação">
          {(id) => (
            <Select id={id} value={f.areaInicialId ?? ''} onChange={(e) => up('areaInicialId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Não registrar agora</option>
              {areas
                ?.filter((a) => a.ativa)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Operador">{(id) => <Input id={id} value={f.operador ?? ''} onChange={(e) => up('operador', e.target.value)} placeholder="Opcional" />}</Field>
      </form>
    </Modal>
  )
}
