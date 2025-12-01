import axios from 'axios';
import * as cheerio from 'cheerio';
// @ts-ignore: type resolution workaround
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
// @ts-ignore: type resolution workaround
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z } from 'zod';

const BASE_DOCS_URL = process.env.CDN_DOCS_BASE_URL || 'http://cdn-docs.cdn.hi.inet/cdn/repositories';
const DEFAULT_VERSION = process.env.CDN_DOCS_VERSION || '25.11.100';
const COMPONENTS_URL = `${BASE_DOCS_URL}/{{version}}/docs/components`;

// Cache para componentes disponibles
let componentsCache: string[] | null = null;
let componentsCacheTime: number = 0;
const CACHE_TTL = 3600000; // 1 hora

// Schemas para validación
const searchSchema = z.object({
  query: z.string().min(1, 'query requerido'),
  version: z.string().optional().default(DEFAULT_VERSION)
});

const componentSearchSchema = z.object({
  component: z.string().min(1, 'nombre del componente requerido'),
  query: z.string().optional(),
  version: z.string().optional().default(DEFAULT_VERSION)
});

const listComponentsSchema = z.object({
  version: z.string().optional().default(DEFAULT_VERSION)
});

const getDocSchema = z.object({
  component: z.string().min(1, 'nombre del componente requerido'),
  path: z.string().optional().default('index.adoc'),
  version: z.string().optional().default(DEFAULT_VERSION)
});

const dtsSearchSchema = z.object({
  query: z.string().optional(),
  version: z.string().optional().default(DEFAULT_VERSION)
});

const wikiSearchSchema = z.object({
  query: z.string().optional(),
  version: z.string().optional().default(DEFAULT_VERSION)
});


// Helper: obtener lista de componentes disponibles
async function getAvailableComponents(version: string): Promise<string[]> {
  const now = Date.now();
  if (componentsCache && (now - componentsCacheTime) < CACHE_TTL) {
    return componentsCache;
  }

  try {
    const componentsPageUrl = COMPONENTS_URL.replace('{{version}}', version);
    const resp = await axios.get(componentsPageUrl, { timeout: 8000 });
    const $ = cheerio.load(resp.data);
    
    const components: string[] = [];
    // Buscar enlaces a carpetas de componentes (terminan en /)
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

    componentsCache = components.sort();
    componentsCacheTime = now;
    return componentsCache;
  } catch (err: any) {
    console.error(`Error obteniendo componentes: ${err.message}`);
    return [];
  }
}

// Helper: buscar en componente específico
async function searchInComponent(component: string, query: string | undefined, version: string): Promise<any> {
  const componentUrl = `${BASE_DOCS_URL}/${version}/docs/components/${component}`;
  
  try {
    // Primero intentar con index.html, si falla listar directorio
    let indexUrl = `${componentUrl}/index.html`;
    let resp;
    let useDirectoryListing = false;
    
    try {
      resp = await axios.get(indexUrl, { timeout: 8000 });
    } catch (indexErr: any) {
      // Si no existe index.html, listar directorio
      if (indexErr.response?.status === 404 && !query) {
        useDirectoryListing = true;
        indexUrl = `${componentUrl}/`;
        resp = await axios.get(indexUrl, { timeout: 8000 });
      } else if (query) {
        // Si hay query y no hay index.html, intentar buscar en archivos del directorio
        indexUrl = `${componentUrl}/`;
        resp = await axios.get(indexUrl, { timeout: 8000 });
        useDirectoryListing = true;
      } else {
        throw indexErr;
      }
    }
    
    const $ = cheerio.load(resp.data);
    const results: Array<{ title: string; href: string; section?: string; type?: string }> = [];
    
    if (useDirectoryListing) {
      // Listar archivos .adoc disponibles en el directorio
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('.adoc')) {
          const filename = href;
          const title = filename.replace('.adoc', '').replace(/_/g, ' ');
          const absolute = new URL(href, indexUrl).toString();
          
          // Si hay query, filtrar por coincidencia
          if (!query || title.toLowerCase().includes(query.toLowerCase()) || filename.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title: title, 
              href: absolute,
              type: 'document',
              section: component 
            });
          }
        }
      });
      
      // También incluir carpetas
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('/') && !href.startsWith('?') && !href.startsWith('/')) {
          const foldername = href.replace('/', '');
          if (!query || foldername.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title: foldername, 
              href: new URL(href, indexUrl).toString(),
              type: 'folder',
              section: component
            });
          }
        }
      });
    } else if (query) {
      // Búsqueda específica en index.html
      $('.search-results a, a.result, .sect1 a, .sect2 a').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        if (href && (title.toLowerCase().includes(query.toLowerCase()) || href.toLowerCase().includes(query.toLowerCase()))) {
          const absolute = href.startsWith('http') ? href : new URL(href, indexUrl).toString();
          results.push({ title: title || href, href: absolute });
        }
      });
    } else {
      // Listar estructura del componente desde index.html
      $('.toc a, nav a, .sect1 > h2, .sect2 > h3').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        const section = $el.closest('.sect1, .sect2').find('h2, h3').first().text().trim();
        
        if (href) {
          const absolute = href.startsWith('http') ? href : new URL(href, indexUrl).toString();
          results.push({ title: title || href, href: absolute, section });
        } else if (title) {
          results.push({ title, href: indexUrl, section: 'heading' });
        }
      });
    }
    
    // Deduplicar
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      if (seen.has(r.href)) return false;
      seen.add(r.href);
      return true;
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          component, 
          query: query || 'structure', 
          version, 
          url: indexUrl, 
          count: deduped.length, 
          items: deduped 
        }, null, 2)
      }]
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `Error buscando en componente ${component}: ${err.message}`
      }]
    };
  }
}

