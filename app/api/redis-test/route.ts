import { createClient } from 'redis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
    
    if (!redisUrl) {
      console.error('REDIS_URL environment variable is not set');
      return NextResponse.json({ 
        error: 'REDIS_URL environment variable is not set' 
      }, { status: 500 });
    }
    
    console.log('Attempting to connect to Redis at:', redisUrl);
    
    const redis = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000, // 10 seconds
        reconnectStrategy: (retries) => {
          console.log(`Redis reconnect attempt ${retries}`);
          return Math.min(retries * 100, 3000); // increasing delay with max of 3 seconds
        }
      }
    });
    
    redis.on('connect', () => {
      console.log('Redis client connecting...');
    });
    
    redis.on('ready', () => {
      console.log('Redis client ready');
    });
    
    redis.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    redis.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });
    
    console.log('Connecting to Redis...');
    await redis.connect();
    console.log('Successfully connected to Redis');
    
    // Set a test value
    console.log('Setting test value...');
    await redis.set('test-key', 'Hello from Redis test');
    console.log('Test value set successfully');
    
    // Get the test value
    console.log('Getting test value...');
    const value = await redis.get('test-key');
    console.log('Retrieved test value:', value);
    
    // Disconnect
    console.log('Disconnecting from Redis...');
    await redis.disconnect();
    console.log('Disconnected from Redis');
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Redis connection successful',
      testValue: value,
      redisUrl: redisUrl.replace(/\/\/.*@/, '//***@') // Hide credentials
    });
  } catch (error) {
    console.error('Redis test error:', error);
    return NextResponse.json({ 
      error: `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
