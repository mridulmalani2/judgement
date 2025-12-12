import type { NextApiRequest, NextApiResponse } from 'next';
import { getGameState } from '../../lib/roomStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const generateCode = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
            let result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        let roomCode = generateCode();
        let attempts = 0;

        // Try to find a unique code
        while (attempts < 5) {
            const existing = await getGameState(roomCode);
            if (!existing) break;
            roomCode = generateCode();
            attempts++;
        }

        if (attempts >= 5) {
            return res.status(503).json({ error: "Could not generate unique room code" });
        }

        // We don't need to explicitly "save" the room here because the Host will 
        // initialize the game state immediately after this. 
        // The room code is just a reserved slot for them.
        res.status(200).json({ roomCode });
    } else {
        res.status(405).end();
    }
}
