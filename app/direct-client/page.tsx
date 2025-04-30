import DirectMcpClient from '../components/DirectMcpClient';
import Link from 'next/link';

export default function DirectClientPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Direct API Client</h1>
        <Link href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
          Back to Home
        </Link>
      </div>
      
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800">
          This client bypasses Redis and calls the MCP tools directly via API.
          It's more reliable for testing but doesn't use the full MCP protocol.
        </p>
      </div>
      
      <DirectMcpClient />
    </div>
  );
}
