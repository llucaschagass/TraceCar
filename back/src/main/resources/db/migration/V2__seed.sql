-- =============================================================
-- Seed: areas, pontos de leitura, veiculos e historico de movimentacoes
-- O historico e gerado relativo a now() (ultimas 120h), de forma deterministica (setseed).
-- =============================================================

INSERT INTO area (codigo, nome, descricao, capacidade, ordem_fluxo, pos_x, pos_y) VALUES
('MONTAGEM',   'Montagem',          'Linha de montagem final',                         25, 1, 100, 100),
('INSPECAO',   'Inspeção',          'Inspeção de qualidade (Quality Gate)',            10, 2, 400, 100),
('TESTES',     'Testes',            'Pista de testes, rolagem e estanqueidade',        12, 3, 700, 100),
('RETRABALHO', 'Retrabalho',        'Correção de não conformidades',                     8, 4, 100, 300),
('LOGISTICA',  'Logística interna', 'Pátio de movimentação interna',                   30, 5, 400, 300),
('EXPEDICAO',  'Expedição',         'Pátio de expedição / carregamento de cegonhas',   50, 6, 700, 300);

INSERT INTO ponto_leitura (codigo, descricao, tipo, area_id)
SELECT a.prefixo || '-' || p.sufixo, p.descricao || ' - ' || ar.nome, p.tipo, ar.id
FROM area ar
JOIN (VALUES ('MONTAGEM','MON'), ('INSPECAO','INS'), ('TESTES','TES'),
             ('RETRABALHO','RET'), ('LOGISTICA','LOG'), ('EXPEDICAO','EXP')) AS a(codigo, prefixo)
  ON a.codigo = ar.codigo
CROSS JOIN (VALUES ('RFID-01', 'Portal RFID de entrada',  'RFID'),
                   ('OCR-01',  'Câmera OCR de chassi',    'CAMERA_OCR'),
                   ('MAN-01',  'Estação de apontamento manual', 'MANUAL')) AS p(sufixo, descricao, tipo);

DO $$
DECLARE
    modelos     TEXT[] := ARRAY['Strada', 'Argo', 'Mobi', 'Pulse', 'Fastback'];
    cod_modelo  TEXT[] := ARRAY['281', '358', '341', '363', '365'];
    versoes     TEXT[] := ARRAY[
                    'Endurance', 'Freedom', 'Volcano', 'Ranch',
                    'Drive', 'Trekking', 'Drive 1.0', 'Trekking 1.3',
                    'Like', 'Trekking', 'Like 1.0', 'Trekking 1.0',
                    'Drive', 'Audace', 'Impetus', 'Abarth',
                    'Audace', 'Impetus', 'Limited', 'Abarth'];
    cores       TEXT[] := ARRAY['Branco Banchisa', 'Preto Vulcano', 'Cinza Strato',
                                'Vermelho Montecarlo', 'Prata Bari', 'Azul Amalfi'];
    vin_chars   TEXT   := 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

    a_mon BIGINT; a_ins BIGINT; a_tes BIGINT; a_ret BIGINT; a_log BIGINT; a_exp BIGINT;

    fluxo   BIGINT[];
    dmin    INT[];
    dmax    INT[];
    i INT; k INT; m INT;
    v_id    BIGINT;
    v_chassi TEXT;
    t       TIMESTAMPTZ;
    prox    TIMESTAMPTZ;
    v_ponto BIGINT;
    v_metodo TEXT;
    v_oper  TEXT;
    v_tipo  TEXT;
    aberto  BOOLEAN;
