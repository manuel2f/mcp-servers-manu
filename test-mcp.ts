#!/usr/bin/env tsx
/**
 * Script simple para probar el MCP server localmente
 * Uso: npx tsx test-mcp.ts [tool-name] [args-json]
 *
 * Ejemplos:
 *   npx tsx test-mcp.ts list_cdn_components
 *   npx tsx test-mcp.ts search_cdn_component '{"component":"cdn-action-runner"}'
 *   npx tsx test-mcp.ts search_cdn_docs '{"query":"makefile"}'
 *   npx tsx test-mcp.ts search_dts '{"query":"design"}'
 *   npx tsx test-mcp.ts search_wiki '{"query":"architecture"}'
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_DOCS_URL = process.env.CDN_DOCS_BASE_URL || 'http://cdn-docs.cdn.hi.inet/cdn/repositories';
const DEFAULT_VERSION = process.env.CDN_DOCS_VERSION || '25.11.100';

// Cache para componentes
let componentsCache: string[] | null = null;
let componentsCacheTime: number = 0;
const CACHE_TTL = 3600000;

async function getAvailableComponents(version: string): Promise<string[]> {
  const now = Date.now();
  if (componentsCache && (now - componentsCacheTime) < CACHE_TTL) {
    return componentsCache;
  }

  try {
    const url = `${BASE_DOCS_URL}/${version}/docs/components/`;
    console.error(`[DEBUG] Fetching components from: ${url}`);
    const resp = await axios.get(url, { timeout: 8000 });
    const $ = cheerio.load(resp.data);
    
    const components: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.endsWith('/') && !href.startsWith('/')) {
        const match = href.match(/^(cdn-[\w-]+)\/$/);
        if (match && !components.includes(match[1])) {
          components.push(match[1]);
        }
      }
    });

    componentsCache = components.sort();
    componentsCacheTime = now;
    console.error(`[DEBUG] Found ${components.length} components`);
    return componentsCache;
  } catch (err: any) {
    console.error(`[ERROR] getAvailableComponents: ${err.message}`);
    throw err;
  }
}

async function searchInComponent(component: string, query: string | undefined, version: string): Promise<any> {
  const componentUrl = `${BASE_DOCS_URL}/${version}/docs/components/${component}`;
  
  try {
    let indexUrl = `${componentUrl}/index.html`;
    let resp;
    let useDirectoryListing = false;
    
    try {
      console.error(`[DEBUG] Trying to fetch: ${indexUrl}`);
      resp = await axios.get(indexUrl, { timeout: 8000 });
    } catch (indexErr: any) {
      if (indexErr.response?.status === 404) {
        console.error(`[DEBUG] index.html not found, trying directory listing`);
        useDirectoryListing = true;
        indexUrl = `${componentUrl}/`;
        resp = await axios.get(indexUrl, { timeout: 8000 });
      } else {
        throw indexErr;
      }
    }
    
    const $ = cheerio.load(resp.data);
    const results: Array<{ title: string; href: string; section?: string; type?: string }> = [];
    
    if (useDirectoryListing) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('.adoc')) {
          const filename = href;
          const title = filename.replace('.adoc', '').replace(/_/g, ' ');
          const absolute = new URL(href, indexUrl).toString();
          
          if (!query || title.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title, 
              href: absolute,
              type: 'document',
              section: component 
            });
          }
        }
      });
    }
    
    return { component, query, version, results };
  } catch (err: any) {
    console.error(`[ERROR] searchInComponent: ${err.message}`);
    throw err;
  }
}

async function searchInDTS(query: string | undefined, version: string): Promise<any> {
  const dtsUrl = `${BASE_DOCS_URL}/${version}/docs/components/cdn-documentation/dts`;
  
  try {
    let indexUrl = `${dtsUrl}/index.html`;
    let resp;
    let useDirectoryListing = false;
    
    try {
      console.error(`[DEBUG] Trying to fetch DTS: ${indexUrl}`);
      resp = await axios.get(indexUrl, { timeout: 8000 });
    } catch (indexErr: any) {
      if (indexErr.response?.status === 404 || !query) {
        console.error(`[DEBUG] DTS index.html not found, trying directory listing`);
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
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.endsWith('.adoc') || href.endsWith('/'))) {
          const filename = href;
          const title = filename.replace('.adoc', '').replace('/', '').replace(/_/g, ' ');
          const absolute = new URL(href, indexUrl).toString();
          
          if (!query || title.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title, 
              href: absolute,
              type: href.endsWith('/') ? 'folder' : 'document',
              section: 'DTS'
            });
          }
        }
      });
    }
    
    return { source: 'DTS', query: query || 'structure', version, results };
  } catch (err: any) {
    console.error(`[ERROR] searchInDTS: ${err.message}`);
    throw err;
  }
}

async function searchInWiki(query: string | undefined, version: string): Promise<any> {
  const wikiUrl = `${BASE_DOCS_URL}/${version}/docs/components/cdn-documentation/wiki`;
  
  try {
    let indexUrl = `${wikiUrl}/index.html`;
    let resp;
    let useDirectoryListing = false;
    
    try {
      console.error(`[DEBUG] Trying to fetch Wiki: ${indexUrl}`);
      resp = await axios.get(indexUrl, { timeout: 8000 });
    } catch (indexErr: any) {
      if (indexErr.response?.status === 404 || !query) {
        console.error(`[DEBUG] Wiki index.html not found, trying directory listing`);
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
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.endsWith('.adoc') || href.endsWith('/'))) {
          const filename = href;
          const title = filename.replace('.adoc', '').replace('/', '').replace(/_/g, ' ');
          const absolute = new URL(href, indexUrl).toString();
          
          if (!query || title.toLowerCase().includes(query.toLowerCase())) {
            results.push({ 
              title, 
              href: absolute,
              type: href.endsWith('/') ? 'folder' : 'document',
              section: 'Wiki'
            });
          }
        }
      });
    }
    
    return { source: 'Wiki', query: query || 'structure', version, results };
  } catch (err: any) {
    console.error(`[ERROR] searchInWiki: ${err.message}`);
    throw err;
  }
}

async function performSearch(query: string, version: string): Promise<any> {
  const searchUrl = `${BASE_DOCS_URL}/${version}/docs/components/`;
  
  try {
    console.error(`[DEBUG] Searching in: ${searchUrl}`);
    const resp = await axios.get(searchUrl, { timeout: 8000 });
    const $ = cheerio.load(resp.data);

    const results: Array<{ title: string; href: string }> = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      
      if (href && (title.toLowerCase().includes(query.toLowerCase()) || href.toLowerCase().includes(query.toLowerCase()))) {
        const absolute = href.startsWith('http') ? href : new URL(href, searchUrl).toString();
        results.push({ title: title || href, href: absolute });
      }
    });

    const seen = new Set<string>();
    const deduped = results.filter(r => {
      if (seen.has(r.href)) return false;
      seen.add(r.href);
      return true;
    });

    return { query, version, count: deduped.length, items: deduped };
  } catch (err: any) {
    console.error(`[ERROR] performSearch: ${err.message}`);
    throw err;
  }
}

async function main() {
  const toolName = process.argv[2];
  const argsStr = process.argv[3] || '{}';
  
  try {
    let args = {};
    if (argsStr && argsStr !== '{}') {
      args = JSON.parse(argsStr);
    }
    
    console.error(`[DEBUG] Running tool: ${toolName} with args: ${JSON.stringify(args)}`);
    
    let result: any;
    
    if (toolName === 'list_cdn_components') {
      const version = (args as any).version || DEFAULT_VERSION;
      const components = await getAvailableComponents(version);
      result = { version, count: components.length, components };
    } 
    else if (toolName === 'search_cdn_component') {
      const component = (args as any).component;
      const query = (args as any).query;
      const version = (args as any).version || DEFAULT_VERSION;
      
      if (!component) throw new Error('component is required');
      result = await searchInComponent(component, query, version);
    }
    else if (toolName === 'search_cdn_docs') {
      const query = (args as any).query;
      const version = (args as any).version || DEFAULT_VERSION;
      
      if (!query) throw new Error('query is required');
      result = await performSearch(query, version);
    }
    else if (toolName === 'search_dts') {
      const query = (args as any).query;
      const version = (args as any).version || DEFAULT_VERSION;
      
      result = await searchInDTS(query, version);
    }
    else if (toolName === 'search_wiki') {
      const query = (args as any).query;
      const version = (args as any).version || DEFAULT_VERSION;
      
      result = await searchInWiki(query, version);
    }
    else {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }
}

main();
