import type { MetodoIdentificacao, SituacaoOcupacao, StatusVeiculo, TipoPontoLeitura } from '../api/types'

export const TIPO_PONTO: Record<TipoPontoLeitura, string> = {
  RFID: 'Portal RFID',
  CAMERA_OCR: 'Câmera OCR',
  QR_CODE: 'Leitor QR',
  MANUAL: 'Estação manual',
}

export const METODO: Record<MetodoIdentificacao, string> = {
  AUTOMATICA: 'Automática',
  MANUAL: 'Manual',
}

export const STATUS: Record<StatusVeiculo, string> = {
  EM_PRODUCAO: 'Em produção',
  EXPEDIDO: 'Expedido',
}

export const SITUACAO: Record<SituacaoOcupacao, string> = {
  NORMAL: 'Normal',
  ATENCAO: 'Atenção',
  CRITICA: 'Crítica',
}

export type Tom = 'neutral' | 'brand' | 'ok' | 'warn' | 'crit' | 'info'

export const tomSituacao = (s: SituacaoOcupacao): Tom => (s === 'CRITICA' ? 'crit' : s === 'ATENCAO' ? 'warn' : 'ok')

export const tomPercentual = (p: number): Tom => (p >= 90 ? 'crit' : p >= 70 ? 'warn' : 'ok')
