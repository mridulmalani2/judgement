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
    private destroyed = false;

    constructor(roomId: string, isHost: boolean, handler: EventHandler) {
        this.roomId = roomId;
        this.isHost = isHost;
        this.handler = handler;
    }

    public async init(): Promise<string> {
        return new Promise((resolve, reject) => {
            // Use random ID for everyone to avoid collisions
            this.peer = new Peer({
                debug: 1
            });

            this.peer.on('open', async (id) => {
                console.log('My Peer ID:', id);
                this.myPeerId = id;

                if (this.isHost) {
                    // Register as host
                    try {
                        await this.registerHost(id);
                        resolve(id);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    // Connect to host
                    this.connectToHost().then(() => resolve(id)).catch(reject);
                }
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                // Ignore some non-critical errors
                if (err.type === 'peer-unavailable') {
                    // Handled in connectToHost retry logic usually, but if it bubbles up:
                    // this.handler({ type: 'ERROR', error: 'Host not found. Retrying...' });
                } else {
                    this.handler({ type: 'ERROR', error: err.type });
                }
            });

            this.peer.on('disconnected', () => {
                console.log('Peer disconnected from server');
                if (!this.destroyed && this.peer) this.peer.reconnect();
            });
        });
    }

    private async registerHost(peerId: string) {
        try {
            const res = await fetch(`/api/signaling/${this.roomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'register_host', peerId })
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error('Register host failed:', res.status, errorData);
                throw new Error(`Failed to register host: ${res.status} ${errorData}`);
            }

            const data = await res.json();
            console.log('Host registered successfully:', data);
        } catch (error) {
            console.error('Register host error:', error);
            throw error;
        }
    }

    private async getHostId(): Promise<string> {
        const res = await fetch(`/ api / signaling / ${this.roomId}?action = get_host`);
        if (!res.ok) throw new Error('Host not found');
        const data = await res.json();
        return data.hostId;
    }

    private async connectToHost(retries = 5): Promise<void> {
        if (!this.peer || this.destroyed) return;

        try {
            const hostId = await this.getHostId();
            console.log('Found host ID:', hostId);

            const conn = this.peer.connect(hostId, {
                reliable: true
            });

            this.handleConnection(conn);

            // Wait a bit to ensure connection opens, otherwise throw? 
            // PeerJS doesn't await .connect(), so we rely on 'open' event.
            // But if it fails, we get 'error' on the peer.

        } catch (e) {
            console.error("Failed to connect to host:", e);
            if (retries > 0) {
                console.log(`Retrying connection in 2s... (${retries} left)`);
                await new Promise(r => setTimeout(r, 2000));
                return this.connectToHost(retries - 1);
            } else {
                throw new Error("Could not connect to host. Make sure the host is online.");
            }
        }
    }

    private handleConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log('Connection opened:', conn.peer);
            this.connections.set(conn.peer, conn);
            this.handler({ type: 'CONNECT', peerId: conn.peer });
        });

        conn.on('data', (data) => {
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
        this.destroyed = true;
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        this.peer?.destroy();
        this.peer = null;
    }
}
