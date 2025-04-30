import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import { createClient } from "redis";
import { Socket } from "net";
import { Readable } from "stream";
import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { maxDuration } from "@/app/sse/route";

interface SerializedRequest {
  requestId: string;
  url: string;
  method: string;
  body: string;
  headers: IncomingHttpHeaders;
}

export function initializeMcpApiHandler(
  initializeServer: (server: McpServer) => void,
  serverOptions: ServerOptions = {}
) {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }
  
  console.log("Initializing Redis clients...");
  
  // Common Redis options
  const redisOptions = {
    url: redisUrl,
    socket: {
      connectTimeout: 30000, // 30 seconds
      reconnectStrategy: (retries: number) => {
        console.log(`Redis reconnect attempt ${retries}`);
        return Math.min(retries * 100, 3000); // increasing delay with max of 3 seconds
      }
    }
  };
  
  const redis = createClient(redisOptions);
  const redisPublisher = createClient(redisOptions);
  
  redis.on("connect", () => {
    console.log("Redis subscriber connecting...");
  });
  
  redis.on("ready", () => {
    console.log("Redis subscriber ready");
  });
  
  redis.on("error", (err) => {
    console.error("Redis subscriber error:", err);
  });
  
  redisPublisher.on("connect", () => {
    console.log("Redis publisher connecting...");
  });
  
  redisPublisher.on("ready", () => {
    console.log("Redis publisher ready");
  });
  
  redisPublisher.on("error", (err) => {
    console.error("Redis publisher error:", err);
  });
  
  console.log("Connecting to Redis...");
  const redisPromise = Promise.all([redis.connect(), redisPublisher.connect()]);

  let servers: McpServer[] = [];

  return async function mcpApiHandler(req: Request, res: ServerResponse) {
    try {
      await redisPromise;
      console.log("Redis connected successfully");
      
      const url = new URL(req.url || "", "https://example.com");
      if (url.pathname === "/sse") {
        console.log("Got new SSE connection");

        const transport = new SSEServerTransport("/message", res);
        const sessionId = transport.sessionId;
        console.log("Created SSE transport with session ID:", sessionId);
        
        const server = new McpServer(
          {
            name: "mcp-typescript server on vercel",
            version: "0.1.0",
          },
          serverOptions
        );
        initializeServer(server);

        servers.push(server);

        server.server.onclose = () => {
          console.log("SSE connection closed");
          servers = servers.filter((s) => s !== server);
        };

        let logs: {
          type: "log" | "error";
          messages: string[];
        }[] = [];
        // This ensures that we logs in the context of the right invocation since the subscriber
        // is not itself invoked in request context.
        function logInContext(severity: "log" | "error", ...messages: string[]) {
          logs.push({
            type: severity,
            messages,
          });
        }

        // Handles messages originally received via /message
        const handleMessage = async (message: string) => {
          console.log("Received message from Redis", message);
          logInContext("log", "Received message from Redis", message);
          const request = JSON.parse(message) as SerializedRequest;

          // Make in IncomingMessage object because that is what the SDK expects.
          const req = createFakeIncomingMessage({
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body,
          });
          const syntheticRes = new ServerResponse(req);
          let status = 100;
          let body = "";
          syntheticRes.writeHead = (statusCode: number) => {
            status = statusCode;
            return syntheticRes;
          };
          syntheticRes.end = (b: unknown) => {
            body = b as string;
            return syntheticRes;
          };
          
          try {
            console.log(`Processing message for ${sessionId}:${request.requestId}`);
            await transport.handlePostMessage(req, syntheticRes);
            console.log(`Processed message for ${sessionId}:${request.requestId}`);
            
            await redisPublisher.publish(
              `responses:${sessionId}:${request.requestId}`,
              JSON.stringify({
                status,
                body,
              })
            );
            console.log(`Published response for ${sessionId}:${request.requestId}`);

            if (status >= 200 && status < 300) {
              logInContext(
                "log",
                `Request ${sessionId}:${request.requestId} succeeded: ${body}`
              );
            } else {
              logInContext(
                "error",
                `Message for ${sessionId}:${request.requestId} failed with status ${status}: ${body}`
              );
            }
          } catch (error) {
            console.error(`Error processing message for ${sessionId}:${request.requestId}:`, error);
            logInContext(
              "error",
              `Error processing message for ${sessionId}:${request.requestId}: ${error}`
            );
            
            // Try to publish an error response
            try {
              await redisPublisher.publish(
                `responses:${sessionId}:${request.requestId}`,
                JSON.stringify({
                  status: 500,
                  body: `Server error: ${error}`,
                })
              );
            } catch (pubError) {
              console.error(`Failed to publish error response: ${pubError}`);
            }
          }
        };

        const interval = setInterval(() => {
          for (const log of logs) {
            console[log.type].call(console, ...log.messages);
          }
          logs = [];
        }, 100);

        console.log(`Subscribing to requests:${sessionId}`);
        await redis.subscribe(`requests:${sessionId}`, handleMessage);
        console.log(`Subscribed to requests:${sessionId}`);

        let timeout: NodeJS.Timeout;
        let resolveTimeout: (value: unknown) => void;
        const waitPromise = new Promise((resolve) => {
          resolveTimeout = resolve;
          timeout = setTimeout(() => {
            resolve("max duration reached");
          }, (maxDuration - 5) * 1000);
        });

        async function cleanup() {
          clearTimeout(timeout);
          clearInterval(interval);
          await redis.unsubscribe(`requests:${sessionId}`, handleMessage);
          console.log("Done");
          res.statusCode = 200;
          res.end();
        }
        req.signal.addEventListener("abort", () =>
          resolveTimeout("client hang up")
        );

        await server.connect(transport);
        const closeReason = await waitPromise;
        console.log(closeReason);
        await cleanup();
      } else if (url.pathname === "/message") {
        console.log("Received message");

        const body = await req.text();

        const sessionId = url.searchParams.get("sessionId") || "";
        if (!sessionId) {
          res.statusCode = 400;
          res.end("No sessionId provided");
          return;
        }
        const requestId = crypto.randomUUID();
        const serializedRequest: SerializedRequest = {
          requestId,
          url: req.url || "",
          method: req.method || "",
          body: body,
          headers: Object.fromEntries(req.headers.entries()),
        };

        console.log(`Processing request ${requestId} for session ${sessionId}`);
        
        // Handles responses from the /sse endpoint.
        console.log(`Subscribing to responses:${sessionId}:${requestId}`);
        await redis.subscribe(
          `responses:${sessionId}:${requestId}`,
          (message) => {
            console.log(`Received response for ${sessionId}:${requestId}`);
            clearTimeout(timeout);
            const response = JSON.parse(message) as {
              status: number;
              body: string;
            };
            res.statusCode = response.status;
            res.end(response.body);
          }
        );

        // Queue the request in Redis so that a subscriber can pick it up.
        // One queue per session.
        console.log(`Publishing request to requests:${sessionId}`);
        await redisPublisher.publish(
          `requests:${sessionId}`,
          JSON.stringify(serializedRequest)
        );
        console.log(`Published requests:${sessionId}`, serializedRequest);

        // Increase timeout from 10 seconds to 60 seconds (matching the maxDuration)
        let timeout = setTimeout(async () => {
          console.log(`Request ${requestId} timed out after ${maxDuration} seconds`);
          await redis.unsubscribe(`responses:${sessionId}:${requestId}`);
          res.statusCode = 408;
          res.end(JSON.stringify({
            error: {
              code: -32001,
              message: "Request timed out",
              data: { timeout: maxDuration * 1000 }
            }
          }));
        }, maxDuration * 1000);

        res.on("close", async () => {
          console.log(`Connection closed for ${sessionId}:${requestId}`);
          clearTimeout(timeout);
          await redis.unsubscribe(`responses:${sessionId}:${requestId}`);
        });
      } else {
        res.statusCode = 404;
        res.end("Not found");
      }
    } catch (error) {
      console.error("MCP handler error:", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: `Server error: ${error}` }));
    }
  };
}

