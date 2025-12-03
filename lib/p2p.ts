import Peer, { DataConnection } from 'peerjs';

export type P2PEvent =
    | { type: 'CONNECT', peerId: string }
    | { type: 'DISCONNECT', peerId: string }
    | { type: 'DATA', peerId: string, data: any }
    | { type: 'ERROR', error: string };

type EventHandler = (event: P2PEvent) => void;

export class P2PManager {
    private peer: Peer | null = null;
    private connections: Map<string, DataConnection> = new Map();
    private handler: EventHandler;
    private isHost: boolean;
    private roomId: string;
    private myPeerId: string | null = null;

    constructor(roomId: string, isHost: boolean, handler: EventHandler) {
        this.roomId = roomId;
        this.isHost = isHost;
        this.handler = handler;
    }

    public async init(): Promise<string> {
        return new Promise((resolve, reject) => {
            // Clean up any existing peer with this ID if we are host (best effort)

            // If Host, try to claim the roomId as PeerID. 
            // Prefixing to avoid collisions with other apps using public PeerJS
            const hostId = `judgement-app-${this.roomId}`;

            if (this.isHost) {
                this.peer = new Peer(hostId, {
                    debug: 2
                });
            } else {
                // Joiners get random ID
                this.peer = new Peer({
                    debug: 2
                });
            }

            this.peer.on('open', (id) => {
                console.log('My Peer ID:', id);
                this.myPeerId = id;
                resolve(id);

                if (!this.isHost) {
                    this.connectToHost();
                }
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                this.handler({ type: 'ERROR', error: err.type });
                if (err.type === 'unavailable-id') {
                    // Host ID taken. Maybe previous session didn't close.
                    reject(new Error('Room ID is currently in use. Please wait or try a different code.'));
                }
            });

            this.peer.on('disconnected', () => {
                console.log('Peer disconnected from server');
                // Auto-reconnect?
                // this.peer?.reconnect();
            });
        });
    }

    private connectToHost() {
        if (!this.peer) return;
        const hostId = `judgement-app-${this.roomId}`;
        console.log('Connecting to host:', hostId);

        const conn = this.peer.connect(hostId, {
            reliable: true
        });

        this.handleConnection(conn);
    }

    private handleConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log('Connection opened:', conn.peer);
            this.connections.set(conn.peer, conn);
            this.handler({ type: 'CONNECT', peerId: conn.peer });
        });

        conn.on('data', (data) => {
            // console.log('Received data from', conn.peer, data);
            this.handler({ type: 'DATA', peerId: conn.peer, data });
        });

        conn.on('close', () => {
            console.log('Connection closed:', conn.peer);
            this.connections.delete(conn.peer);
            this.handler({ type: 'DISCONNECT', peerId: conn.peer });
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.connections.delete(conn.peer);
            this.handler({ type: 'DISCONNECT', peerId: conn.peer });
        });
    }

    public send(data: any) {
        // Broadcast to all
        this.connections.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    }

    public sendTo(peerId: string, data: any) {
        const conn = this.connections.get(peerId);
        if (conn && conn.open) {
            conn.send(data);
        }
    }

    public destroy() {
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        this.peer?.destroy();
        this.peer = null;
    }
}
