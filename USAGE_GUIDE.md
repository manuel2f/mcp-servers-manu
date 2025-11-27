# Guía de Uso - CDN MCP Server

## Escenarios de Uso Común

### Escenario 1: Buscar documentación sobre un componente desconocido

**Problema:** Necesitas trabajar con `cdn-action-runner` pero no conoces su estructura.

**Solución:**
```typescript
// Paso 1: Ver componentes disponibles
mcp_cdn-docs-sear_search_cdn_docs.list_cdn_components({ version: "25.11.100" })

// Paso 2: Explorar estructura de cdn-action-runner
mcp_cdn-docs-sear_search_cdn_docs.search_cdn_component({ 
  component: "cdn-action-runner" 
})

// Paso 3: Leer el index principal
mcp_cdn-docs-sear_search_cdn_docs.get_cdn_doc({ 
  component: "cdn-action-runner",
  path: "index"
})
```

### Escenario 2: Buscar información sobre Makefiles

**Problema:** Necesitas entender cómo funcionan los Makefiles en el proyecto CDN.

**Solución:**
```typescript
// Opción A: Búsqueda global
mcp_cdn-docs-sear_search_cdn_docs.search_cdn_docs({ 
  query: "makefile"
})

// Opción B: Búsqueda en componente específico
mcp_cdn-docs-sear_search_cdn_docs.search_cdn_component({ 
  component: "cdn-action-runner",
  query: "makefile"
})

// Opción C: Leer documentación específica de makefile
mcp_cdn-docs-sear_search_cdn_docs.get_cdn_doc({ 
  component: "cdn-action-runner",
  path: "code-docs/makefile/index"
})
```

### Escenario 3: Explorar guías de desarrollo

**Problema:** Necesitas las guías de desarrollo de múltiples componentes.

**Solución:**
```typescript
// Para cdn-action-runner
mcp_cdn-docs-sear_search_cdn_docs.get_cdn_doc({ 
  component: "cdn-action-runner",
  path: "includes/development_guide"
})

// Para cdn-ad-server-mock
mcp_cdn-docs-sear_search_cdn_docs.get_cdn_doc({ 
  component: "cdn-ad-server-mock",
  path: "includes/development_guide"
})
```

### Escenario 4: Buscar información sobre tests

**Problema:** Necesitas información sobre cómo ejecutar tests en diferentes componentes.

**Solución:**
```typescript
// Búsqueda global
mcp_cdn-docs-sear_search_cdn_docs.search_cdn_docs({ 
  query: "test shell"
})

// Búsqueda específica en cdn-action-runner
mcp_cdn-docs-sear_search_cdn_docs.search_cdn_component({ 
  component: "cdn-action-runner",
  query: "test"
})

// Obtener documentación específica de tests
mcp_cdn-docs-sear_search_cdn_docs.get_cdn_doc({ 
  component: "cdn-action-runner",
  path: "includes/use_cases/tests/shell"
})
```

## Patrones de Paths Comunes

Basándose en la estructura típica de documentación CDN:

### Documentos Principales
- `index` - Página principal del componente
- `summary` - Resumen del componente
- `usage` - Guía de uso

### Includes Comunes
- `includes/development_guide` - Guía de desarrollo
- `includes/dependencies` - Dependencias del componente
- `includes/api-docs` - Documentación de API
- `includes/code-docs` - Documentación de código
- `includes/rpms` - Información sobre RPMs

### Code Docs
- `code-docs/makefile/index` - Documentación de Makefile
- `code-docs/python/index` - Documentación de Python
- `code-docs/shell/index` - Documentación de Shell scripts

### RPMs
- `includes/rpms/index` - Índice de RPMs
- `includes/rpms/tid-cdn-{componente}/info` - Info específica del RPM

## Consejos de Búsqueda

### 1. Búsqueda Progresiva
Empieza con búsquedas amplias y ve especificando:
```
General → Componente → Documento específico
```

### 2. Términos Efectivos
Usa términos técnicos específicos:
- "makefile", "test", "deployment", "api", "configuration"
- Nombres de comandos: "make test", "make all"
- Rutas: "/opt/p2pcdn", "/etc"

### 3. Exploración vs Búsqueda
- **Explorar:** Omite el parámetro `query` en `search_cdn_component`
- **Buscar:** Proporciona un `query` específico

### 4. Versiones
Si trabajas con múltiples versiones, especifica siempre la versión:
```typescript
{ version: "25.11.100" }
{ version: "25.9.100" }
```

## Respuestas Típicas

### `list_cdn_components`
```json
{
  "version": "25.11.100",
  "count": 35,
  "components": [
    "cdn-action-runner",
    "cdn-ad-server-mock",
    "cdn-alto",
    "cdn-auth",
    ...
  ]
}
```

### `search_cdn_component` (sin query)
```json
{
  "component": "cdn-action-runner",
  "query": "structure",
  "version": "25.11.100",
  "url": "http://...",
  "count": 15,
  "items": [
    {
      "title": "Development Guide",
      "href": "http://.../includes/development_guide.html",
      "section": "Documentation"
    },
    ...
  ]
}
```

### `get_cdn_doc`
```json
{
  "component": "cdn-action-runner",
  "path": "index",
  "version": "25.11.100",
  "url": "http://.../index.html",
  "title": "CDN Action Runner",
  "toc": [
    "Overview",
    "Installation",
    "Usage",
    "Development"
  ],
  "content": "CDN Action Runner is a component that..."
}
```

## Troubleshooting

### Error: Component not found
- Verifica el nombre exacto con `list_cdn_components`
- Asegúrate de usar el formato `cdn-{nombre}`

### Búsqueda sin resultados
- Intenta búsqueda global primero con `search_cdn_docs`
- Revisa la ortografía del término
- Prueba con términos más generales

### Path no encontrado
- Usa `search_cdn_component` sin query para ver la estructura
- Verifica que el path no incluya la extensión `.adoc` (se añade automáticamente)
- Los paths son relativos al componente

## Optimizaciones

### Cache
El servidor cachea la lista de componentes por 1 hora. Si se añaden nuevos componentes:
- Reinicia el servidor MCP
- O espera que expire el cache

### Performance
Para búsquedas rápidas:
1. Usa `search_cdn_component` en lugar de `search_cdn_docs` si conoces el componente
2. Especifica paths exactos en `get_cdn_doc` en lugar de buscar
3. Los resultados están limitados para evitar sobrecarga
