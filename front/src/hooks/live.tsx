import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { buildUrl } from '../api/client'
import { qk } from '../api/hooks'
import type { EventoMovimentacao } from '../api/types'

export type LiveStatus = 'conectando' | 'online' | 'offline'
export interface LiveEvento extends EventoMovimentacao {
  key: string
}

interface LiveCtx {
  status: LiveStatus
  eventos: LiveEvento[]
}

const Ctx = createContext<LiveCtx>({ status: 'conectando', eventos: [] })

const MAX_EVENTOS = 40

/**
 * Mantém uma única conexão SSE com /api/mapa/stream. A cada movimentação
 * guarda o evento para o feed e invalida (com debounce) as consultas afetadas.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('conectando')
  const [eventos, setEventos] = useState<LiveEvento[]>([])
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let es: EventSource | null = null
    let retry: number | undefined
    let tentativas = 0
    let fechado = false

    const invalidar = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        qc.invalidateQueries({ queryKey: qk.mapa })
        qc.invalidateQueries({ queryKey: qk.veiculos })
        qc.invalidateQueries({ queryKey: qk.movimentacoes })
        qc.invalidateQueries({ queryKey: qk.indicadores })
      }, 800)
    }

    const conectar = () => {
      if (fechado) return
      setStatus('conectando')
      es = new EventSource(buildUrl('/api/mapa/stream'))
      es.addEventListener('conectado', () => {
        tentativas = 0
        setStatus('online')
      })
      es.addEventListener('movimentacao', (e) => {
        try {
          const ev = JSON.parse((e as MessageEvent).data) as EventoMovimentacao
          setEventos((prev) => [{ ...ev, key: `${ev.chassi}-${ev.dataHora}-${Math.random()}` }, ...prev].slice(0, MAX_EVENTOS))
          invalidar()
        } catch {
          /* evento malformado */
        }
      })
      es.onerror = () => {
        es?.close()
        setStatus('offline')
        // backoff exponencial até 30s
        const espera = Math.min(30_000, 1000 * 2 ** tentativas++)
        retry = window.setTimeout(conectar, espera)
      }
    }

    conectar()
    return () => {
      fechado = true
      es?.close()
      window.clearTimeout(retry)
      window.clearTimeout(timer.current)
    }
  }, [qc])

  return <Ctx.Provider value={{ status, eventos }}>{children}</Ctx.Provider>
}

export const useLive = () => useContext(Ctx)
