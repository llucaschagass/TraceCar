# TraceCar API

API de rastreamento de veículos no giro industrial (SAGA SENAI × Stellantis).
Java 25 · Spring Boot 4.1 · PostgreSQL 17 · Flyway · springdoc (Swagger).

## Como rodar

```bash
# 1. Banco (porta 5433 no host; mude com DB_PORT=xxxx)
docker compose up -d

# 2. API (aplica schema + seed automaticamente via Flyway)
./mvnw spring-boot:run        # Windows: .\mvnw.cmd spring-boot:run
```

- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs

API também em container: `docker compose --profile app up -d --build`.

### Recriar o seed
O seed gera ~500 veículos com histórico das **últimas 120h relativas ao momento da migração**.
Para gerar dados "frescos":

```bash
docker compose down -v && docker compose up -d   # apaga o volume e recria o banco
```

## Modelo

| Tabela | Descrição |
|---|---|
| `area` | Montagem, Inspeção, Testes, Retrabalho, Logística interna, Expedição (capacidade, ordem no fluxo, posição no mapa) |
| `ponto_leitura` | Portal RFID, câmera OCR, leitor QR ou estação manual, vinculado a uma área |
| `veiculo` | Chassi (VIN), tag RFID, modelo, status (`EM_PRODUCAO`/`EXPEDIDO`) e área atual |
| `movimentacao` | Permanência do veículo numa área: `entrada_em` → `saida_em` (nulo = está lá agora) |

Regra central: uma leitura em área diferente da atual fecha a permanência anterior e abre uma nova.
Leituras repetidas na mesma área são ignoradas (RFID lê a mesma tag várias vezes).

## Rotas

| Método | Rota | Uso |
|---|---|---|
| POST | `/api/leituras` | Evento de identificação automática (ponto + chassi **ou** tag RFID) |
| POST | `/api/leituras/manual` | Apontamento manual por operador |
| GET | `/api/veiculos` | Lista com filtros (chassi, modelo, área, status) e paginação |
| GET | `/api/veiculos/busca?termo=` | Autocomplete por trecho do chassi |
| GET | `/api/veiculos/{chassi}` | Consulta por chassi (localização atual) |
| GET | `/api/veiculos/{chassi}/historico` | Linha do tempo de movimentações |
| POST | `/api/veiculos` | Cadastro (opcional: área inicial) |
| POST | `/api/veiculos/{chassi}/expedicao` | Saída do polo (só a partir da última área do fluxo) |
| GET | `/api/movimentacoes` | Registro de movimentações com filtros |
| GET | `/api/mapa` | Ocupação em tempo real por área |
| GET | `/api/mapa/areas/{id}` | Veículos numa área agora |
| GET | `/api/mapa/stream` | SSE — evento `movimentacao` a cada leitura |
| GET | `/api/indicadores/resumo` | KPIs gerais |
| GET | `/api/indicadores/fluxo` | Entradas/saídas, transições entre áreas, série por hora |
| GET | `/api/indicadores/permanencia` | Média, mín, máx, mediana e P90 por área |
| GET | `/api/indicadores/utilizacao` | Ocupação atual e média vs. capacidade |
| GET/POST/PUT | `/api/areas`, `/api/pontos-leitura` | Cadastros |

Indicadores aceitam `inicio` e `fim` (ISO-8601); padrão = últimas 24h.

### Exemplo: simular um portal RFID

```bash
curl -X POST localhost:8080/api/leituras -H "Content-Type: application/json" \
  -d '{"codigoPontoLeitura":"TES-RFID-01","identificador":"<chassi ou tag>"}'
```
