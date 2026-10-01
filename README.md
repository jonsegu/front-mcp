# documentation-web

Aplicación full-stack con Next.js para chatear con documentación técnica usando un servidor MCP externo y un LLM (Gemini en Vertex AI).

## Arquitectura

```
Browser
   |
   v
documentation-web
   |
   +--> Gemini / Vertex AI
   |
   +--> documentation-mcp
              |
              v
             GCS
```

Flujo:

1. El usuario escribe una pregunta en el chat.
2. `POST /api/chat` envía la petición al orquestador server-side.
3. El orquestador usa el LLM y expone tools MCP.
4. El LLM decide cuándo llamar tools (`list_projects`, `list_documents`, `search_documentation`, `read_document`).
5. El backend ejecuta tools contra `MCP_SERVER_URL` (MCP Streamable HTTP).
6. El LLM genera la respuesta final.
7. La respuesta vuelve al frontend.

## Stack

- Next.js (App Router)
- TypeScript estricto
- React
- Tailwind CSS
- Node.js 20+
- npm

## Estructura

```
documentation-web/
├── app/
│   ├── api/
│   │   ├── chat/route.ts
│   │   ├── health/route.ts
│   │   └── projects/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
│   ├── chat/orchestrator.ts
│   ├── llm/
│   └── mcp/
├── tests/
├── types/
├── Dockerfile
└── .env.example
```

## Requisitos

- Node.js 20+
- npm
- Un servidor MCP compatible con Streamable HTTP (`documentation-mcp`)
- Proyecto GCP con Vertex AI habilitado (si `USE_MOCK_MCP=false` y `LLM_PROVIDER=gemini`)

## Instalación

```bash
npm install
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```env
MCP_SERVER_URL=http://localhost:8000/mcp

LLM_PROVIDER=gemini

GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=

MAX_TOOL_ITERATIONS=8
MCP_TIMEOUT_MS=30000

USE_MOCK_MCP=false
NEXT_PUBLIC_SHOW_TOOL_ACTIVITY=true
```

## Desarrollo local

### 1) Ejecutar frontend

```bash
npm run dev
```

Abrir: <http://localhost:3000>

### 2) Ejecutar MCP en paralelo

Debes levantar `documentation-mcp` por separado y asegurarte de que exponga Streamable HTTP en la URL configurada en `MCP_SERVER_URL`.

Ejemplo local:

- `documentation-web`: `http://localhost:3000`
- `documentation-mcp`: `http://localhost:8000/mcp`

## Autenticación local de Vertex AI

La app usa credenciales server-side. En local puedes usar ADC:

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

Alternativa: `GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json`

## Mock mode

Para desarrollar UI sin MCP real:

```env
USE_MOCK_MCP=true
```

Mock incluido:

- Proyectos: `logical`, `sweatworks`
- Respuestas mínimas para `list_documents`, `read_document`, `search_documentation`

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`

## Docker

Build:

```bash
docker build -t documentation-web .
```

Run:

```bash
docker run --rm -p 8080:8080 --env-file .env.local documentation-web
```

La imagen usa multi-stage, `next build` standalone y usuario no root.

## Preparación para Cloud Run

- El servicio está preparado para escuchar en `0.0.0.0:$PORT`.
- No incluye credenciales en cliente.
- MCP y LLM se consumen solo server-side.
- No se realiza despliegue automáticamente.

## Troubleshooting

- `No se pudieron obtener los proyectos desde MCP`:
  - Verifica `MCP_SERVER_URL` y que el MCP esté ejecutándose.
- Errores de autenticación Vertex:
  - Verifica ADC (`gcloud auth application-default login`) o service account.
- `MCP connection timeout`:
  - Incrementa `MCP_TIMEOUT_MS` o revisa latencia/disponibilidad del MCP.
- Respuestas vacías del modelo:
  - Verifica `GEMINI_MODEL`, proyecto, región y permisos Vertex AI.

## Seguridad aplicada

- MCP/LLM solo server-side.
- Validación de input en `POST /api/chat`.
- Timeouts MCP configurables.
- Errores internos no exponen stack traces al navegador.
- Sin `eval`, sin acceso directo browser->MCP, sin acceso directo a GCS desde `documentation-web`.
