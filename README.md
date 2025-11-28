# cdn-mcp-servers

Servidor(s) MCP para interactuar con documentación interna CDN.

## Objetivo
Proveer herramientas (tools) del Model Context Protocol que permitan:
- Buscar términos en la documentación CDN completa
- Explorar componentes específicos (cdn-action-runner, cdn-ad-server-mock, etc.)
- Listar componentes disponibles
- Obtener contenido de documentos .adoc específicos

La documentación está alojada en:
```
http://cdn-docs.cdn.hi.inet/cdn/repositories/<version>/docs/components/
```

## Tools Disponibles

### 1. `search_cdn_docs`
Búsqueda general en toda la documentación CDN.

**Parámetros:**
- `query` (string, requerido): Término a buscar
- `version` (string, opcional): Versión de docs (default: `25.11.100`)

**Ejemplo:**
```json
{"query": "cdn-build", "version": "25.11.100"}
```

### 2. `list_cdn_components`
Lista todos los componentes CDN disponibles.

**Parámetros:**
- `version` (string, opcional): Versión de docs (default: `25.11.100`)

**Ejemplo:**
```json
{"version": "25.11.100"}
```

**Resultado:** Array con nombres de componentes como `["cdn-action-runner", "cdn-ad-server-mock", "cdn-alto", ...]`

### 3. `search_cdn_component`
Busca en un componente específico o explora su estructura.

**Parámetros:**
- `component` (string, requerido): Nombre del componente (ej: `cdn-action-runner`)
- `query` (string, opcional): Término a buscar. Si se omite, devuelve la estructura del componente
- `version` (string, opcional): Versión de docs (default: `25.11.100`)

**Ejemplos:**
```json
// Buscar "makefile" en cdn-action-runner
{"component": "cdn-action-runner", "query": "makefile"}

// Explorar estructura de cdn-ad-server-mock
{"component": "cdn-ad-server-mock"}
```

### 4. `get_cdn_doc`
Obtiene el contenido completo de un documento específico.

**Parámetros:**
- `component` (string, requerido): Nombre del componente
- `path` (string, opcional): Ruta al archivo (default: `index.adoc`)
- `version` (string, opcional): Versión de docs (default: `25.11.100`)

**Ejemplos:**
```json
// Obtener index principal de cdn-action-runner
{"component": "cdn-action-runner", "path": "index"}

// Obtener guía de desarrollo
{"component": "cdn-action-runner", "path": "includes/development_guide"}

// Obtener docs de makefile
{"component": "cdn-action-runner", "path": "code-docs/makefile/index"}
```

## Estructura
- `src/index.ts`: Servidor MCP principal con 4 tools
- `package.json`: Dependencias y scripts
- `tsconfig.json`: Configuración TypeScript

## Instalación
```bash
cd mcp-servers-manu
npm install
```

## Ejecución (standalone)
```bash
npm start
```

El servidor se comunica por STDIO según MCP. Debes registrarlo en tu configuración `mcp.json` de VS Code / GitHub Copilot.

## Variables de entorno
- `CDN_DOCS_BASE_URL` (opcional) Default: `http://cdn-docs.cdn.hi.inet/cdn/repositories`
- `CDN_DOCS_VERSION` (opcional) Default: `25.11.100`

## Ejemplo de configuración `.vscode/mcp.json`
```jsonc
{
  "servers": {
    "cdn-docs-search": {
      "command": "npm",
      "args": ["start"],
      "cwd": "${workspaceFolder}/mcp-servers-manu",
      "env": {
        "CDN_DOCS_BASE_URL": "http://cdn-docs.cdn.hi.inet/cdn/repositories",
        "CDN_DOCS_VERSION": "25.11.100"
      }
    }
  }
}
```

## Mejoras Implementadas (v0.2.0)