// Define the options interface
interface FakeIncomingMessageOptions {
  method?: string;
  url?: string;
  headers?: IncomingHttpHeaders;
  body?: string | Buffer | Record<string, any> | null;
  socket?: Socket;
}

// Create a fake IncomingMessage
function createFakeIncomingMessage(
  options: FakeIncomingMessageOptions = {}
): IncomingMessage {
  const {
    method = "GET",
    url = "/",
    headers = {},
    body = null,
    socket = new Socket(),
  } = options;

  // Create a readable stream that will be used as the base for IncomingMessage
  const readable = new Readable();
  readable._read = (): void => {}; // Required implementation

  // Add the body content if provided
  if (body) {
    if (typeof body === "string") {
      readable.push(body);
    } else if (Buffer.isBuffer(body)) {
      readable.push(body);
    } else {
      readable.push(JSON.stringify(body));
    }
    readable.push(null); // Signal the end of the stream
  }

  // Create the IncomingMessage instance
  const req = new IncomingMessage(socket);

  // Set the properties
  req.method = method;
  req.url = url;
  req.headers = headers;

  // Copy over the stream methods
  req.push = readable.push.bind(readable);
  req.read = readable.read.bind(readable);
  // @ts-expect-error
  req.on = readable.on.bind(readable);
  req.pipe = readable.pipe.bind(readable);

  return req;
}
