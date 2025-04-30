# MCP Server with Frontend Interface

A Next.js implementation of the Model Context Protocol (MCP) server with a frontend interface for interacting with MCP tools.

## Features

- MCP server implementation using the `@modelcontextprotocol/sdk`
- Two client options:
  - Standard MCP Client (uses Redis for communication)
  - Direct API Client (bypasses Redis for more reliable testing)
- Sample tools: echo, time, calculate
- Redis connection status monitoring

## Usage

### Server Configuration

Update `app/mcp.ts` with your tools, prompts, and resources following the [MCP TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/main?tab=readme-ov-file#server).

### Running Locally

1. Install dependencies:
   ```sh
   pnpm install
   ```

2. Set up a Redis instance:
   ```sh
   # Start Redis locally
   redis-server
   
   # Or configure a cloud Redis URL in .env
   echo "REDIS_URL=your_redis_url_here" > .env.local
   ```

3. Start the development server:
   ```sh
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to access the frontend interface.

## Client Options

### Standard MCP Client

- Uses the full MCP protocol with Redis for communication
- Requires a working Redis connection
- Access at [http://localhost:3000/mcp-client](http://localhost:3000/mcp-client)

### Direct API Client

- Bypasses Redis and calls the MCP tools directly via API
- More reliable for testing but doesn't use the full MCP protocol
- Access at [http://localhost:3000/direct-client](http://localhost:3000/direct-client)

## Troubleshooting

If you're experiencing timeout issues with the standard MCP client:

1. Make sure Redis is running locally (`redis-server`)
2. Check the Redis connection status on the home page
3. Try the Direct API Client instead which bypasses Redis
4. Check server logs for detailed error information
5. Consider using a cloud Redis provider like Upstash

## Notes for running on Vercel

- Requires a Redis attached to the project under `process.env.REDIS_URL`
- Make sure you have [Fluid compute](https://vercel.com/docs/functions/fluid-compute) enabled for efficient execution
- After enabling Fluid compute, open `app/sse/route.ts` and adjust max duration to 800 if you using a Vercel Pro or Enterprise account
- [Deploy the Next.js MCP template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)

## Sample Command Line Client

`script/test-client.mjs` contains a sample client to try invocations via command line.

```sh
node scripts/test-client.mjs https://mcp-for-next-js.vercel.app
# mcp-with-monad
