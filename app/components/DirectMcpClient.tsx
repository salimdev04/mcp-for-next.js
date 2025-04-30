'use client';

import { useState } from 'react';
import WalletConnect from './WalletConnect';

interface Tool {
  name: string;
  description: string;
}

interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

const AVAILABLE_TOOLS: Tool[] = [
  { name: 'echo', description: 'Echo a message back to the client' },
  { name: 'time', description: 'Get the current server time' },
  { name: 'get-mon-balance', description: 'Get MON balance for an address on Monad testnet' },
  { name: 'transfer-tokens', description: 'Transfer MON tokens to another address' },
  { name: 'calculate', description: 'Perform basic math operations' }
];

export default function DirectMcpClient() {
  const [selectedTool, setSelectedTool] = useState<string>('echo');
  
  // Tool-specific parameters
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('0x0000000000000000000000000000000000000000');
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [operation, setOperation] = useState<'add' | 'subtract' | 'multiply' | 'divide'>('add');
  const [numberA, setNumberA] = useState<number>(0);
  const [numberB, setNumberB] = useState<number>(0);
  
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Direct MCP client ready');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  const handleWalletConnect = (address: string) => {
    setConnectedWallet(address);
    setFromAddress(address);
    setDebugInfo(prev => prev + `\nWallet connected: ${address}`);
  };

  const handleWalletDisconnect = () => {
    setConnectedWallet(null);
    setDebugInfo(prev => prev + '\nWallet disconnected');
  };

  const handleTransfer = (hash: string) => {
    setTxHash(hash);
    setDebugInfo(prev => prev + `\nTransaction sent: ${hash}`);
    
    // Call the transfer-tokens tool with the txHash to verify the transaction
    if (selectedTool === 'transfer-tokens') {
      handleSubmit(null, hash);
    }
  };

  const handleSubmit = async (e: React.FormEvent | null, transactionHash?: string) => {
    if (e) e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setResponse('');
      setDebugInfo(prev => prev + '\n\nCalling tool: ' + selectedTool);
      
      let params: any = {};
      
      // Set parameters based on the selected tool
      switch (selectedTool) {
        case 'echo':
          params = { message };
          break;
        case 'time':
          params = {};
          break;
        case 'get-mon-balance':
          params = { address };
          break;
        case 'transfer-tokens':
          params = { 
            fromAddress: fromAddress || connectedWallet,
            toAddress,
            amount: transferAmount
          };
          
          // If a transaction hash is provided, include it in the params
          if (transactionHash) {
            params.txHash = transactionHash;
          }
          break;
        case 'calculate':
          params = {
            operation,
            a: numberA,
            b: numberB
          };
          break;
      }
      
      setDebugInfo(prev => prev + '\nWith parameters: ' + JSON.stringify(params));
      
      // Call the direct API endpoint
      setDebugInfo(prev => prev + '\nSending request...');
      const response = await fetch('/api/direct-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: selectedTool,
          params
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      setDebugInfo(prev => prev + '\nReceived response: ' + JSON.stringify(result));
      
      // Format and display the response
      const toolResponse = result as ToolResponse;
      const responseText = toolResponse.content
        .map(item => (item.type === 'text' ? item.text : JSON.stringify(item)))
        .join('\n');
      
      setResponse(responseText);
      setLoading(false);
    } catch (err) {
      console.error('Error calling tool:', err);
      setDebugInfo(prev => prev + '\nError calling tool: ' + JSON.stringify(err));
      setError(`Error calling tool: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Render input fields based on the selected tool
  const renderToolInputs = () => {
    switch (selectedTool) {
      case 'echo':
        return (
          <div>
            <label className="block mb-2">Message:</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="Enter your message"
              required
            />
          </div>
        );
      
      case 'time':
        return (
          <div className="text-gray-600 italic">
            No parameters needed for the time tool.
          </div>
        );
      
      case 'get-mon-balance':
        return (
          <div>
            <label className="block mb-2">Monad Address:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="Enter a Monad address (0x...)"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: 0x0000000000000000000000000000000000000000
            </p>
          </div>
        );
      
      case 'transfer-tokens':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-2">Wallet Connection</h3>
              <WalletConnect 
                onConnect={handleWalletConnect} 
                onDisconnect={handleWalletDisconnect}
                onTransfer={handleTransfer}
              />
            </div>
            
            {connectedWallet ? (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2">From Address:</label>
                  <input
                    type="text"
                    value={connectedWallet}
                    className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block mb-2">To Address:</label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                    placeholder="Enter recipient address (0x...)"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-2">Amount (MON):</label>
                  <input
                    type="text"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                    placeholder="0.01"
                    required
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  Connect your wallet and fill in the details above. Then click "Send Request" to initiate the transfer.
                </div>
              </div>
            ) : (
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-yellow-700">Please connect your wallet to transfer tokens.</p>
              </div>
            )}
          </div>
        );
      
      case 'calculate':
        return (
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Operation:</label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              >
                <option value="add">Addition</option>
                <option value="subtract">Subtraction</option>
                <option value="multiply">Multiplication</option>
                <option value="divide">Division</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Number A:</label>
                <input
                  type="number"
                  value={numberA}
                  onChange={(e) => setNumberA(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-2">Number B:</label>
                <input
                  type="number"
                  value={numberB}
                  onChange={(e) => setNumberB(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  required
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Direct MCP Client</h2>
        <p className="text-green-600 mb-4">
          Using direct API calls (bypassing Redis) for testing
        </p>
        {loading && <p className="mt-2 text-blue-600">Loading...</p>}
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Available Tools</h2>
        <div className="mb-4">
          <label className="block mb-2">Select a tool:</label>
          <select
            className="border border-gray-300 rounded px-3 py-2 w-full"
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
          >
            {AVAILABLE_TOOLS.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name} - {tool.description}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderToolInputs()}
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={loading || (selectedTool === 'transfer-tokens' && !connectedWallet)}
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </form>
      </div>

      {response && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Response</h2>
          <div className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">
            {response}
          </div>
        </div>
      )}
      
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <div className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap text-xs font-mono overflow-auto max-h-60">
          {debugInfo || 'No debug information available'}
        </div>
      </div>
    </div>
  );
}
