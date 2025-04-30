'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import McpClient from './components/McpClient';
import DirectMcpClient from './components/DirectMcpClient';

export default function Home() {
  const [redisStatus, setRedisStatus] = useState<{
    configured: boolean;
    connected: boolean;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        setLoading(true);
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.redis) {
          setRedisStatus(data.redis);
        } else {
          setError('Invalid status response');
        }
      } catch (err) {
        setError(`Failed to check status: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }
    
    checkStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 bg-white text-black">
      <h1 className="text-3xl font-bold mb-6 text-black">MCP Client Interface</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-black">Redis Status</h2>
        <div className="p-4 bg-gray-50 rounded-lg border shadow-sm">
          {loading ? (
            <p className="text-blue-600">Checking Redis connection...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : redisStatus ? (
            <div>
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${redisStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`font-medium ${redisStatus.connected ? 'text-green-700' : 'text-red-700'}`}>
                  {redisStatus.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-gray-700">{redisStatus.message}</p>
              {!redisStatus.connected && (
                <p className="mt-2 text-yellow-600">
                  Redis connection issues will prevent the standard MCP client from working.
                  Please use the Direct API client instead.
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Unable to determine Redis status</p>
          )}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-black">Choose Client Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            href="/direct-client" 
            className="block p-6 bg-gray-50 rounded-lg border shadow-md hover:bg-gray-100"
          >
            <h3 className="text-xl font-bold mb-2 text-black">Direct API Client</h3>
            <p className="text-gray-700">
              Bypasses Redis and calls the tools directly via API.
              More reliable for testing but doesn't use the full MCP protocol.
            </p>
          </Link>
        </div>
      </div>
      
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold mb-2 text-black">Troubleshooting</h2>
        <p className="mb-2 text-gray-800">
          If you're experiencing timeout issues with the standard MCP client:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-gray-800">
          <li>Make sure Redis is running locally (<code>redis-server</code>)</li>
          <li>Try the Direct API Client instead which bypasses Redis</li>
          <li>Check server logs for detailed error information</li>
          <li>Consider using a cloud Redis provider like Upstash</li>
        </ul>
      </div>
    </div>
  );
}
