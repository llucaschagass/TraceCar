import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  Area,
  AreaRequest,
  ExpedicaoRequest,
  HistoricoVeiculo,
  IndicadorFluxo,
  IndicadorPermanencia,
  IndicadorUtilizacao,
  LeituraRequest,
  LeituraResponse,
  Mapa,
  MapaArea,
  MetodoIdentificacao,
  Movimentacao,
  MovimentacaoManualRequest,
  Page,
  PontoLeitura,
  PontoLeituraRequest,
  Resumo,
  StatusVeiculo,
  Veiculo,
  VeiculoRequest,
} from './types'

export const qk = {
  mapa: ['mapa'] as const,
  mapaArea: (id: number) => ['mapa', 'area', id] as const,
  areas: ['areas'] as const,
  pontos: ['pontos'] as const,
  veiculos: ['veiculos'] as const,
  movimentacoes: ['movimentacoes'] as const,
  indicadores: ['indicadores'] as const,
}

/** Período relativo usado nos indicadores. As chaves geram ISO na hora da consulta. */
export type PeriodoKey = '8h' | '24h' | '72h' | '7d' | '30d'
export const PERIODOS: { key: PeriodoKey; label: string; horas: number }[] = [
  { key: '8h', label: 'Turno (8h)', horas: 8 },
  { key: '24h', label: '24 horas', horas: 24 },
  { key: '72h', label: '3 dias', horas: 72 },
  { key: '7d', label: '7 dias', horas: 168 },
  { key: '30d', label: '30 dias', horas: 720 },
]
function periodoParams(p: PeriodoKey) {
  const horas = PERIODOS.find((x) => x.key === p)!.horas
  const fim = new Date()
  const inicio = new Date(fim.getTime() - horas * 3_600_000)
  return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

// ------------------------------------------------------------- mapa

export const useMapa = (incluirVeiculos = true) =>
  useQuery({
    queryKey: [...qk.mapa, incluirVeiculos],
    queryFn: ({ signal }) => api.get<Mapa>('/api/mapa', { incluirVeiculos }, signal),
    refetchInterval: 30_000,
  })

export const useMapaArea = (id: number | null) =>
  useQuery({
    queryKey: qk.mapaArea(id ?? 0),
    queryFn: ({ signal }) => api.get<MapaArea>(`/api/mapa/areas/${id}`, undefined, signal),
    enabled: id != null,
  })

// ---------------------------------------------------------- veículos

export interface FiltroVeiculos {
  chassi?: string
  modelo?: string
  areaId?: number | null
  status?: StatusVeiculo | ''
  page?: number
  size?: number
  sort?: string
}
export const useVeiculos = (f: FiltroVeiculos) =>
  useQuery({
    queryKey: [...qk.veiculos, 'lista', f],
    queryFn: ({ signal }) => api.get<Page<Veiculo>>('/api/veiculos', { ...f }, signal),
    placeholderData: keepPreviousData,
  })

export const useBuscaChassi = (termo: string) =>
  useQuery({
    queryKey: [...qk.veiculos, 'busca', termo],
    queryFn: ({ signal }) => api.get<Veiculo[]>('/api/veiculos/busca', { termo, limite: 8 }, signal),
    enabled: termo.trim().length >= 3,
    staleTime: 10_000,
  })

export const useHistorico = (chassi: string | undefined) =>
  useQuery({
    queryKey: [...qk.veiculos, 'historico', chassi],
    queryFn: ({ signal }) => api.get<HistoricoVeiculo>(`/api/veiculos/${encodeURIComponent(chassi!)}/historico`, undefined, signal),
    enabled: !!chassi,
    retry: (n, e) => (e as { status?: number }).status !== 404 && n < 2,
  })

// ----------------------------------------------------- movimentações

export interface FiltroMovimentacoes {
  chassi?: string
  areaId?: number | null
  metodo?: MetodoIdentificacao | ''
  inicio?: string
  fim?: string
  emAndamento?: boolean
  page?: number
  size?: number
}
export const useMovimentacoes = (f: FiltroMovimentacoes) =>
  useQuery({
    queryKey: [...qk.movimentacoes, f],
    queryFn: ({ signal }) => api.get<Page<Movimentacao>>('/api/movimentacoes', { ...f }, signal),
    placeholderData: keepPreviousData,
  })

// -------------------------------------------------------- indicadores

export const useResumo = (p: PeriodoKey) =>
  useQuery({
    queryKey: [...qk.indicadores, 'resumo', p],
    queryFn: ({ signal }) => api.get<Resumo>('/api/indicadores/resumo', periodoParams(p), signal),
    refetchInterval: 60_000,
  })
export const useFluxo = (p: PeriodoKey) =>
  useQuery({
    queryKey: [...qk.indicadores, 'fluxo', p],
    queryFn: ({ signal }) => api.get<IndicadorFluxo>('/api/indicadores/fluxo', periodoParams(p), signal),
  })
export const usePermanencia = (p: PeriodoKey) =>
  useQuery({
    queryKey: [...qk.indicadores, 'permanencia', p],
    queryFn: ({ signal }) => api.get<IndicadorPermanencia>('/api/indicadores/permanencia', periodoParams(p), signal),
  })
export const useUtilizacao = (p: PeriodoKey) =>
  useQuery({
    queryKey: [...qk.indicadores, 'utilizacao', p],
    queryFn: ({ signal }) => api.get<IndicadorUtilizacao>('/api/indicadores/utilizacao', periodoParams(p), signal),
  })

// ------------------------------------------------------ cadastros

export const useAreas = () =>
  useQuery({
    queryKey: qk.areas,
    queryFn: ({ signal }) => api.get<Area[]>('/api/areas', undefined, signal),
    staleTime: 60_000,
  })

export const usePontos = () =>
  useQuery({
    queryKey: qk.pontos,
    queryFn: ({ signal }) => api.get<PontoLeitura[]>('/api/pontos-leitura', undefined, signal),
    staleTime: 60_000,
  })

function useInvalidateAll() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: qk.mapa })
    qc.invalidateQueries({ queryKey: qk.veiculos })
    qc.invalidateQueries({ queryKey: qk.movimentacoes })
    qc.invalidateQueries({ queryKey: qk.indicadores })
  }
}

