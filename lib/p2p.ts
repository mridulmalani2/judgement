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
    private currentServerIndex = 0;
    private readonly peerServers = [
        { host: '0.peerjs.com', port: 443, path: '/', secure: true },
        { host: '9000.peerjs.com', port: 443, path: '/', secure: true },
        // Add custom server if configured
        ...(process.env.NEXT_PUBLIC_PEER_HOST ? [{
            host: process.env.NEXT_PUBLIC_PEER_HOST,
            port: parseInt(process.env.NEXT_PUBLIC_PEER_PORT || '443'),
            path: process.env.NEXT_PUBLIC_PEER_PATH || '/',
            secure: true
        }] : [])
    ];

    constructor(roomId: string, isHost: boolean, handler: EventHandler) {
        this.roomId = roomId;
        this.isHost = isHost;
        this.handler = handler;
    }

    public async init(): Promise<string> {
        return this.initWithServer(0);
    }

    private async initWithServer(serverIndex: number): Promise<string> {
        if (serverIndex >= this.peerServers.length) {
            throw new Error('All PeerJS servers failed. Please check your internet connection.');
        }

        return new Promise((resolve, reject) => {
            const server = this.peerServers[serverIndex];
            console.log(`🔌 Attempting connection to PeerJS server ${serverIndex + 1}/${this.peerServers.length}:`, server.host);

            // Add timeout for this specific server
            const initTimeout = setTimeout(() => {
                console.warn(`⏱️ Server ${server.host} timed out, trying next...`);
                this.peer?.destroy();
                this.initWithServer(serverIndex + 1).then(resolve).catch(reject);
            }, 15000); // 15 seconds per server

            const peerConfig: any = {
                debug: 1, // Reduce debug noise
                host: server.host,
                port: server.port,
                path: server.path,
                secure: server.secure,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        { urls: 'stun:stun.services.mozilla.com:3478' }
                    ]
                }
            };

            this.peer = new Peer(peerConfig);

            let connected = false;

            this.peer.on('open', async (id) => {
                if (connected) return; // Prevent duplicate calls
                connected = true;
                console.log(`✅ Connected to ${server.host}! Peer ID:`, id);
                clearTimeout(initTimeout);
                this.myPeerId = id;
                this.currentServerIndex = serverIndex;

                if (this.isHost) {
                    try {
                        await this.registerHost(id);
                        console.log('✅ Host registered successfully');
                        resolve(id);
                    } catch (e) {
                        console.error('❌ Failed to register host:', e);
                        reject(e);
                    }
                } else {
                    console.log('🔍 Connecting to host...');
                    this.connectToHost().then(() => {
                        console.log('✅ Connected to host');
                        resolve(id);
                    }).catch(reject);
                }
            });

            this.peer.on('connection', (conn) => {
                console.log('📞 Incoming connection from:', conn.peer);
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('❌ Peer error:', err);
                clearTimeout(initTimeout);

                // Provide more helpful error messages
                if (err.type === 'peer-unavailable') {
                    console.log('⚠️ Peer unavailable - will retry');
                } else if (err.type === 'network') {
                    this.handler({ type: 'ERROR', error: 'Network error. Please check your internet connection and firewall settings.' });
                    reject(new Error('Network error connecting to PeerJS server'));
                } else if (err.type === 'server-error') {
                    this.handler({ type: 'ERROR', error: 'PeerJS server error. Please try again in a moment.' });
                    reject(new Error('PeerJS server error'));
                } else {
                    this.handler({ type: 'ERROR', error: err.type });
                }
            });

            this.peer.on('disconnected', () => {
                console.log('⚠️ Peer disconnected from server');
                if (!this.destroyed && this.peer) {
                    console.log('🔄 Attempting to reconnect...');
                    this.peer.reconnect();
                }
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
