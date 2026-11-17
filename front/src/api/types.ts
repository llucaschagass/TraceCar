// Espelha os DTOs da TraceCar API (back/src/main/java/br/com/tracecar/web/dto)

export type StatusVeiculo = 'EM_PRODUCAO' | 'EXPEDIDO'
export type MetodoIdentificacao = 'AUTOMATICA' | 'MANUAL'
export type TipoPontoLeitura = 'RFID' | 'CAMERA_OCR' | 'QR_CODE' | 'MANUAL'
export type SituacaoOcupacao = 'NORMAL' | 'ATENCAO' | 'CRITICA'

export interface AreaResumo {
  id: number
  codigo: string
  nome: string
}

export interface Area {
  id: number
  codigo: string
  nome: string
  descricao: string | null
  capacidade: number
  ordemFluxo: number
  posX: number
  posY: number
  ativa: boolean
}
export type AreaRequest = Omit<Area, 'id'>

export interface PontoLeitura {
  id: number
  codigo: string
  descricao: string | null
  tipo: TipoPontoLeitura
  area: AreaResumo
  ativo: boolean
}
export interface PontoLeituraRequest {
  codigo: string
  descricao?: string | null
  tipo: TipoPontoLeitura
  areaId: number
  ativo: boolean
}

export interface Veiculo {
  id: number
  chassi: string
  tagRfid: string | null
  marca: string
  modelo: string
  versao: string | null
  cor: string | null
  anoModelo: number | null
  status: StatusVeiculo
  areaAtual: AreaResumo | null
  ultimaMovimentacaoEm: string | null
  minutosNaAreaAtual: number | null
}
export interface VeiculoRequest {
  chassi: string
  tagRfid?: string | null
  marca: string
  modelo: string
  versao?: string | null
  cor?: string | null
  anoModelo?: number | null
  areaInicialId?: number | null
  operador?: string | null
}

export interface Movimentacao {
  id: number
  chassi: string
  modelo: string
  area: AreaResumo
  pontoLeitura: string | null
  tipoPontoLeitura: TipoPontoLeitura | null
  metodo: MetodoIdentificacao
  entradaEm: string
  saidaEm: string | null
  duracaoMinutos: number
  emAndamento: boolean
  operador: string | null
  observacao: string | null
}

export interface HistoricoVeiculo {
  veiculo: Veiculo
  movimentacoes: Movimentacao[]
  tempoTotalMinutos: number | null
  quantidadeAreas: number
  leiturasAutomaticas: number
  leiturasManuais: number
}

export interface LeituraRequest {
  codigoPontoLeitura: string
  identificador: string
  dataHora?: string | null
}
export interface MovimentacaoManualRequest {
  chassi: string
  areaId: number
  operador: string
  observacao?: string | null
  dataHora?: string | null
}
export interface ExpedicaoRequest {
  operador?: string | null
  dataHora?: string | null
}
export interface LeituraResponse {
  novaMovimentacao: boolean
  mensagem: string
  movimentacao: Movimentacao
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface VeiculoNaArea {
  chassi: string
  modelo: string
  versao: string | null
  cor: string | null
  desde: string
  minutosNaArea: number
}
export interface MapaArea {
  id: number
  codigo: string
  nome: string
  ordemFluxo: number
  posX: number
  posY: number
  capacidade: number
  ocupacao: number
  percentualOcupacao: number
  situacao: SituacaoOcupacao
  permanenciaMediaAtualMinutos: number | null
  veiculos: VeiculoNaArea[] | null
}
export interface Mapa {
  geradoEm: string
  totalEmCirculacao: number
  areas: MapaArea[]
}

export interface EventoMovimentacao {
  tipo: 'MOVIMENTACAO' | 'EXPEDICAO'
  chassi: string
  modelo: string
  areaOrigem: string | null
  areaDestino: string | null
  metodo: MetodoIdentificacao
  dataHora: string
}

export interface Resumo {
  inicio: string
  fim: string
  totalVeiculos: number
  emCirculacao: number
  expedidosNoPeriodo: number
  movimentacoesNoPeriodo: number
  percentualIdentificacaoAutomatica: number
  tempoMedioCicloMinutos: number | null
  maioresPermanenciasAtuais: {
    chassi: string
    modelo: string
    area: string
    desde: string
    minutos: number
  }[]
}

export interface IndicadorFluxo {
  inicio: string
  fim: string
  porArea: { areaId: number; codigo: string; nome: string; entradas: number; saidas: number; vazaoPorHora: number }[]
  transicoes: { origem: string; origemNome: string; destino: string; destinoNome: string; quantidade: number }[]
  porHora: { hora: string; entradas: number; saidas: number }[]
}

export interface IndicadorPermanencia {
  inicio: string
  fim: string
  areas: {
    areaId: number
    codigo: string
    nome: string
    passagens: number
    mediaMinutos: number | null
    minimoMinutos: number | null
    maximoMinutos: number | null
    medianaMinutos: number | null
    p90Minutos: number | null
    mediaAtualMinutos: number | null
  }[]
}

export interface IndicadorUtilizacao {
  inicio: string
  fim: string
  areas: {
    areaId: number
    codigo: string
    nome: string
    capacidade: number
    ocupacaoAtual: number
    percentualAtual: number
    ocupacaoMedia: number
    percentualMedio: number
  }[]
}

export interface ProblemDetail {
  title?: string
  detail?: string
  status?: number
  campos?: Record<string, string>
}
