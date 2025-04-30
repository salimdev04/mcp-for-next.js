import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  try {
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
    
    if (!redisUrl) {
      return NextResponse.json({ 
        status: 'error',
        redis: {
          configured: false,
          message: 'REDIS_URL environment variable is not set'
        }
      });
    }
    
    // Test Redis connection
    const redis = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000 // 5 seconds timeout
      }
    });
    
    let redisStatus = {
      configured: true,
      connected: false,
      message: ''
    };
    
    try {
      await redis.connect();
      await redis.set('status-test', 'ok');
      const value = await redis.get('status-test');
      await redis.disconnect();
      
      redisStatus.connected = true;
      redisStatus.message = 'Redis connection successful';
    } catch (redisError) {
      redisStatus.message = `Redis connection failed: ${redisError instanceof Error ? redisError.message : String(redisError)}`;
    }
    
    return NextResponse.json({
      status: 'success',
      redis: redisStatus,
      env: {
        nodeEnv: process.env.NODE_ENV || 'not set'
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      message: `Server error: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
