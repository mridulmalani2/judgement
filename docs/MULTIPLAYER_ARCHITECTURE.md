# Multiplayer Architecture Documentation

## Overview

The Judgment game uses a **hybrid P2P + polling architecture** for multiplayer:
- **Primary**: PeerJS for low-latency P2P connections
- **Fallback**: Redis-backed polling for reliability when P2P fails

## Core Principle: Single Source of Truth

All game state flows through **one unified storage layer** (`lib/roomStore.ts`):
- **Production**: Uses Upstash Redis
- **Development**: Uses in-memory global maps

## Architecture Components

### 1. Storage Layer (`lib/roomStore.ts`)

This is the **single source of truth** for all state persistence.

**Functions:**
- `getGameState(roomCode)` - Get current GameState
- `setGameState(roomCode, state)` - Update GameState (auto-timestamps)
- `deleteGameState(roomCode)` - Delete a room
- `pushAction(roomCode, action, playerId)` - Queue an action
- `drainActions(roomCode)` - Get all pending actions (clears queue)

**Why?** Eliminates scattered `(global as any).ROOMS` patterns and ensures consistency.

### 2. Sync API (`pages/api/rooms/[code]/sync.ts`)

The **canonical endpoint** for all polling-based multiplayer.

**Methods:**
- `GET` - Retrieve current GameState
  - Returns 404 if room doesn't exist
  
- `POST` - Update GameState (host only by convention)
  - Accepts full GameState object
  - Automatically adds `lastUpdate` timestamp
  
- `PUT` - Send an action to the queue (non-hosts)
  - Body: `{ action: GameAction, playerId: string }`
  - Validates room exists before queuing
  
- `DELETE` - Drain pending actions (host only by convention)
  - Returns `{ actions: [...] }`
  - Clears the queue

### 3. P2P Layer (`lib/p2p.ts`)

Handles real-time peer-to-peer connections via PeerJS.

**P2PManager** handles:
- Connection to multiple PeerJS servers with fallback
- Host registration via `/api/signaling/[room]`
- Broadcasting state updates
- Relaying actions from non-hosts to host

**Message Types:**
- `STATE_UPDATE` - Full GameState broadcast (host → peers)
- `ACTION` - GameAction from non-host → host

### 4. Signaling API (`pages/api/signaling/[room].ts`)

Handles PeerJS signaling and host discovery.

**Stores:**
- Host peer IDs: `room:${code}:host` (Redis) or `ROOM_HOSTS` (in-memory)
- Generic signaling messages: `signals:${code}` queue

**Why separate?** Signaling is independent of game state. It only facilitates P2P connections.

### 5. Frontend (`pages/room/[code].tsx`)

**Connection Flow:**
1. Initialize P2PManager
2. If P2P succeeds → use P2P mode
3. If P2P fails/times out → switch to polling mode

**Host Behavior:**
- Owns canonical GameState in React state
- Processes actions via `processAction()`
- In P2P mode: broadcasts via `p2p.send({ type: 'STATE_UPDATE', state })`
- In polling mode: POSTs state to `/api/rooms/${code}/sync`
- Drains action queue periodically (polling mode only)

**Non-Host Behavior:**
- Sends actions via `sendAction()`
- In P2P mode: sends `{ type: 'ACTION', action }` to host
- In polling mode: PUTs action to `/api/rooms/${code}/sync`
- Receives state updates:
  - P2P mode: via P2P messages
  - Polling mode: via periodic GET from `/api/rooms/${code}/sync`

## Data Flow Diagrams

### Polling Mode (Redis Fallback)

#### Host Flow:
```
Host creates room
  ↓
Initialize GameState locally
  ↓
POST to /api/rooms/${code}/sync
  ↓
roomStore.setGameState() → Redis: room:${code}:state
  ↓
Poll loop every 500ms:
  - DELETE /api/rooms/${code}/sync → get pending actions
  - Process actions locally
  - POST updated state back
```

#### Non-Host Flow:
```
Non-host joins room
  ↓
sendAction({ type: 'JOIN', ... })
  ↓
PUT to /api/rooms/${code}/sync
  ↓
roomStore.pushAction() → Redis: room:${code}:actions
  ↓
Poll loop every 500ms:
  - GET /api/rooms/${code}/sync → get latest state
  - Update local GameState
```

