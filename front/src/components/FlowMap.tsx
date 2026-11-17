import { Clock, Users } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { MapaArea } from '../api/types'
import { useLive } from '../hooks/live'
import { fmtDuracao } from '../lib/format'
import { SITUACAO, tomSituacao } from '../lib/labels'
import { Badge, ProgressBar, cx, textoTom } from './ui'

interface Seta {
  d: string
}

/**
 * Mapa conceitual (sem escala) das áreas, posicionadas pela grade derivada de posX/posY
 * e ligadas por setas na ordem do fluxo produtivo — mesmo desenho do slide da demanda.
 */
export function FlowMap({ areas, selecionada, onSelect, compacto }: { areas: MapaArea[]; selecionada?: number | null; onSelect?: (id: number) => void; compacto?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const refs = useRef(new Map<number, HTMLElement>())
  const [setas, setSetas] = useState<Seta[]>([])
  const ultimo = useUltimoEvento()

  const { colunas, layout, ordenadas } = useMemo(() => {
    const xs = [...new Set(areas.map((a) => a.posX))].sort((a, b) => a - b)
    const ys = [...new Set(areas.map((a) => a.posY))].sort((a, b) => a - b)
    const layout = new Map(areas.map((a) => [a.id, { c: xs.indexOf(a.posX) + 1, r: ys.indexOf(a.posY) + 1 }]))
    return { colunas: xs.length, layout, ordenadas: [...areas].sort((a, b) => a.ordemFluxo - b.ordemFluxo) }
  }, [areas])

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const calcular = () => {
      const base = el.getBoundingClientRect()
      const rects = ordenadas.map((a) => refs.current.get(a.id)?.getBoundingClientRect())
      // em coluna única (mobile) não desenha setas
      if (rects.every((r) => r && Math.abs(r.left - rects[0]!.left) < 2)) return setSetas([])
      const out: Seta[] = []
      for (let i = 0; i < rects.length - 1; i++) {
        const a = rects[i]
        const b = rects[i + 1]
        if (!a || !b) continue
        const ax = a.left - base.left
        const ay = a.top - base.top
        const bx = b.left - base.left
        const by = b.top - base.top
        if (Math.abs(ay - by) < 4) {
          // mesma linha: horizontal
          const y = ay + a.height / 2
          const [x1, x2] = bx > ax ? [ax + a.width, bx] : [ax, bx + b.width]
          out.push({ d: `M${x1},${y} L${x2 + (bx > ax ? -6 : 6)},${y}` })
        } else {
          // muda de linha: desce pela área de origem e entra por cima do destino
          const x1 = ax + a.width / 2
          const y1 = ay + a.height
          const x2 = bx + b.width / 2
          const y2 = by
          const meio = y1 + (y2 - y1) / 2
          const r = 10
          const dir = x2 < x1 ? -1 : 1
          out.push({
            d: `M${x1},${y1} L${x1},${meio - r} Q${x1},${meio} ${x1 + dir * r},${meio} L${x2 - dir * r},${meio} Q${x2},${meio} ${x2},${meio + r} L${x2},${y2 - 6}`,
          })
        }
      }
      setSetas(out)
    }
    calcular()
    const ro = new ResizeObserver(calcular)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ordenadas])

  return (
    <div ref={wrap} className="relative">
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible text-brand/55" aria-hidden>
        <defs>
          <marker id="seta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
        {setas.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke="currentColor" strokeWidth={1.75} markerEnd="url(#seta)" />
        ))}
      </svg>

      <div
        className={cx('relative grid grid-cols-1 gap-4 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]', compacto ? 'md:gap-x-10 md:gap-y-10' : 'md:gap-x-12 md:gap-y-14')}
        style={{ '--cols': colunas } as CSSProperties}
      >
        {areas.map((a) => {
          const pos = layout.get(a.id)!
          const tom = tomSituacao(a.situacao)
          const ativa = selecionada === a.id
          return (
            <button
              key={a.id}
              ref={(el) => {
                if (el) refs.current.set(a.id, el)
                else refs.current.delete(a.id)
              }}
              onClick={() => onSelect?.(a.id)}
              style={{ '--c': pos.c, '--r': pos.r } as CSSProperties}
              className={cx(
                'group relative rounded-xl border bg-surface p-4 text-left transition-all md:[grid-column:var(--c)] md:[grid-row:var(--r)]',
                'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand',
                ativa ? 'border-brand ring-2 ring-brand/25' : 'border-line',
              )}
            >
              {ultimo?.areaDestino === a.codigo && <span key={ultimo.key} className="flash-in pointer-events-none absolute inset-0 rounded-xl" aria-hidden />}
              <span className={cx('absolute top-0 left-4 h-0.5 w-8 rounded-b', tom === 'crit' ? 'bg-crit' : tom === 'warn' ? 'bg-warn' : 'bg-ok')} />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Etapa {a.ordemFluxo}</p>
                <Badge tom={tom} dot>
                  {SITUACAO[a.situacao]}
                </Badge>
              </div>
              <p className="mt-1 leading-snug font-semibold">{a.nome}</p>

              <div className="mt-2 flex items-baseline gap-1">
                <span className={cx('text-3xl font-bold tabular-nums', textoTom(tom))}>{a.ocupacao}</span>
                <span className="text-sm text-muted tabular-nums" title={`${a.capacidade} vagas`}>
                  /{a.capacidade}
                </span>
                <span className="ml-auto text-sm font-semibold tabular-nums">{Math.round(a.percentualOcupacao)}%</span>
              </div>
              <ProgressBar value={a.percentualOcupacao} tom={tom} className="mt-2" />

              {!compacto && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap" title="Permanência média dos veículos na área agora">
                    <Clock className="size-3.5" /> {fmtDuracao(a.permanenciaMediaAtualMinutos)}
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Users className="size-3.5" /> {a.capacidade - a.ocupacao > 0 ? `${a.capacidade - a.ocupacao} livres` : 'lotada'}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Último evento ao vivo. O card da área de destino recebe um overlay com key = evento,
 * então a animação reinicia a cada nova chegada.
 */
function useUltimoEvento() {
  const { eventos } = useLive()
  const [montadoEm] = useState(() => Date.now())
  const ultimo = eventos[0]
  // não pisca eventos que já existiam antes do mapa ser montado
  return ultimo && new Date(ultimo.dataHora).getTime() >= montadoEm - 2000 ? ultimo : null
}
