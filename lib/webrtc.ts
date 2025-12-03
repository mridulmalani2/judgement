import Peer, { DataConnection } from 'peerjs';

export type MessageHandler = (senderId: string, payload: any) => void;

export class PeerManager {
    private peer: Peer | null = null;
    private connections: { [peerId: string]: DataConnection } = {};
    private myId: string;
    private onMessage: MessageHandler;
    private onPeerConnect: (peerId: string) => void;
    private onPeerDisconnect: (peerId: string) => void;
    private knownPeers: Set<string> = new Set();

    constructor(
        myId: string,
        onMessage: MessageHandler,
        onPeerConnect: (peerId: string) => void,
        onPeerDisconnect: (peerId: string) => void
    ) {
        this.myId = myId;
        this.onMessage = onMessage;
        this.onPeerConnect = onPeerConnect;
        this.onPeerDisconnect = onPeerDisconnect;
    }

    public async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Use PeerJS cloud (free)
            // We use a custom prefix to avoid collisions? 
            // Actually, IDs are UUIDs, so collision unlikely.
            this.peer = new Peer(this.myId, {
                debug: 1,
            });

            this.peer.on('open', (id) => {
                console.log('My Peer ID is:', id);
                resolve();
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                // reject(err); // Only reject if starting
            });

            this.peer.on('disconnected', () => {
                console.log('Peer disconnected from server. Reconnecting...');
                this.peer?.reconnect();
            });
        });
    }

    public connectTo(peerId: string) {
        if (this.connections[peerId] || peerId === this.myId) return;

        console.log(`Connecting to ${peerId}...`);
        const conn = this.peer?.connect(peerId, { reliable: true });
        if (conn) {
            this.handleConnection(conn);
        }
    }

    private handleConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log(`Connected to ${conn.peer}`);
            this.connections[conn.peer] = conn;
            this.knownPeers.add(conn.peer);
            this.onPeerConnect(conn.peer);

            // Exchange known peers (Mesh discovery)
            // Send my list of peers to the new peer
            this.sendTo(conn.peer, {
                type: 'PEER_DISCOVERY',
                peers: Array.from(this.knownPeers)
            });
        });

        conn.on('data', (data: any) => {
            // Handle Peer Discovery internally
            if (data && data.type === 'PEER_DISCOVERY' && Array.isArray(data.peers)) {
                data.peers.forEach((pId: string) => {
                    if (pId !== this.myId && !this.connections[pId]) {
                        this.connectTo(pId);
                    }
                });
                return;
            }

            this.onMessage(conn.peer, data);
        });

        conn.on('close', () => {
            console.log(`Connection closed: ${conn.peer}`);
            delete this.connections[conn.peer];
            this.knownPeers.delete(conn.peer);
            this.onPeerDisconnect(conn.peer);
        });

        conn.on('error', (err) => {
            console.error(`Connection error with ${conn.peer}:`, err);
            // Close logic usually handles cleanup
        });
    }

    public broadcast(payload: any) {
        Object.values(this.connections).forEach(conn => {
            if (conn.open) {
                conn.send(payload);
            }
        });
    }

    public sendTo(peerId: string, payload: any) {
        const conn = this.connections[peerId];
        if (conn && conn.open) {
            conn.send(payload);
        }
    }

    public destroy() {
        this.peer?.destroy();
        this.connections = {};
    }
}