// Helper: obtener contenido de documento específico
async function getDocContent(component: string, path: string, version: string): Promise<any> {
  // Si path termina en .adoc, convertir a .html
  const htmlPath = path.endsWith('.adoc') ? path.replace('.adoc', '.html') : `${path}.html`;
  const docUrl = `${BASE_DOCS_URL}/${version}/docs/components/${component}/${htmlPath}`;
  
  try {
    const resp = await axios.get(docUrl, { timeout: 8000 });
    const $ = cheerio.load(resp.data);
    
    // Extraer contenido principal
    const title = $('h1').first().text().trim();
    const content = $('#content, .content, main, article').text().trim();
    
    // Extraer tabla de contenidos si existe
    const toc: string[] = [];
    $('.toc a, nav a').each((_, el) => {
      const text = $(el).text().trim();
      if (text) toc.push(text);
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          component,
          path,
          version,
          url: docUrl,
          title,
          toc,
          content: content.substring(0, 5000) // Limitar contenido
        }, null, 2)
      }]
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `Error obteniendo documento ${path} del componente ${component}: ${err.message}`
      }]
    };
  }
}

// Helper: buscar en DTS (cdn-documentation/dts)
async function searchInDTS(query: string | undefined, version: string): Promise<any> {
  const dtsUrl = `${BASE_DOCS_URL}/${version}/docs/components/cdn-documentation/dts`;
  
  try {
    // Primero intentar con index.html, si falla listar directorio
    let indexUrl = `${dtsUrl}/index.html`;
    let resp;
    let useDirectoryListing = false;
    
    try {
      resp = await axios.get(indexUrl, { timeout: 8000 });
    } catch (indexErr: any) {
      // Si no existe index.html, listar directorio
      if (indexErr.response?.status === 404 || !query) {
        useDirectoryListing = true;
        indexUrl = `${dtsUrl}/`;
        resp = await axios.get(indexUrl, { timeout: 8000 });
      } else {
        throw indexErr;
      }
    }
    
    const $ = cheerio.load(resp.data);
    const results: Array<{ title: string; href: string; section?: string; type?: string }> = [];
    
    if (useDirectoryListing) {
      // Listar archivos .adoc disponibles en el directorio
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('.adoc')) {
          const filename = href;
          const title = filename.replace('.adoc', '').replace(/_/g, ' ');
          const absolute = new URL(href, indexUrl).toString();
          
          // Si hay query, filtrar por coincidencia
          if (!query || title.toLowerCase().includes(query.toLowerCase()) || filename.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title: title, 
              href: absolute,
              type: 'document',
              section: 'DTS'
            });
          }
        }
      });
      
      // También incluir carpetas
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('/') && !href.startsWith('?') && !href.startsWith('/')) {
          const foldername = href.replace('/', '');
          if (!query || foldername.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title: foldername, 
              href: new URL(href, indexUrl).toString(),
              type: 'folder',
              section: 'DTS'
            });
          }
        }
      });
    } else if (query) {
      // Búsqueda específica en index.html
      $('.search-results a, a.result, .sect1 a, .sect2 a').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        if (href && (title.toLowerCase().includes(query.toLowerCase()) || href.toLowerCase().includes(query.toLowerCase()))) {
          const absolute = href.startsWith('http') ? href : new URL(href, indexUrl).toString();
          results.push({ title: title || href, href: absolute, section: 'DTS' });
        }
      });
    } else {
      // Listar estructura desde index.html
      $('.toc a, nav a, .sect1 > h2, .sect2 > h3').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        const section = $el.closest('.sect1, .sect2').find('h2, h3').first().text().trim();
        
        if (href) {
          const absolute = href.startsWith('http') ? href : new URL(href, indexUrl).toString();
          results.push({ title: title || href, href: absolute, section });
        } else if (title) {
          results.push({ title, href: indexUrl, section: 'heading' });
        }
      });
    }
    
    // Deduplicar
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      if (seen.has(r.href)) return false;
      seen.add(r.href);
      return true;
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          source: 'DTS',
          query: query || 'structure', 
          version, 
          url: indexUrl, 
          count: deduped.length, 
          items: deduped 
        }, null, 2)
      }]
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `Error buscando en DTS: ${err.message}`
      }]
    };
  }
}

