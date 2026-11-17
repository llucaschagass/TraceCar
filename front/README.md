# TraceCar — Front

Painel web do rastreamento de veículos no giro industrial (SAGA SENAI × Stellantis).
React 19 · TypeScript · Vite · Tailwind CSS 4 · TanStack Query · React Router · Recharts.

## Rodar

Com a API rodando em `http://localhost:8080` (ver `../back/README.md`):

```bash
npm install
npm run dev        # http://localhost:5173
```

O Vite faz proxy de `/api` para a API, então não há problema de CORS em desenvolvimento.
Para apontar para outra API: `VITE_API_PROXY=http://host:porta npm run dev`.
Em produção (build estático servido fora do Vite), defina `VITE_API_URL` no build:

```bash
VITE_API_URL=https://api.exemplo.com npm run build   # gera dist/
```

## Telas

| Rota | Tela |
|---|---|
| `/` | **Painel**: KPIs, mapa conceitual das áreas com ocupação, últimas leituras e veículos parados há mais tempo |
| `/mapa` | **Mapa em tempo real**: ocupação por área e lista de veículos presentes (filtro por chassi/modelo) |
| `/consulta/:chassi` | **Consulta por chassi**: localização atual, percurso no fluxo e linha do tempo das movimentações |
| `/registrar` | **Registrar**: simulador de leitura automática (RFID/OCR), apontamento manual e expedição |
| `/indicadores` | **Indicadores**: fluxo por hora, entradas/saídas por área, transições, permanência (mediana/P90) e utilização |
| `/movimentacoes` | Registro de movimentações com filtros, paginação e exportação CSV |
| `/veiculos`, `/areas`, `/pontos-leitura` | Cadastros |

## Destaques

- **Tempo real**: uma conexão SSE (`/api/mapa/stream`) invalida as consultas a cada movimentação; o feed e os cards do mapa piscam quando algo chega. Reconexão automática com backoff.
- **Busca global por chassi** no topo (atalho `/`), aceita o VIN completo ou os últimos dígitos.
- **Tema claro/escuro** (segue o sistema, com alternância manual).
- Responsivo (sidebar vira menu no mobile), estados de carregamento/erro/vazio em todas as telas, erros da API (Problem Details) exibidos nos campos e em toasts.
- Gráficos com paleta validada para daltonismo e alternância gráfico ↔ tabela.
- Páginas carregadas sob demanda (code splitting).

## Estrutura

```
src/
  api/          client.ts (fetch + ApiError), types.ts (DTOs), hooks.ts (TanStack Query)
  components/   ui.tsx (design system), FlowMap, ChassiSearch, Timeline, RecentFeed, ...
  hooks/        live.tsx (SSE), useTheme, useDebounce
  lib/          formatação, rótulos, cores dos gráficos
  pages/        uma por rota
```
