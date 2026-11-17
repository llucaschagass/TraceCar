import { Pencil, Plus, Warehouse } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ApiError } from '../api/client'
import { useAreas, useMapa, useSalvarArea } from '../api/hooks'
import type { Area, AreaRequest } from '../api/types'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Modal, PageHeader, ProgressBar, Skeleton, Table, Textarea, Th, Toggle } from '../components/ui'
import { tomPercentual } from '../lib/labels'

export function Areas() {
  const { data, isLoading, error, refetch } = useAreas()
  const { data: mapa } = useMapa(false)
  const [editando, setEditando] = useState<Area | 'nova' | null>(null)
  const ocup = new Map(mapa?.areas.map((a) => [a.id, a]))

  return (
    <>
      <PageHeader
        title="Áreas"
        description="Áreas físicas do giro industrial, sua capacidade e posição no fluxo."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditando('nova')}>
            Nova área
          </Button>
        }
      />
      <Card>
        <CardHeader icon={<Warehouse className="size-4" />} title="Áreas cadastradas" subtitle="A posição (X, Y) define o desenho do mapa conceitual" />
        {isLoading ? (
          <Skeleton className="m-5 h-64" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data?.length ? (
          <EmptyState title="Nenhuma área cadastrada" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Ordem</Th>
                <Th>Área</Th>
                <Th>Código</Th>
                <Th className="w-56">Ocupação</Th>
                <Th>Mapa (X, Y)</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.map((a) => {
                const o = ocup.get(a.id)
                return (
                  <tr key={a.id}>
                    <td className="font-semibold tabular-nums">{a.ordemFluxo}</td>
                    <td>
                      <p className="font-medium">{a.nome}</p>
                      {a.descricao && <p className="text-xs text-muted">{a.descricao}</p>}
                    </td>
                    <td className="font-mono text-xs">{a.codigo}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={o?.percentualOcupacao ?? 0} tom={tomPercentual(o?.percentualOcupacao ?? 0)} />
                        <span className="text-xs whitespace-nowrap text-muted tabular-nums">
                          {o?.ocupacao ?? 0}/{a.capacidade}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs text-muted tabular-nums">
                      {a.posX}, {a.posY}
                    </td>
                    <td>{a.ativa ? <Badge tom="ok" dot>Ativa</Badge> : <Badge>Inativa</Badge>}</td>
                    <td className="text-right">
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditando(a)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
      {editando && <FormArea area={editando === 'nova' ? null : editando} proximaOrdem={(data?.length ?? 0) + 1} onClose={() => setEditando(null)} />}
    </>
  )
}

function FormArea({ area, proximaOrdem, onClose }: { area: Area | null; proximaOrdem: number; onClose: () => void }) {
  const mut = useSalvarArea()
  const [f, setF] = useState<AreaRequest>(
    area ?? { codigo: '', nome: '', descricao: '', capacidade: 10, ordemFluxo: proximaOrdem, posX: 100, posY: 500, ativa: true },
  )
  const err = mut.error instanceof ApiError ? mut.error.campos : {}
  const up = <K extends keyof AreaRequest>(k: K, v: AreaRequest[K]) => setF((x) => ({ ...x, [k]: v }))

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    mut.mutate(
      { id: area?.id, data: { ...f, codigo: f.codigo.toUpperCase(), descricao: f.descricao || null } },
      {
        onSuccess: () => {
          toast.success(area ? 'Área atualizada.' : 'Área criada.')
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
      title={area ? `Editar ${area.nome}` : 'Nova área'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="form-area" loading={mut.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="form-area" onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" error={err.codigo} hint="Letras, números e _">
          {(id) => <Input id={id} required maxLength={30} pattern="[A-Za-z0-9_]+" value={f.codigo} onChange={(e) => up('codigo', e.target.value.toUpperCase())} className="font-mono uppercase" />}
        </Field>
        <Field label="Nome" error={err.nome}>
          {(id) => <Input id={id} required maxLength={80} value={f.nome} onChange={(e) => up('nome', e.target.value)} />}
        </Field>
        <Field label="Descrição" className="sm:col-span-2">
          {(id) => <Textarea id={id} maxLength={255} value={f.descricao ?? ''} onChange={(e) => up('descricao', e.target.value)} />}
        </Field>
        <Field label="Capacidade (veículos)" error={err.capacidade}>
          {(id) => <Input id={id} type="number" required min={1} value={f.capacidade} onChange={(e) => up('capacidade', Number(e.target.value))} />}
        </Field>
        <Field label="Ordem no fluxo" error={err.ordemFluxo}>
          {(id) => <Input id={id} type="number" required min={0} value={f.ordemFluxo} onChange={(e) => up('ordemFluxo', Number(e.target.value))} />}
        </Field>
        <Field label="Posição X no mapa" hint="Mesma X = mesma coluna">
          {(id) => <Input id={id} type="number" min={0} value={f.posX} onChange={(e) => up('posX', Number(e.target.value))} />}
        </Field>
        <Field label="Posição Y no mapa" hint="Mesma Y = mesma linha">
          {(id) => <Input id={id} type="number" min={0} value={f.posY} onChange={(e) => up('posY', Number(e.target.value))} />}
        </Field>
        <div className="sm:col-span-2">
          <Toggle checked={f.ativa} onChange={(v) => up('ativa', v)} label="Área ativa" />
        </div>
      </form>
    </Modal>
  )
}
