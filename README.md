# cdn-mcp-servers

Servidor(s) MCP para interactuar con documentación interna CDN.

## Objetivo
Proveer herramientas (tools) del Model Context Protocol que permitan buscar términos en la documentación corporativa alojada bajo la ruta:
```
http://cdn-docs.cdn.hi.inet/cdn/apps/docs/<version>/components/cdn-docs-server/search.html?search=<query>
```

## Estructura
- `src/index.ts`: Servidor MCP principal con el tool `search_cdn_docs`.
- `package.json`: Dependencias y scripts.
- `tsconfig.json`: Configuración TypeScript.

## Instalación
```bash
cd cdn-mcp-servers
npm install
```

## Ejecución (standalone)
```bash
npm start
```

El servidor se comunica por STDIO según MCP. Debes registrarlo en tu configuración `mcp.json` de VS Code / GitHub Copilot.

## Variables de entorno
- `CDN_DOCS_BASE_URL` (opcional) Default: `http://cdn-docs.cdn.hi.inet/cdn/apps/docs`
- `CDN_DOCS_VERSION` (opcional) Default: `25.11.100`

## Ejemplo de configuración `.vscode/mcp.json`
```jsonc
{
  "servers": {
    "cdn-docs-search": {
      "command": "npm",
      "args": ["start"],
      "cwd": "${workspaceFolder}/cdn-mcp-servers",
      "env": {
        "CDN_DOCS_VERSION": "25.11.100"
      }
    }
  }
}
```
Si ya existe contenido, fusiona el bloque anterior dentro de `servers`.

## Uso del tool
Llama el tool `search_cdn_docs` pasando:
```json
{"query": "cdn-build", "version": "25.11.100"}
```
El resultado contiene JSON con `items` (lista de enlaces encontrados).

## Extensión futura
Puedes añadir más tools (p.ej. obtención de página completa, índice de componentes, análisis de dependencias) creando nuevos objetos y registrándolos con `server.tool(...)`.

## Nota
La extracción HTML usa heurísticas genéricas (`.search-results a`, `a.result`, `a`). Ajusta selectores según la estructura real de la página internal.
