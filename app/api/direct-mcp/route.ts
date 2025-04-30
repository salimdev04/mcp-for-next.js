import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicClient, formatUnits, http } from "viem";
import { monadTestnet } from "viem/chains";

// Create a public client to interact with the Monad testnet
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// Define a schema for the request body
const requestSchema = z.object({
  tool: z.string(),
  params: z.record(z.any())
});

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { tool, params } = requestSchema.parse(body);
    
    console.log(`Direct MCP API called with tool: ${tool}, params:`, params);
    
    // Handle the tool call directly without using Redis
    switch (tool) {
      case 'echo': {
        const { message } = params;
        if (typeof message !== 'string') {
          return NextResponse.json({ error: 'Message must be a string' }, { status: 400 });
        }
        return NextResponse.json({
          content: [{ type: 'text', text: `Tool echo: ${message}` }]
        });
      }
      
      case 'time': {
        const now = new Date();
        return NextResponse.json({
          content: [{ type: 'text', text: `Current server time: ${now.toLocaleString()}` }]
        });
      }
      
      case 'get-mon-balance': {
        const { address } = params;
        if (typeof address !== 'string') {
          return NextResponse.json({ error: 'Address must be a string' }, { status: 400 });
        }
        
        try {
          const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
          });

          return NextResponse.json({
            content: [
              {
                type: 'text',
                text: `Balance for ${address}: ${formatUnits(balance, 18)} MON`,
              },
            ],
          });
        } catch (error) {
          console.error("Error getting balance:", error);
          return NextResponse.json({
            content: [
              {
                type: 'text',
                text: `Failed to retrieve balance for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          });
        }
      }
      
      case 'transfer-tokens': {
        const { fromAddress, toAddress, amount, txHash } = params;
        
        if (typeof fromAddress !== 'string' || typeof toAddress !== 'string') {
          return NextResponse.json({ error: 'Addresses must be strings' }, { status: 400 });
        }
        
        if (typeof amount !== 'string') {
          return NextResponse.json({ error: 'Amount must be a string' }, { status: 400 });
        }
        
        // If txHash is provided, verify the transaction
        if (txHash && typeof txHash === 'string') {
          try {
            const tx = await publicClient.getTransaction({
              hash: txHash as `0x${string}`,
            });
            
            return NextResponse.json({
              content: [
                {
                  type: 'text',
                  text: `Transaction confirmed! ${parseFloat(formatUnits(tx.value, 18)).toFixed(4)} MON sent from ${fromAddress} to ${toAddress}.\n\nTransaction hash: ${txHash}\n\nView on explorer: https://explorer.testnet.monad.xyz/tx/${txHash}`,
                },
              ],
            });
          } catch (error) {
            console.error("Error verifying transaction:", error);
            return NextResponse.json({
              content: [
                {
                  type: 'text',
                  text: `Transaction submitted but verification failed. You can check the status manually on the explorer: https://explorer.testnet.monad.xyz/tx/${txHash}`,
                },
              ],
            });
          }
        }
        
        // If no txHash is provided, return instructions
        return NextResponse.json({
          content: [
            {
              type: 'text',
              text: `Please connect your wallet to transfer ${amount} MON from ${fromAddress} to ${toAddress}. You'll need to approve the transaction in your wallet.`,
            },
          ],
        });
      }
      
      case 'calculate': {
        const { operation, a, b } = params;
        
        if (typeof a !== 'number' || typeof b !== 'number') {
          return NextResponse.json({ error: 'a and b must be numbers' }, { status: 400 });
        }
        
        if (!['add', 'subtract', 'multiply', 'divide'].includes(operation)) {
          return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
        }
        
        let result;
        switch (operation) {
          case 'add':
            result = a + b;
            break;
          case 'subtract':
            result = a - b;
            break;
          case 'multiply':
            result = a * b;
            break;
          case 'divide':
            if (b === 0) {
              return NextResponse.json({
                content: [{ type: 'text', text: 'Error: Cannot divide by zero' }]
              });
            }
            result = a / b;
            break;
        }
        
        return NextResponse.json({
          content: [{ 
            type: 'text', 
            text: `Result of ${operation} ${a} and ${b} = ${result}` 
          }]
        });
      }
      
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 404 });
    }
  } catch (error) {
    console.error('Direct MCP API error:', error);
    return NextResponse.json({ 
      error: `Server error: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