### 🎯 Búsqueda Optimizada
- **Cache de componentes:** Lista de componentes se cachea 1 hora para búsquedas más rápidas
- **Búsqueda focalizada:** Tool dedicado para buscar en componentes específicos
- **Extracción mejorada:** Selectores HTML más precisos para AsciiDoc renderizado

### 📚 Exploración de Estructura
- Listar componentes disponibles dinámicamente
- Explorar estructura de cada componente sin necesidad de query
- Obtener contenido completo de documentos específicos

### 🔍 Metadatos Enriquecidos
- Resultados incluyen sección del documento
- Tabla de contenidos extraída cuando está disponible
- URLs normalizadas y absolutas

## Workflow Recomendado

1. **Descubrir componentes:**
   ```json
   {"tool": "list_cdn_components"}
   ```

2. **Explorar estructura de componente:**
   ```json
   {"tool": "search_cdn_component", "component": "cdn-action-runner"}
   ```

3. **Buscar término específico:**
   ```json
   {"tool": "search_cdn_component", "component": "cdn-action-runner", "query": "makefile"}
   ```

4. **Leer documento completo:**
   ```json
   {"tool": "get_cdn_doc", "component": "cdn-action-runner", "path": "code-docs/makefile/index"}
   ```

## Testing - Script `test-mcp.ts`

El archivo `test-mcp.ts` permite probar el MCP de forma directa sin necesidad de integrarlo en VS Code o GitHub Copilot.

### Instalación de dependencias

```bash
npm install
```

### Uso del script de prueba

**Sintaxis general:**

```bash
npx tsx test-mcp.ts <tool-name> [args-json]
```

### Ejemplos de uso

**1. Listar todos los componentes disponibles:**

```bash
npx tsx test-mcp.ts list_cdn_components
# O especificar versión
npx tsx test-mcp.ts list_cdn_components '{"version":"25.11.100"}'
```

**2. Buscar un componente específico:**

```bash
# Explorar estructura de cdn-action-runner
npx tsx test-mcp.ts search_cdn_component '{"component":"cdn-action-runner"}'

# Buscar documentos con "makefile" en cdn-action-runner
npx tsx test-mcp.ts search_cdn_component '{"component":"cdn-action-runner","query":"makefile"}'
```

**3. Búsqueda global en toda la documentación:**

```bash
npx tsx test-mcp.ts search_cdn_docs '{"query":"makefile"}'

# Con versión específica
npx tsx test-mcp.ts search_cdn_docs '{"query":"docker","version":"25.11.100"}'
```

### Variables de entorno para testing

Puedes personalizar el comportamiento con variables de entorno:

```bash
# Especificar URL base diferente
export CDN_DOCS_BASE_URL="http://custom-url/cdn/repositories"

# Especificar versión por defecto
export CDN_DOCS_VERSION="25.9.100"

npx tsx test-mcp.ts list_cdn_components
```

### Salida del script

Cada comando retorna JSON formateado con los resultados:

```json
{
  "version": "25.11.100",
  "count": 42,
  "components": ["cdn-action-runner", "cdn-ad-server-mock", ...]
}
```

### Solución de problemas

- **Timeout de conexión:** Aumenta el timeout modificando la constante en `test-mcp.ts` o verifica la conectividad a `cdn-docs.cdn.hi.inet`
- **404 Not Found:** Verifica que el componente existe con `list_cdn_components`
- **Errores de parsing JSON:** Asegúrate de escapar correctamente las comillas en el JSON

## Extensión Futura

Posibles mejoras adicionales:

- Búsqueda semántica usando embeddings
- Índice invertido para búsquedas más rápidas
- Extracción de diagramas PlantUML
- Análisis de dependencias entre componentes
- Soporte para múltiples versiones simultáneas

## Notas Técnicas

- La extracción HTML está optimizada para AsciiDoc convertido a HTML
- Los selectores priorizan `.toc`, `.sect1`, `.sect2` típicos de AsciiDoc
- Timeout de 8 segundos por petición HTTP
- Contenido de documentos limitado a 5000 caracteres para evitar sobrecarga
