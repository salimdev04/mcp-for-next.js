import McpClient from '../components/McpClient';
import Link from 'next/link';

export default function McpClientPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Standard MCP Client</h1>
        <Link href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
          Back to Home
        </Link>
      </div>
      
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          This client uses the full MCP protocol with Redis for communication. 
          If you experience timeout issues, try the Direct API Client instead.
        </p>
      </div>
      
      <McpClient />
    </div>
  );
}