### P2P Mode (Primary)

#### Host Flow:
```
Host creates room
  ↓
P2PManager.init() → registers with PeerJS
  ↓
POST to /api/signaling/${code} (register_host)
  ↓
Initialize GameState locally
  ↓
When peer connects:
  - Send initial state via p2p.sendTo(peerId, { type: 'STATE_UPDATE', state })
  ↓
When action received:
  - Process locally
  - Broadcast via p2p.send({ type: 'STATE_UPDATE', state })
```

#### Non-Host Flow:
```
Non-host joins room
  ↓
P2PManager.init() → connects to PeerJS
  ↓
GET /api/signaling/${code}?action=get_host → get host peer ID
  ↓
peer.connect(hostId)
  ↓
On connect → send { type: 'ACTION', action: JOIN }
  ↓
Send actions → p2p.send({ type: 'ACTION', action })
  ↓
Receive state → { type: 'STATE_UPDATE', state }
```

## Key Design Decisions

### 1. No Auth at API Level
The sync API doesn't enforce "host-only" for POST/DELETE. The frontend handles this.
**Why?** Simplifies the API. In a trusted environment (friends/family), this is acceptable.

### 2. Timestamps for Change Detection
Every state update gets a `lastUpdate` timestamp. This helps polling clients detect changes.

### 3. Action Queue (Polling Mode Only)
In P2P mode, actions go directly host → peer.
In polling mode, actions queue in Redis and the host drains them periodically.

### 4. TTL on Redis Keys
- State: 24 hours (86400s)
- Actions: 1 hour (3600s)
- Host registration: 1 hour (3600s)

**Why?** Auto-cleanup of abandoned rooms without manual intervention.

### 5. In-Memory Fallback
Without Redis, we use global objects. **This is unreliable on Vercel** (serverless functions don't share memory).
**Only use for local development!**

## What Was Removed

**Deleted Legacy Endpoints:**
- `pages/api/rooms/index.ts` - Old room creation with incompatible Room type
- `pages/api/rooms/[code].ts` - Generic room endpoint
- `pages/api/rooms/[code]/join.ts` - Legacy join (unused)
- `pages/api/rooms/[code]/bet.ts` - Direct bet mutation (unused)
- `pages/api/rooms/[code]/deal.ts` - Direct deal (unused)
- `pages/api/rooms/[code]/play.ts` - Direct play (unused)
- `pages/api/rooms/[code]/start.ts` - Direct start (unused)
- `pages/api/rooms/[code]/hand.ts` - Hand retrieval (unused)
- `pages/api/rooms/[code]/state.ts` - Duplicate of sync.ts with bugs

**Why?** These endpoints:
1. Were never called by the frontend
2. Used incompatible global ROOMS with wrong types
3. Would cause confusion and bugs

## Troubleshooting

### "Room not found" for non-hosts
**Cause:** Host hasn't created the room yet, or host failed to initialize.
**Fix:** Ensure host navigates to `/room/[code]?host=true` first.

### State not syncing in production
**Cause:** Redis credentials missing or incorrect.
**Fix:** Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars in Vercel.

### P2P connection fails
**Cause:** Firewall, network issues, or PeerJS server down.
**Fix:** The app automatically falls back to polling mode after 8 seconds.

### Actions not being processed
**Cause:** Host not polling, or actions queue not being drained.
**Fix:** Verify host is in polling mode and DELETE requests are being made.

## Testing Locally

### With Redis
```bash
# Set env vars in .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

npm run dev
```

### Without Redis (In-Memory)
```bash
# Don't set Redis env vars
npm run dev

# Note: State will reset between requests in serverless mode
# Only reliable with `next dev` locally
```

## Migration Notes

If you have existing rooms in the old `ROOMS` format, they are **incompatible** with the new GameState format. You'll need to:
1. Clear old Redis keys: `room:*:state` (if they exist)
2. Restart from fresh rooms

The new architecture enforces the `GameState` type from `lib/types.ts`.
