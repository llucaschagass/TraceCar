export function lerLocal(chave: string, padrao = ''): string {
  try {
    return localStorage.getItem(chave) ?? padrao
  } catch {
    return padrao
  }
}

export function gravarLocal(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    /* storage bloqueado */
  }
}
