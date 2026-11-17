import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuscaChassi } from '../api/hooks'
import { useDebounce } from '../hooks/useDebounce'
import { CHASSI_REGEX, fmtRelativo } from '../lib/format'
import { Badge, Chassi, Spinner, cx } from './ui'

/**
 * Busca de chassi com autocomplete. Aceita o VIN completo ou um trecho
 * (ex.: os últimos 6 dígitos usados no chão de fábrica).
 */
export function ChassiSearch({ size = 'md', autoFocus, onSelect, className }: { size?: 'md' | 'lg'; autoFocus?: boolean; onSelect?: (chassi: string) => void; className?: string }) {
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const debounced = useDebounce(termo.trim().toUpperCase(), 250)
  const { data, isFetching } = useBuscaChassi(debounced)
  const navigate = useNavigate()
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const resultados = debounced.length >= 3 ? (data ?? []) : []

  useEffect(() => {
    const fora = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setAberto(false)
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  // atalho "/" foca a busca
  useEffect(() => {
    if (size !== 'md') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [size])

  const escolher = (chassi: string) => {
    setAberto(false)
    setTermo('')
    input.current?.blur()
    if (onSelect) onSelect(chassi)
    else navigate(`/consulta/${chassi}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAberto(true)
      setAtivo((a) => Math.min(a + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const t = termo.trim().toUpperCase()
      if (resultados[ativo]) escolher(resultados[ativo].chassi)
      else if (CHASSI_REGEX.test(t)) escolher(t)
    } else if (e.key === 'Escape') {
      setAberto(false)
      input.current?.blur()
    }
  }

  const lg = size === 'lg'
  return (
    <div ref={box} className={cx('relative', className)}>
      <Search className={cx('pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted', lg ? 'left-4 size-5' : 'left-3 size-4')} />
      <input
        ref={input}
        autoFocus={autoFocus}
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value)
          setAtivo(0)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={onKeyDown}
        placeholder={lg ? 'Digite o chassi completo ou os últimos dígitos' : 'Buscar chassi…'}
        spellCheck={false}
        autoComplete="off"
        role="combobox"
        aria-expanded={aberto && resultados.length > 0}
        aria-label="Buscar veículo por chassi"
        className={cx(
          'w-full rounded-xl border border-line bg-surface font-mono uppercase placeholder:font-sans placeholder:normal-case focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none',
          lg ? 'h-14 pr-12 pl-12 text-lg' : 'h-10 pr-10 pl-9 text-sm',
        )}
      />
      <span className="absolute top-1/2 right-3 -translate-y-1/2">
        {isFetching ? <Spinner className="size-4" /> : !lg && <kbd className="hidden rounded border border-line px-1.5 text-[11px] text-muted sm:inline">/</kbd>}
      </span>

      {aberto && debounced.length >= 3 && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          {resultados.length === 0 && !isFetching ? (
            <p className="px-4 py-3 text-sm text-muted">Nenhum veículo encontrado para “{debounced}”.</p>
          ) : (
            <ul role="listbox">
              {resultados.map((v, i) => (
                <li key={v.id} role="option" aria-selected={i === ativo}>
                  <button
                    onMouseEnter={() => setAtivo(i)}
                    onClick={() => escolher(v.chassi)}
                    className={cx('flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left', i === ativo && 'bg-surface-2')}
                  >
                    <span className="min-w-0">
                      <Chassi value={v.chassi} />
                      <span className="block truncate text-xs text-muted">
                        {v.modelo} {v.versao} · {v.cor}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      {v.areaAtual ? <Badge tom="brand">{v.areaAtual.nome}</Badge> : <Badge>Expedido</Badge>}
                      <span className="text-[11px] text-muted">{fmtRelativo(v.ultimaMovimentacaoEm)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
