# Fix: URL Base Incorrecta

## Problema Detectado
La lista de componentes retornaba vacía porque la URL base era incorrecta.

## URL Anterior (Incorrecta)
```
http://cdn-docs.cdn.hi.inet/cdn/apps/docs/25.11.100/components/
```

## URL Correcta
```
http://cdn-docs.cdn.hi.inet/cdn/repositories/25.11.100/docs/components/
```

## Cambios Realizados

### 1. Actualización de Constantes
```typescript
// Antes
const BASE_DOCS_URL = 'http://cdn-docs.cdn.hi.inet/cdn/apps/docs';
const COMPONENTS_URL = `${BASE_DOCS_URL}/{{version}}/components`;

// Después
const BASE_DOCS_URL = 'http://cdn-docs.cdn.hi.inet/cdn/repositories';
const COMPONENTS_URL = `${BASE_DOCS_URL}/{{version}}/docs/components`;
```

### 2. Actualización de Paths en Funciones

**searchInComponent:**
```typescript
// Antes
const componentUrl = `${BASE_DOCS_URL}/${version}/components/${component}`;

// Después
const componentUrl = `${BASE_DOCS_URL}/${version}/docs/components/${component}`;
```

**getDocContent:**
```typescript
// Antes
const docUrl = `${BASE_DOCS_URL}/${version}/components/${component}/${path}.html`;

// Después
const docUrl = `${BASE_DOCS_URL}/${version}/docs/components/${component}/${path}.html`;
```

**performSearch:**
```typescript
// Antes
const searchUrl = `${BASE_DOCS_URL}/${version}/components/cdn-docs-server/search.html?search=${...}`;

// Después
const searchUrl = `${BASE_DOCS_URL}/${version}/docs/components/cdn-docs-server/search.html?search=${...}`;
```

### 3. Mejora del Selector de Componentes

**Antes:**
```typescript
$('a[href*="cdn-"]').each((_, el) => {
  const href = $(el).attr('href');
  if (href) {
    const match = href.match(/cdn-[\w-]+/);
    if (match && !components.includes(match[0])) {
      components.push(match[0]);
    }
  }
});
```

**Después:**
```typescript
$('a[href]').each((_, el) => {
  const href = $(el).attr('href');
  if (href && href.endsWith('/')) {
    // Extraer nombre del componente (cdn-*)
    const match = href.match(/^(cdn-[\w-]+)\/$/);
    if (match && !components.includes(match[1])) {
      components.push(match[1]);
    }
  }
});
```

**Mejoras del nuevo selector:**
- Busca solo enlaces que terminan en `/` (directorios)
- Usa regex más estricto `^(cdn-[\w-]+)\/$` para evitar falsos positivos
- Extrae exactamente el nombre del componente sin caracteres adicionales

## Verificación

### Ejemplo de HTML Parseado
```html
<a href="cdn-action-runner/">cdn-action-runner/</a>
<a href="cdn-ad-server-mock/">cdn-ad-server-mock/</a>
<a href="cdn-alto/">cdn-alto/</a>
```

### Componentes Esperados
```json
[
  "cdn-action-runner",
  "cdn-ad-server-mock",
  "cdn-alto",
  "cdn-auth",
  "cdn-avalanche-client",
  "cdn-backup",
  "cdn-baton",
  "cdn-baton-libs",
  "cdn-beegfs",
  "cdn-boost",
  "cdn-boot-server",
  ...
]
```

## Archivos Actualizados

1. **src/index.ts** - Código fuente con URLs corregidas
2. **README.md** - Documentación actualizada
3. **.vscode/mcp.json** - Configuración con URL base correcta
4. **dist/index.js** - JavaScript compilado

## Próximos Pasos

1. **Reiniciar el MCP server** para que tome los cambios
2. **Probar `list_cdn_components`** para verificar que retorna componentes
3. **Verificar búsquedas** en componentes específicos

## Comandos de Verificación

```bash
# Verificar que la URL es accesible
curl -I "http://cdn-docs.cdn.hi.inet/cdn/repositories/25.11.100/docs/components/"

# Ver lista de componentes
curl -sL "http://cdn-docs.cdn.hi.inet/cdn/repositories/25.11.100/docs/components/" | grep -oE 'href="cdn-[^"]*"'

# Probar componente específico
curl -I "http://cdn-docs.cdn.hi.inet/cdn/repositories/25.11.100/docs/components/cdn-action-runner/index.html"
```

## Notas de Debugging

Si `list_cdn_components` sigue retornando vacío:

1. Verificar que el servidor MCP se reinició
2. Revisar logs de axios para errores HTTP
3. Inspeccionar HTML real con:
   ```typescript
   console.log(resp.data); // Ver HTML completo
   ```
4. Verificar timeout (8000ms debería ser suficiente)
5. Comprobar que no hay problemas de red/firewall

## Versión
Este fix forma parte de la versión **0.2.1** (hotfix)