// Helper: buscar en Wiki (cdn-documentation/wiki)
async function searchInWiki(query: string | undefined, version: string): Promise<any> {
  const wikiUrl = `${BASE_DOCS_URL}/${version}/docs/components/cdn-documentation/wiki`;
  
  try {
    // Primero intentar con index.html, si falla listar directorio
    let indexUrl = `${wikiUrl}/index.html`;
    let resp;
    let useDirectoryListing = false;
    
    try {
      resp = await axios.get(indexUrl, { timeout: 8000 });
    } catch (indexErr: any) {
      // Si no existe index.html, listar directorio
      if (indexErr.response?.status === 404 || !query) {
        useDirectoryListing = true;
        indexUrl = `${wikiUrl}/`;
        resp = await axios.get(indexUrl, { timeout: 8000 });
      } else {
        throw indexErr;
      }
    }
    
    const $ = cheerio.load(resp.data);
    const results: Array<{ title: string; href: string; section?: string; type?: string }> = [];
    
    if (useDirectoryListing) {
      // Listar archivos .adoc disponibles en el directorio
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('.adoc')) {
          const filename = href;
          const title = filename.replace('.adoc', '').replace(/_/g, ' ');
          const absolute = new URL(href, indexUrl).toString();
          
          // Si hay query, filtrar por coincidencia
          if (!query || title.toLowerCase().includes(query.toLowerCase()) || filename.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title: title, 
              href: absolute,
              type: 'document',
              section: 'Wiki'
            });
          }
        }
      });
      
      // También incluir carpetas
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('/') && !href.startsWith('?') && !href.startsWith('/')) {
          const foldername = href.replace('/', '');
          if (!query || foldername.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title: foldername, 
              href: new URL(href, indexUrl).toString(),
              type: 'folder',
              section: 'Wiki'
            });
          }
        }
      });
    } else if (query) {
      // Búsqueda específica en index.html
      $('.search-results a, a.result, .sect1 a, .sect2 a').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        if (href && (title.toLowerCase().includes(query.toLowerCase()) || href.toLowerCase().includes(query.toLowerCase()))) {
          const absolute = href.startsWith('http') ? href : new URL(href, indexUrl).toString();
          results.push({ title: title || href, href: absolute, section: 'Wiki' });
        }
      });
    } else {
      // Listar estructura desde index.html
      $('.toc a, nav a, .sect1 > h2, .sect2 > h3').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        const section = $el.closest('.sect1, .sect2').find('h2, h3').first().text().trim();
        
        if (href) {
          const absolute = href.startsWith('http') ? href : new URL(href, indexUrl).toString();
          results.push({ title: title || href, href: absolute, section });
        } else if (title) {
          results.push({ title, href: indexUrl, section: 'heading' });
        }
      });
    }
    
    // Deduplicar
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      if (seen.has(r.href)) return false;
      seen.add(r.href);
      return true;
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          source: 'Wiki',
          query: query || 'structure', 
          version, 
          url: indexUrl, 
          count: deduped.length, 
          items: deduped 
        }, null, 2)
      }]
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `Error buscando en Wiki: ${err.message}`
      }]
    };
  }
}

