# Changelog

## [0.3.0] - 2025-12-01

### Añadido
- **Tool `search_dts`**: Búsqueda en documentación DTS (Design and Technical Specifications) en `cdn-documentation/dts`
- **Tool `search_wiki`**: Búsqueda en documentación Wiki en `cdn-documentation/wiki`
- Capacidad de listar estructura completa cuando no se proporciona query en ambas herramientas
- Soporte para búsqueda en carpetas y documentos .adoc
- Actualización del script de pruebas `test-mcp.ts` para incluir las nuevas herramientas

### Mejorado
- README actualizado con documentación de las 6 herramientas disponibles
- Ejemplos de uso para las nuevas herramientas DTS y Wiki

## [0.2.1] - 2025-11-27

### Corregido
- **URL base incorrecta**: Cambiada de `/cdn/apps/docs` a `/cdn/repositories`
- **Path de componentes**: Ahora usa `/docs/components` en lugar de `/components`
- **Selector de componentes**: Mejorado para capturar solo directorios (enlaces que terminan en `/`)
- **Regex de extracción**: Más estricto `^(cdn-[\w-]+)\/$` para evitar falsos positivos

### Técnico
- Actualización de constante `BASE_DOCS_URL` a `http://cdn-docs.cdn.hi.inet/cdn/repositories`
- Actualización de `COMPONENTS_URL` a incluir `/docs/components`
- Corrección en todas las funciones que construyen URLs (searchInComponent, getDocContent, performSearch)

## [0.2.0] - 2025-11-27

### Añadido
- **Tool `list_cdn_components`**: Lista todos los componentes CDN disponibles con caché de 1 hora
- **Tool `search_cdn_component`**: Búsqueda focalizada en componentes específicos o exploración de su estructura
- **Tool `get_cdn_doc`**: Obtención de contenido completo de documentos .adoc específicos
- Cache de componentes para mejorar rendimiento (TTL: 1 hora)
- Extracción de metadatos mejorada (secciones, tabla de contenidos)
- Guía de uso completa (USAGE_GUIDE.md)

### Mejorado
- Selectores HTML optimizados para AsciiDoc renderizado (`.toc`, `.sect1`, `.sect2`)
- URLs normalizadas a absolutas en todos los resultados
- Deduplicación de resultados en todas las búsquedas
- Manejo de errores más robusto con mensajes descriptivos

### Técnico
- Versión actualizada a 0.2.0
- Timeout aumentado a 8 segundos para peticiones HTTP
- Límite de contenido en documentos: 5000 caracteres
- Soporte para exploración sin query (estructura de componentes)

## [0.1.0] - 2025-11-26

### Añadido
- Implementación inicial del servidor MCP
- Tool `search_cdn_docs` para búsqueda global
- Extracción básica de resultados HTML con cheerio
- Configuración de variables de entorno (CDN_DOCS_BASE_URL, CDN_DOCS_VERSION)
- README básico con instrucciones de uso
