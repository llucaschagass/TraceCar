import type { ProblemDetail } from './types'

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail | null

  constructor(status: number, problem: ProblemDetail | null, fallback: string) {
    super(problem?.detail ?? problem?.title ?? fallback)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  get campos(): Record<string, string> {
    return this.problem?.campos ?? {}
  }
}

type Params = Record<string, string | number | boolean | null | undefined>

export function buildUrl(path: string, params?: Params): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return `${API_BASE}${path}${q ? `?${q}` : ''}`
}

async function request<T>(method: string, path: string, opts: { params?: Params; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.params), {
      method,
      signal: opts.signal,
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, null, 'Não foi possível conectar à API. Verifique se o backend está rodando.')
  }

  if (!res.ok) {
    let problem: ProblemDetail | null = null
    try {
      problem = (await res.json()) as ProblemDetail
    } catch {
      /* corpo vazio */
    }
    throw new ApiError(res.status, problem, `Erro ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, params?: Params, signal?: AbortSignal) => request<T>('GET', path, { params, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
}
