import { useSyncExternalStore } from 'react'

type Tema = 'light' | 'dark'
const KEY = 'tracecar-theme'
const ouvintes = new Set<() => void>()

const atual = (): Tema => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

function definir(t: Tema) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* storage bloqueado */
  }
  ouvintes.forEach((f) => f())
}

/** Tema compartilhado por toda a aplicação (classe .dark no <html>). */
export function useTheme() {
  const tema = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb)
      return () => ouvintes.delete(cb)
    },
    atual,
  )
  return { tema, alternar: () => definir(tema === 'dark' ? 'light' : 'dark') }
}
