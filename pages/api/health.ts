/**
 * Health Check API
 *
 * Verifies that Redis is properly configured and working.
 * Returns status information for debugging multiplayer issues.
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const hasRedisUrl = !!process.env.UPSTASH_REDIS_REST_URL;
    const hasRedisToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
    const redisEnabled = hasRedisUrl && hasRedisToken;

    // Test Redis connectivity if configured
    let redisConnected = false;
    let redisError = null;

    if (redisEnabled) {
        try {
            // Import Redis directly for the ping test
            const { Redis } = await import('@upstash/redis');
            const redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            });

            // Test with a simple ping
            await redis.ping();
            redisConnected = true;
        } catch (e: any) {
            redisError = e.message || 'Unknown Redis error';
        }
    }

    const status = {
        ok: redisConnected,
        timestamp: new Date().toISOString(),
        redis: {
            urlConfigured: hasRedisUrl,
            tokenConfigured: hasRedisToken,
            clientInitialized: redisEnabled,
            connected: redisConnected,
            error: redisError,
        },
        environment: process.env.NODE_ENV || 'development',
        message: !hasRedisUrl || !hasRedisToken
            ? 'Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment variables.'
            : !redisConnected
                ? `Redis configured but connection failed: ${redisError}`
                : 'All systems operational',
    };

    // Return 503 if Redis is not working (multiplayer won't function)
    const statusCode = redisConnected ? 200 : 503;

    return res.status(statusCode).json(status);
}
