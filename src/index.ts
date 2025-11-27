import axios from 'axios';
import * as cheerio from 'cheerio';
// @ts-ignore: type resolution workaround
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
// @ts-ignore: type resolution workaround
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z } from 'zod';

const BASE_DOCS_URL = process.env.CDN_DOCS_BASE_URL || 'http://cdn-docs.cdn.hi.inet/cdn/apps/docs';
const DEFAULT_VERSION = process.env.CDN_DOCS_VERSION || '25.11.100';

// Define the tool schema
// Zod schema para validar parámetros de entrada
const inputSchema = z.object({
  query: z.string().min(1, 'query requerido'),
  version: z.string().optional().default(DEFAULT_VERSION)
});

async function performSearch(query: string, version: string): Promise<any> {
  const searchUrl = `${BASE_DOCS_URL}/${version}/components/cdn-docs-server/search.html?search=${encodeURIComponent(query)}`;
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
    version: '0.1.0'
  });

  mcpServer.registerTool('search_cdn_docs', {
    description: 'Busca términos en la documentación interna CDN y devuelve enlaces relevantes.',
    inputSchema
  }, async (args: z.infer<typeof inputSchema>) => {
    const query = args.query;
    const version = args.version || DEFAULT_VERSION;
    return await performSearch(query, version);
  });

  await mcpServer.connect(new StdioServerTransport());
}

main().catch(e => {
  console.error('Fallo inicial del servidor MCP:', e);
  process.exit(1);
});
