import { createServerResponseAdapter } from "@/lib/server-response-adapter";
import { mcpHandler } from "../mcp";

// Increase timeout from 60 to 300 seconds (5 minutes)
export const maxDuration = 300;

export async function POST(req: Request) {
  return createServerResponseAdapter(req.signal, (res) => {
    mcpHandler(req, res);
  });
}
