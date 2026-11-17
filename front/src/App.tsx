import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { lazy } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ApiError } from './api/client'
import { AppLayout } from './components/layout/AppLayout'
import { Button, EmptyState } from './components/ui'
import { LiveProvider } from './hooks/live'
import { useTheme } from './hooks/useTheme'
import { Painel } from './pages/Painel'

// demais páginas carregadas sob demanda (code splitting)
const Consulta = lazy(() => import('./pages/Consulta').then((m) => ({ default: m.Consulta })))
const MapaPage = lazy(() => import('./pages/MapaPage').then((m) => ({ default: m.MapaPage })))
const Registrar = lazy(() => import('./pages/Registrar').then((m) => ({ default: m.Registrar })))
const Indicadores = lazy(() => import('./pages/Indicadores').then((m) => ({ default: m.Indicadores })))
const Movimentacoes = lazy(() => import('./pages/Movimentacoes').then((m) => ({ default: m.Movimentacoes })))
const Veiculos = lazy(() => import('./pages/Veiculos').then((m) => ({ default: m.Veiculos })))
const Areas = lazy(() => import('./pages/Areas').then((m) => ({ default: m.Areas })))
const Pontos = lazy(() => import('./pages/Pontos').then((m) => ({ default: m.Pontos })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: true,
      // não insiste em erros de cliente (4xx)
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
    },
  },
  queryCache: new QueryCache(),
})

function NaoEncontrada() {
  return (
    <EmptyState
      icon={<Compass className="size-5" />}
      title="Página não encontrada"
      description="O endereço acessado não existe."
      action={
        <Link to="/">
          <Button size="sm">Voltar ao painel</Button>
        </Link>
      }
    />
  )
}

function Toasts() {
  const { tema } = useTheme()
  return <Toaster position="top-right" richColors closeButton theme={tema} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LiveProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Painel />} />
              <Route path="mapa" element={<MapaPage />} />
              <Route path="consulta" element={<Consulta />} />
              <Route path="consulta/:chassi" element={<Consulta />} />
              <Route path="registrar" element={<Registrar />} />
              <Route path="indicadores" element={<Indicadores />} />
              <Route path="movimentacoes" element={<Movimentacoes />} />
              <Route path="veiculos" element={<Veiculos />} />
              <Route path="areas" element={<Areas />} />
              <Route path="pontos-leitura" element={<Pontos />} />
              <Route path="*" element={<NaoEncontrada />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toasts />
      </LiveProvider>
    </QueryClientProvider>
  )
}
