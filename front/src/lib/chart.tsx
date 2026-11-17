import { useEffect, useState } from 'react'

/**
 * Cores dos gráficos (paleta categórica de referência, slots 1–2, validada para
 * daltonismo em claro e escuro). Lidas em JS porque o Recharts aplica cores como
 * atributos SVG, onde var() não é confiável.
 */
const CLARO = {
  s1: '#2a78d6',
  s2: '#eb6834',
  grid: '#e6e9f0',
  axis: '#5d6784',
  track: '#eef1f6',
  surface: '#ffffff',
  crit: '#c8232a',
}
const ESCURO = {
  s1: '#3987e5',
  s2: '#d95926',
  grid: '#232d47',
  axis: '#94a0bd',
  track: '#1b2440',
  surface: '#121a2e',
  crit: '#ff6b70',
}
export type ChartColors = typeof CLARO

export function useChartColors(): ChartColors {
  const ler = () => (document.documentElement.classList.contains('dark') ? ESCURO : CLARO)
  const [c, setC] = useState(ler)
  useEffect(() => {
    const mo = new MutationObserver(() => setC(ler()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return c
}

/** Tooltip padrão: valores em tinta de texto, marca colorida ao lado para identidade. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: {
  active?: boolean
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string | number }[]
  label?: string | number
  formatLabel?: (l: string | number) => string
  formatValue?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1 font-semibold text-fg">{formatLabel ? formatLabel(label) : label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted">
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
          {p.name}
          <span className="ml-auto pl-4 font-semibold text-fg tabular-nums">
            {typeof p.value === 'number' && formatValue ? formatValue(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export function Legenda({ itens }: { itens: { cor: string; label: string; tracejado?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
      {itens.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.tracejado ? (
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.cor }} />
          ) : (
            <span className="size-2.5 rounded-sm" style={{ background: i.cor }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}
