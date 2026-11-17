const dataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const horaSeg = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const num = new Intl.NumberFormat('pt-BR')
const dec1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const rel = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export const fmtDataHora = (iso: string | null | undefined) => (iso ? dataHora.format(new Date(iso)) : '—')
export const fmtHora = (iso: string | null | undefined) => (iso ? hora.format(new Date(iso)) : '—')
export const fmtHoraSeg = (iso: string | null | undefined) => (iso ? horaSeg.format(new Date(iso)) : '—')
export const fmtNum = (n: number | null | undefined) => (n == null ? '—' : num.format(n))
export const fmtDec = (n: number | null | undefined) => (n == null ? '—' : dec1.format(n))
export const fmtPct = (n: number | null | undefined) => (n == null ? '—' : `${dec1.format(n)}%`)

/** 75 -> "1h 15min", 1500 -> "1d 1h" */
export function fmtDuracao(min: number | null | undefined): string {
  if (min == null) return '—'
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m}min`
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const r = m % 60
  if (d > 0) return h ? `${d}d ${h}h` : `${d}d`
  return r ? `${h}h ${r}min` : `${h}h`
}

export function fmtRelativo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diffS = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(diffS)
  if (abs < 45) return 'agora'
  if (abs < 3600) return rel.format(Math.round(diffS / 60), 'minute')
  if (abs < 86400) return rel.format(Math.round(diffS / 3600), 'hour')
  return rel.format(Math.round(diffS / 86400), 'day')
}

/** Destaca a parte final do chassi (número de série), que é o que se usa no chão de fábrica. */
export function splitChassi(chassi: string): [string, string] {
  return [chassi.slice(0, 11), chassi.slice(11)]
}

export const CHASSI_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i

/** Converte valor de <input type="datetime-local"> para ISO com fuso. */
export function localInputToIso(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
