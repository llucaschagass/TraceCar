-- =============================================================
-- TraceCar - Rastreamento de veiculos no giro industrial
-- =============================================================

-- Areas fisicas do polo (Montagem, Inspecao, Testes, ...)
CREATE TABLE area (
    id           BIGSERIAL    PRIMARY KEY,
    codigo       VARCHAR(30)  NOT NULL UNIQUE,
    nome         VARCHAR(80)  NOT NULL,
    descricao    VARCHAR(255),
    capacidade   INTEGER      NOT NULL CHECK (capacidade > 0),
    ordem_fluxo  INTEGER      NOT NULL,
    pos_x        INTEGER      NOT NULL DEFAULT 0,   -- coordenadas do mapa conceitual (sem escala)
    pos_y        INTEGER      NOT NULL DEFAULT 0,
    ativa        BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Pontos de leitura: portais RFID, cameras OCR, leitores QR e estacoes manuais
CREATE TABLE ponto_leitura (
    id         BIGSERIAL    PRIMARY KEY,
    codigo     VARCHAR(40)  NOT NULL UNIQUE,
    descricao  VARCHAR(255),
    tipo       VARCHAR(20)  NOT NULL CHECK (tipo IN ('RFID', 'CAMERA_OCR', 'QR_CODE', 'MANUAL')),
    area_id    BIGINT       NOT NULL REFERENCES area (id),
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ponto_leitura_area ON ponto_leitura (area_id);

-- Veiculos identificados pelo chassi (VIN)
CREATE TABLE veiculo (
    id                      BIGSERIAL    PRIMARY KEY,
    chassi                  VARCHAR(17)  NOT NULL UNIQUE,
    tag_rfid                VARCHAR(40)  UNIQUE,
    marca                   VARCHAR(40)  NOT NULL,
    modelo                  VARCHAR(60)  NOT NULL,
    versao                  VARCHAR(60),
    cor                     VARCHAR(40),
    ano_modelo              INTEGER,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'EM_PRODUCAO'
                                         CHECK (status IN ('EM_PRODUCAO', 'EXPEDIDO')),
    area_atual_id           BIGINT       REFERENCES area (id),
    ultima_movimentacao_em  TIMESTAMPTZ,
    criado_em               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_veiculo_area_atual ON veiculo (area_atual_id);
CREATE INDEX idx_veiculo_status     ON veiculo (status);
CREATE INDEX idx_veiculo_modelo     ON veiculo (modelo);

-- Registro de movimentacoes: cada linha e a permanencia do veiculo em uma area
-- (entrada_em -> saida_em). saida_em nulo = veiculo ainda esta na area.
CREATE TABLE movimentacao (
    id                BIGSERIAL    PRIMARY KEY,
    veiculo_id        BIGINT       NOT NULL REFERENCES veiculo (id),
    area_id           BIGINT       NOT NULL REFERENCES area (id),
    ponto_leitura_id  BIGINT       REFERENCES ponto_leitura (id),
    metodo            VARCHAR(20)  NOT NULL CHECK (metodo IN ('AUTOMATICA', 'MANUAL')),
    entrada_em        TIMESTAMPTZ  NOT NULL,
    saida_em          TIMESTAMPTZ,
    operador          VARCHAR(80),
    observacao        VARCHAR(255),
    CONSTRAINT ck_movimentacao_periodo CHECK (saida_em IS NULL OR saida_em >= entrada_em)
);
CREATE INDEX idx_mov_veiculo_entrada ON movimentacao (veiculo_id, entrada_em DESC);
CREATE INDEX idx_mov_area_entrada    ON movimentacao (area_id, entrada_em);
CREATE INDEX idx_mov_saida           ON movimentacao (saida_em);
CREATE INDEX idx_mov_area_aberta     ON movimentacao (area_id) WHERE saida_em IS NULL;
-- Um veiculo so pode estar em uma area por vez
CREATE UNIQUE INDEX uq_mov_veiculo_aberta ON movimentacao (veiculo_id) WHERE saida_em IS NULL;
