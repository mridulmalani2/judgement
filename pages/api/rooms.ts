import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for rooms (Note: This is ephemeral on Vercel Serverless. 
// For production, use Redis/KV. For this demo/family use, it might work if the function stays warm, 
// but ideally we need a small persistent store. 
// However, the user asked for "no DB required" and "serverless memory". 
// We'll use a simple global object, but warn that it might reset.
// Actually, for signaling, we need persistence across requests.
// Vercel Serverless functions do NOT share memory reliably.
// But for "Create Room", we just need to generate a code.
// The "Join" needs to verify it exists.
// If we can't use a DB, we can't verify room existence reliably without one.
// BUT, we can just let clients coordinate via signaling if they know the code.
// So "Create" just returns a code. "Join" just returns success.
// The signaling channel will be the meeting point.
// If we use a deterministic mapping from RoomCode -> Signaling Channel, we don't need a DB for room existence.
// We just need the signaling endpoint to relay messages.

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Create Room
        // Generate a 3-digit code
        const roomCode = Math.floor(100 + Math.random() * 900).toString();
        res.status(200).json({ roomCode });
    } else {
        res.status(405).end();
    }
}