export const useSalvarArea = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: AreaRequest }) =>
      id ? api.put<Area>(`/api/areas/${id}`, data) : api.post<Area>('/api/areas', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.areas })
      qc.invalidateQueries({ queryKey: qk.mapa })
    },
  })
}

export const useSalvarPonto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: PontoLeituraRequest }) =>
      id ? api.put<PontoLeitura>(`/api/pontos-leitura/${id}`, data) : api.post<PontoLeitura>('/api/pontos-leitura', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.pontos }),
  })
}

export const useCriarVeiculo = () => {
  const inv = useInvalidateAll()
  return useMutation({
    mutationFn: (data: VeiculoRequest) => api.post<Veiculo>('/api/veiculos', data),
    onSuccess: inv,
  })
}

export const useRegistrarLeitura = () => {
  const inv = useInvalidateAll()
  return useMutation({
    mutationFn: (data: LeituraRequest) => api.post<LeituraResponse>('/api/leituras', data),
    onSuccess: inv,
  })
}

export const useRegistrarManual = () => {
  const inv = useInvalidateAll()
  return useMutation({
    mutationFn: (data: MovimentacaoManualRequest) => api.post<LeituraResponse>('/api/leituras/manual', data),
    onSuccess: inv,
  })
}

export const useExpedir = () => {
  const inv = useInvalidateAll()
  return useMutation({
    mutationFn: ({ chassi, data }: { chassi: string; data: ExpedicaoRequest }) =>
      api.post<Movimentacao>(`/api/veiculos/${encodeURIComponent(chassi)}/expedicao`, data),
    onSuccess: inv,
  })
}