async function performSearch(query: string, version: string): Promise<any> {
  const searchUrl = `${BASE_DOCS_URL}/${version}/docs/components/cdn-docs-server/search.adoc?search=${encodeURIComponent(query)}`;
  try {
    const resp = await axios.get(searchUrl, { timeout: 8000 });
    const html = resp.data as string;
    const $ = cheerio.load(html);

    // Heurística básica de extracción de resultados.
    // Ajusta selectores según la estructura real de la página.
    const results: Array<{ title: string; href: string }> = [];

    // Intentar un contenedor típico
    const candidates = $('.search-results a, a.result, a');
    candidates.each((index: number, el: cheerio.Element) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      if (!href) return;
      // Filtrar ruido y priorizar coincidencias
      if (title.toLowerCase().includes(query.toLowerCase()) || href.toLowerCase().includes(query.toLowerCase())) {
        // Normalizar enlaces relativos
        const absolute = href.startsWith('http') ? href : new URL(href, searchUrl).toString();
        results.push({ title: title || href, href: absolute });
      }
    });

    // Deduplicar
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      if (seen.has(r.href)) return false;
      seen.add(r.href);
      return true;
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ query, version, url: searchUrl, count: deduped.length, items: deduped }, null, 2)
        }
      ]
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error al buscar en ${searchUrl}: ${err.message}`
        }
      ]
    };
  }
}

async function main() {
  const mcpServer = new McpServer({
    name: 'cdn-mcp-docs-search',
    version: '0.3.0'
  });

  // Tool 1: Búsqueda general en toda la documentación
  mcpServer.registerTool('search_cdn_docs', {
    description: 'Busca términos en la documentación interna CDN y devuelve enlaces relevantes.',
    inputSchema: searchSchema
  }, async (args: z.infer<typeof searchSchema>) => {
    const query = args.query;
    const version = args.version || DEFAULT_VERSION;
    return await performSearch(query, version);
  });

  // Tool 2: Listar componentes disponibles
  mcpServer.registerTool('list_cdn_components', {
    description: 'Lista todos los componentes CDN disponibles en la documentación (cdn-action-runner, cdn-ad-server-mock, etc.).',
    inputSchema: listComponentsSchema
  }, async (args: z.infer<typeof listComponentsSchema>) => {
    const version = args.version || DEFAULT_VERSION;
    const components = await getAvailableComponents(version);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          version,
          count: components.length,
          components
        }, null, 2)
      }]
    };
  });

  // Tool 3: Buscar o explorar en componente específico
  mcpServer.registerTool('search_cdn_component', {
    description: 'Busca en un componente CDN específico (ej: cdn-action-runner) o lista su estructura si no se proporciona query. Útil para búsquedas focalizadas.',
    inputSchema: componentSearchSchema
  }, async (args: z.infer<typeof componentSearchSchema>) => {
    const component = args.component;
    const query = args.query;
    const version = args.version || DEFAULT_VERSION;
    return await searchInComponent(component, query, version);
  });

  // Tool 4: Obtener contenido de documento específico
  mcpServer.registerTool('get_cdn_doc', {
    description: 'Obtiene el contenido completo de un archivo de documentación específico. Path examples: "index.adoc", "includes/development_guide.adoc", "code-docs/makefile/index.adoc".',
    inputSchema: getDocSchema
  }, async (args: z.infer<typeof getDocSchema>) => {
    const component = args.component;
    const path = args.path || 'index';
    const version = args.version || DEFAULT_VERSION;
    return await getDocContent(component, path, version);
  });

  // Tool 5: Buscar en DTS (cdn-documentation/dts)
  mcpServer.registerTool('search_dts', {
    description: 'Busca en la documentación de DTS (Design and Technical Specifications) del directorio cdn-documentation/dts. Si no se proporciona query, lista la estructura disponible.',
    inputSchema: dtsSearchSchema
  }, async (args: z.infer<typeof dtsSearchSchema>) => {
    const query = args.query;
    const version = args.version || DEFAULT_VERSION;
    return await searchInDTS(query, version);
  });

  // Tool 6: Buscar en Wiki (cdn-documentation/wiki)
  mcpServer.registerTool('search_wiki', {
    description: 'Busca en la documentación de Wiki del directorio cdn-documentation/wiki. Si no se proporciona query, lista la estructura disponible.',
    inputSchema: wikiSearchSchema
  }, async (args: z.infer<typeof wikiSearchSchema>) => {
    const query = args.query;
    const version = args.version || DEFAULT_VERSION;
    return await searchInWiki(query, version);
  });

  await mcpServer.connect(new StdioServerTransport());
}

main().catch(e => {
  console.error('Fallo inicial del servidor MCP:', e);
  process.exit(1);
});
