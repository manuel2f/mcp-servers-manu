declare module '@modelcontextprotocol/sdk/server/mcp' {
  export class McpServer {
    constructor(serverInfo: { name: string; version: string }, options?: any);
    registerTool(name: string, config: any, cb: (args: any) => Promise<any>): void;
    connect(transport: any): Promise<void>;
  }
}
declare module '@modelcontextprotocol/sdk/server/stdio' {
  export class StdioServerTransport {
    constructor(...args: any[]);
  }
}