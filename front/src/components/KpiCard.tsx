import type { ReactNode } from 'react'
import type { Tom } from '../lib/labels'
import { Card, Skeleton, cx } from './ui'

const ICON_BG: Record<Tom, string> = {
  neutral: 'bg-surface-2 text-muted',
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  crit: 'bg-crit-soft text-crit',
  info: 'bg-info-soft text-info',
}

export function KpiCard({ label, value, hint, icon, tom = 'brand', loading, className }: { className?: string; label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tom?: Tom; loading?: boolean }) {
  return (
    <Card className={cx('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={cx('grid size-9 place-items-center rounded-lg [&_svg]:size-[18px]', ICON_BG[tom])}>{icon}</span>
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 text-[28px] leading-tight font-bold tracking-tight tabular-nums">{value}</p>}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  )
}
