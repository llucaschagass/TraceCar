import {
  Activity,
  BarChart3,
  Car,
  LayoutDashboard,
  ListOrdered,
  Map as MapIcon,
  Menu,
  Moon,
  Radio,
  ScanLine,
  Search,
  Sun,
  Warehouse,
  X,
} from 'lucide-react'
import { Suspense, useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useLive } from '../../hooks/live'
import { useTheme } from '../../hooks/useTheme'
import { ChassiSearch } from '../ChassiSearch'
import { Spinner, cx } from '../ui'

const NAV: { grupo: string; itens: { to: string; label: string; icon: ReactNode; end?: boolean }[] }[] = [
  {
    grupo: 'Operação',
    itens: [
      { to: '/', label: 'Painel', icon: <LayoutDashboard />, end: true },
      { to: '/mapa', label: 'Mapa em tempo real', icon: <MapIcon /> },
      { to: '/consulta', label: 'Consulta por chassi', icon: <Search /> },
      { to: '/registrar', label: 'Registrar movimentação', icon: <ScanLine /> },
    ],
  },
  {
    grupo: 'Análise',
    itens: [
      { to: '/indicadores', label: 'Indicadores', icon: <BarChart3 /> },
      { to: '/movimentacoes', label: 'Movimentações', icon: <ListOrdered /> },
    ],
  },
  {
    grupo: 'Cadastros',
    itens: [
      { to: '/veiculos', label: 'Veículos', icon: <Car /> },
      { to: '/areas', label: 'Áreas', icon: <Warehouse /> },
      { to: '/pontos-leitura', label: 'Pontos de leitura', icon: <Radio /> },
    ],
  },
]

function Marca() {
  return (
    <div className="px-5 pt-5 pb-4">
      <span className="block h-1 w-9 rounded-full bg-accent" />
      <p className="mt-2 text-[11px] font-semibold tracking-wide text-white/60 uppercase">SAGA SENAI × Stellantis</p>
      <p className="mt-0.5 flex items-center gap-2 text-lg font-bold text-white">
        <Activity className="size-5 text-accent" /> TraceCar
      </p>
    </div>
  )
}

function Navegacao({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
      {NAV.map((g) => (
        <div key={g.grupo}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">{g.grupo}</p>
          <ul className="space-y-0.5">
            {g.itens.map((i) => (
              <li key={i.to}>
                <NavLink
                  to={i.to}
                  end={i.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-[18px]',
                      isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white',
                    )
                  }
                >
                  {i.icon}
                  {i.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function StatusLive() {
  const { status } = useLive()
  const cfg = {
    online: { cor: 'bg-ok', txt: 'Ao vivo' },
    conectando: { cor: 'bg-warn', txt: 'Conectando' },
    offline: { cor: 'bg-crit', txt: 'Offline' },
  }[status]
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted" title="Conexão de eventos em tempo real">
      <span className={cx('size-2 rounded-full', cfg.cor, status === 'online' && 'pulse-dot')} />
      <span className="hidden sm:inline">{cfg.txt}</span>
    </span>
  )
}

export function AppLayout() {
  const [menu, setMenu] = useState(false)
  const { tema, alternar } = useTheme()
  const sidebar = 'flex h-full flex-col bg-[#14204a] dark:bg-[#0d1530]'

  return (
    <div className="min-h-screen lg:pl-64">
      {/* sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <div className={sidebar}>
          <Marca />
          <Navegacao />
          <p className="px-5 py-4 text-[11px] text-white/35">Polo Automotivo de Betim</p>
        </div>
      </aside>

      {/* sidebar mobile */}
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <div className={sidebar}>
              <div className="flex items-start justify-between">
                <Marca />
                <button onClick={() => setMenu(false)} className="m-3 rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Fechar menu">
                  <X className="size-5" />
                </button>
              </div>
              <Navegacao onNavigate={() => setMenu(false)} />
            </div>
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-6">
        <button onClick={() => setMenu(true)} className="rounded-md p-2 text-muted hover:bg-surface-2 lg:hidden" aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
        <ChassiSearch className="w-full max-w-md" />
        <div className="ml-auto flex items-center gap-2">
          <StatusLive />
          <button onClick={alternar} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Alternar tema">
            {tema === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">
        <Suspense
          fallback={
            <div className="grid place-items-center py-24">
              <Spinner className="size-6" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
