declare module '@modelcontextprotocol/sdk/client/index.js' {
  export class Client {
    constructor(
      info: { name: string; version: string },
      options?: { capabilities: { prompts: any; resources: any; tools: any } }
    );
    connect(transport: any): Promise<void>;
    getServerCapabilities(): any;
    listTools(): Promise<Record<string, { description?: string }>>;
    callTool(name: string, params: any): Promise<any>;
    close(): void;
  }
}

declare module '@modelcontextprotocol/sdk/client/sse.js' {
  export class SSEClientTransport {
    constructor(url: URL);
    sessionId: string;
  }
}

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(
      info: { name: string; version: string },
      options?: any
    );
    tool(name: string, schema: any, handler: (params: any) => Promise<any>): void;
    server: {
      onclose: () => void;
    };
    connect(transport: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/sse.js' {
  export class SSEServerTransport {
    constructor(path: string, res: any);
    sessionId: string;
    handlePostMessage(req: any, res: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export interface ServerOptions {
    capabilities?: {
      tools?: Record<string, { description: string }>;
    };
  }
}
