import { z } from "zod";
import { initializeMcpApiHandler } from "../lib/mcp-api-handler";
import { createPublicClient, defineChain, formatUnits, http, parseEther } from "viem";
import { monadTestnet } from "viem/chains";

// Create a public client to interact with the Monad testnet
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export const mcpHandler = initializeMcpApiHandler(
  (server) => {
    // Echo tool - returns the message sent
    server.tool("echo", { message: z.string() }, async ({ message }) => ({
      content: [{ type: "text", text: `Tool echo: ${message}` }],
    }));
    
    // Time tool - returns the current server time
    server.tool("time", {}, async () => {
      const now = new Date();
      return {
        content: [{ 
          type: "text", 
          text: `Current server time: ${now.toLocaleString()}` 
        }],
      };
    });

    // Get MON balance tool - returns the balance for a Monad address
    server.tool(
      "get-mon-balance", 
      { 
        address: z.string()
      }, 
      async ({ address }) => {
        try {
          const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
          });

          return {
            content: [
              {
                type: "text",
                text: `Your Balance: ${parseFloat(formatUnits(balance, 18)).toFixed(2)} MON`,
              },
            ],
          };
        } catch (error) {
          console.error("Error getting balance:", error);
          return {
            content: [
              {
                type: "text",
                text: `Failed to retrieve balance for address: ${address}. Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );
    
    // Transfer tokens tool - allows users to transfer MON tokens
    server.tool(
      "transfer-tokens",
      {
        fromAddress: z.string().describe("The sender's wallet address"),
        toAddress: z.string().describe("The recipient's wallet address"),
        amount: z.string().describe("Amount of MON to transfer"),
        txHash: z.string().optional().describe("Transaction hash after sending"),
      },
      async ({ fromAddress, toAddress, amount, txHash }) => {
        // This tool doesn't perform the actual transfer on the server side
        // It just returns instructions and confirms the transaction if txHash is provided
        
        if (txHash) {
          try {
            // Verify the transaction if a hash is provided
            const tx = await publicClient.getTransaction({
              hash: txHash as `0x${string}`,
            });
            
            return {
              content: [
                {
                  type: "text",
                  text: `Transaction confirmed! ${parseFloat(formatUnits(tx.value, 18)).toFixed(4)} MON sent from ${fromAddress} to ${toAddress}.\n\nTransaction hash: ${txHash}\n\nView on explorer: https://explorer.testnet.monad.xyz/tx/${txHash}`,
                },
              ],
            };
          } catch (error) {
            console.error("Error verifying transaction:", error);
            return {
              content: [
                {
                  type: "text",
                  text: `Transaction submitted but verification failed. You can check the status manually on the explorer: https://explorer.testnet.monad.xyz/tx/${txHash}`,
                },
              ],
            };
          }
        }
        
        // If no txHash is provided, return instructions
        return {
          content: [
            {
              type: "text",
              text: `Please connect your wallet to transfer ${amount} MON from ${fromAddress} to ${toAddress}. You'll need to approve the transaction in your wallet.`,
            },
          ],
        };
      }
    );
    
    // Calculate tool - performs basic math operations
    server.tool(
      "calculate", 
      { 
        operation: z.enum(["add", "subtract", "multiply", "divide"]), 
        a: z.number(), 
        b: z.number() 
      }, 
      async ({ operation, a, b }) => {
        let result;
        switch (operation) {
          case "add":
            result = a + b;
            break;
          case "subtract":
            result = a - b;
            break;
          case "multiply":
            result = a * b;
            break;
          case "divide":
            if (b === 0) {
              return {
                content: [{ type: "text", text: "Error: Cannot divide by zero" }],
              };
            }
            result = a / b;
            break;
        }
        
        return {
          content: [{ 
            type: "text", 
            text: `Result of ${operation} ${a} and ${b} = ${result}` 
          }],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message back to the client",
        },
        time: {
          description: "Get the current server time",
        },
        "get-mon-balance": {
          description: "Get MON balance for an address on Monad testnet",
        },
        "transfer-tokens": {
          description: "Transfer MON tokens to another address",
        },
        calculate: {
          description: "Perform basic math operations",
        },
      },
    },
  }
);
