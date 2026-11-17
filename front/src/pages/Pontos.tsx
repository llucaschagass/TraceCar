import { Camera, Hand, Pencil, Plus, QrCode, Radio } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ApiError } from '../api/client'
import { useAreas, usePontos, useSalvarPonto } from '../api/hooks'
import type { PontoLeitura, PontoLeituraRequest, TipoPontoLeitura } from '../api/types'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Table, Th, Toggle } from '../components/ui'
import { TIPO_PONTO } from '../lib/labels'

const ICONE: Record<TipoPontoLeitura, ReactNode> = {
  RFID: <Radio className="size-3.5" />,
  CAMERA_OCR: <Camera className="size-3.5" />,
  QR_CODE: <QrCode className="size-3.5" />,
  MANUAL: <Hand className="size-3.5" />,
}

export function Pontos() {
  const { data, isLoading, error, refetch } = usePontos()
  const { data: areas } = useAreas()
  const [areaId, setAreaId] = useState('')
  const [editando, setEditando] = useState<PontoLeitura | 'novo' | null>(null)
  const lista = data?.filter((p) => !areaId || p.area.id === Number(areaId)) ?? []

  return (
    <>
      <PageHeader
        title="Pontos de leitura"
        description="Dispositivos de identificação automática e estações de apontamento manual."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditando('novo')}>
            Novo ponto
          </Button>
        }
      />
      <Card>
        <CardHeader
          icon={<Radio className="size-4" />}
          title="Dispositivos"
          subtitle={data ? `${data.filter((p) => p.ativo).length} ativos de ${data.length}` : undefined}
          actions={
            <Select aria-label="Filtrar por área" value={areaId} onChange={(e) => setAreaId(e.target.value)} className="h-9 w-48">
              <option value="">Todas as áreas</option>
              {areas?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
          }
        />
        {isLoading ? (
          <Skeleton className="m-5 h-64" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !lista.length ? (
          <EmptyState title="Nenhum ponto de leitura" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Tipo</Th>
                <Th>Área</Th>
                <Th>Descrição</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-semibold">{p.codigo}</td>
                  <td>
                    <Badge tom={p.tipo === 'MANUAL' ? 'warn' : 'info'}>
                      {ICONE[p.tipo]}
                      {TIPO_PONTO[p.tipo]}
                    </Badge>
                  </td>
                  <td className="font-medium">{p.area.nome}</td>
                  <td className="text-muted">{p.descricao}</td>
                  <td>{p.ativo ? <Badge tom="ok" dot>Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditando(p)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {editando && <FormPonto ponto={editando === 'novo' ? null : editando} onClose={() => setEditando(null)} />}
    </>
  )
}

function FormPonto({ ponto, onClose }: { ponto: PontoLeitura | null; onClose: () => void }) {
  const { data: areas } = useAreas()
  const mut = useSalvarPonto()
  const [f, setF] = useState<PontoLeituraRequest>(
    ponto ? { codigo: ponto.codigo, descricao: ponto.descricao, tipo: ponto.tipo, areaId: ponto.area.id, ativo: ponto.ativo } : { codigo: '', descricao: '', tipo: 'RFID', areaId: 0, ativo: true },
  )
  const err = mut.error instanceof ApiError ? mut.error.campos : {}
  const up = <K extends keyof PontoLeituraRequest>(k: K, v: PontoLeituraRequest[K]) => setF((x) => ({ ...x, [k]: v }))

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    mut.mutate(
      { id: ponto?.id, data: { ...f, codigo: f.codigo.toUpperCase(), descricao: f.descricao || null } },
      {
        onSuccess: () => {
          toast.success(ponto ? 'Ponto atualizado.' : 'Ponto criado.')
          onClose()
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={ponto ? `Editar ${ponto.codigo}` : 'Novo ponto de leitura'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="form-ponto" loading={mut.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="form-ponto" onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" error={err.codigo}>
          {(id) => <Input id={id} required maxLength={40} value={f.codigo} onChange={(e) => up('codigo', e.target.value.toUpperCase())} className="font-mono uppercase" placeholder="TES-RFID-02" />}
        </Field>
        <Field label="Tipo" error={err.tipo}>
          {(id) => (
            <Select id={id} value={f.tipo} onChange={(e) => up('tipo', e.target.value as TipoPontoLeitura)}>
              {(Object.keys(TIPO_PONTO) as TipoPontoLeitura[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_PONTO[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Área" className="sm:col-span-2" error={err.areaId}>
          {(id) => (
            <Select id={id} required value={f.areaId || ''} onChange={(e) => up('areaId', Number(e.target.value))}>
              <option value="">Selecione…</option>
              {areas?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Descrição" className="sm:col-span-2">
          {(id) => <Input id={id} maxLength={255} value={f.descricao ?? ''} onChange={(e) => up('descricao', e.target.value)} />}
        </Field>
        <div className="sm:col-span-2">
          <Toggle checked={f.ativo} onChange={(v) => up('ativo', v)} label="Ponto ativo" />
        </div>
      </form>
    </Modal>
  )
}
