import { Server } from 'socket.io';
import { setupSocketIO } from '../../server/socketHandler';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default function handler(req: NextApiRequest, res: NextApiResponse | any) {
    if (!res.socket.server.io) {
        console.log('Initializing Socket.io server...');
        const io = new Server(res.socket.server, {
            path: '/api/socket',
            addTrailingSlash: false,
        });

        setupSocketIO(io);
        res.socket.server.io = io;
    } else {
        console.log('Socket.io server already running');
    }
    res.end();
}