BEGIN
    PERFORM setseed(0.42);

    SELECT id INTO a_mon FROM area WHERE codigo = 'MONTAGEM';
    SELECT id INTO a_ins FROM area WHERE codigo = 'INSPECAO';
    SELECT id INTO a_tes FROM area WHERE codigo = 'TESTES';
    SELECT id INTO a_ret FROM area WHERE codigo = 'RETRABALHO';
    SELECT id INTO a_log FROM area WHERE codigo = 'LOGISTICA';
    SELECT id INTO a_exp FROM area WHERE codigo = 'EXPEDICAO';

    FOR i IN 1..500 LOOP
        m := 1 + floor(random() * 5)::INT;

        -- VIN: WMI(3) + VDS(5) + digito(1) + ano(1, V=2027) + planta(1, B=Betim) + serie(6)
        v_chassi := '9BD' || cod_modelo[m]
                 || substr(vin_chars, 1 + floor(random() * 23)::INT, 1)
                 || substr(vin_chars, 1 + floor(random() * 23)::INT, 1)
                 || floor(random() * 10)::INT
                 || 'VB'
                 || lpad((200000 + i)::TEXT, 6, '0');

        INSERT INTO veiculo (chassi, tag_rfid, marca, modelo, versao, cor, ano_modelo)
        VALUES (v_chassi,
                'E2806894' || upper(lpad(to_hex(500000 + i), 8, '0')),
                'Fiat',
                modelos[m],
                versoes[(m - 1) * 4 + 1 + floor(random() * 4)::INT],
                cores[1 + floor(random() * 6)::INT],
                2027)
        RETURNING id INTO v_id;

        IF random() < 0.22 THEN
            fluxo := ARRAY[a_mon, a_ins, a_tes, a_ret, a_log, a_exp];
            dmin  := ARRAY[ 90, 20,  40,  60,  60, 120];
            dmax  := ARRAY[300, 80, 140, 300, 360, 720];
        ELSE
            fluxo := ARRAY[a_mon, a_ins, a_tes, a_log, a_exp];
            dmin  := ARRAY[ 90, 20,  40,  60, 120];
            dmax  := ARRAY[300, 80, 140, 360, 720];
        END IF;

        t := now() - random() * INTERVAL '120 hours';
        aberto := FALSE;

        FOR k IN 1..array_length(fluxo, 1) LOOP
            prox := t + make_interval(mins => dmin[k] + floor(random() * (dmax[k] - dmin[k]))::INT);

            IF random() < 0.9 THEN
                v_tipo := CASE WHEN random() < 0.7 THEN 'RFID' ELSE 'CAMERA_OCR' END;
                v_metodo := 'AUTOMATICA';
                v_oper := NULL;
            ELSE
                v_tipo := 'MANUAL';
                v_metodo := 'MANUAL';
                v_oper := 'Operador ' || lpad((1 + floor(random() * 12)::INT)::TEXT, 2, '0');
            END IF;

            SELECT id INTO v_ponto FROM ponto_leitura WHERE area_id = fluxo[k] AND tipo = v_tipo;

            IF prox > now() THEN
                INSERT INTO movimentacao (veiculo_id, area_id, ponto_leitura_id, metodo, entrada_em, saida_em, operador)
                VALUES (v_id, fluxo[k], v_ponto, v_metodo, t, NULL, v_oper);
                UPDATE veiculo SET area_atual_id = fluxo[k], ultima_movimentacao_em = t WHERE id = v_id;
                aberto := TRUE;
                EXIT;
            END IF;

            INSERT INTO movimentacao (veiculo_id, area_id, ponto_leitura_id, metodo, entrada_em, saida_em, operador)
            VALUES (v_id, fluxo[k], v_ponto, v_metodo, t, prox, v_oper);
            t := prox;
        END LOOP;

        IF NOT aberto THEN
            UPDATE veiculo
               SET status = 'EXPEDIDO', area_atual_id = NULL, ultima_movimentacao_em = t
             WHERE id = v_id;
        END IF;

        UPDATE veiculo
           SET criado_em = (SELECT min(entrada_em) FROM movimentacao WHERE veiculo_id = v_id)
         WHERE id = v_id;
    END LOOP;
END $$;
