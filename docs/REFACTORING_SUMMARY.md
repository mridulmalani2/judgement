# Refactoring Summary & Migration Guide

## What Changed

### ✅ Added
1. **`lib/roomStore.ts`** - Unified storage abstraction for Redis/in-memory
2. **`docs/MULTIPLAYER_ARCHITECTURE.md`** - Comprehensive architecture documentation
3. **`tests/roomStore.test.ts`** - Basic test suite for the storage layer

### 🔄 Updated
1. **`pages/api/rooms/[code]/sync.ts`** - Rewritten to use roomStore helpers
2. **`pages/room/[code].tsx`** - Added better error handling for non-existent rooms

### ❌ Removed (Legacy/Unused Endpoints)
1. `pages/api/rooms/index.ts` - Old room creation with incompatible types
2. `pages/api/rooms/[code].ts` - Generic room endpoint
3. `pages/api/rooms/[code]/join.ts` - Direct join mutation
4. `pages/api/rooms/[code]/bet.ts` - Direct bet mutation
5. `pages/api/rooms/[code]/deal.ts` - Direct deal mutation
6. `pages/api/rooms/[code]/play.ts` - Direct play mutation
7. `pages/api/rooms/[code]/start.ts` - Direct start mutation
8. `pages/api/rooms/[code]/hand.ts` - Hand retrieval
9. `pages/api/rooms/[code]/state.ts` - Duplicate of sync.ts (had bugs)

### ✓ Kept Unchanged
1. **`pages/api/rooms.ts`** - Simple room code generator (still works fine)
2. **`pages/api/signaling/[room].ts`** - PeerJS signaling (independent system)
3. **`lib/p2p.ts`** - PeerJS manager (works as intended)
4. **`lib/useMultiplayerSync.ts`** - Polling hook (still valid pattern)
5. **`lib/types.ts`** - Game state types (authoritative)

## Architecture Before vs After

### Before (Broken)
```
Frontend (pages/room/[code].tsx)
  ↓
Calls: /api/rooms/${code}/sync ← Actually used
  ↓
Uses: (global as any).ROOMS ← Unreliable on Vercel
  ↓
BUT ALSO:
  - /api/rooms/index.ts with different ROOMS
  - /api/rooms/[code]/join.ts with different ROOMS
  - /api/rooms/[code]/state.ts duplicating sync.ts
  - All mutating separate global objects
  - Different Room types causing conflicts
  ❌ Result: State corruption, rooms not found
```

### After (Fixed)
```
Frontend (pages/room/[code].tsx)
  ↓
Calls: /api/rooms/${code}/sync ← Single endpoint
  ↓
Uses: lib/roomStore.ts ← Centralized
  ↓
Stores in:
  - Production: Redis (room:${code}:state)
  - Dev: Global ROOMS (single instance)
  ✓ Result: One source of truth
```

## Key Improvements

### 1. Single Source of Truth
**Before:** Multiple `(global as any).ROOMS` definitions across files
**After:** One `lib/roomStore.ts` that all endpoints use

### 2. Type Safety
**Before:** Legacy endpoints used incompatible `Room` type
**After:** All endpoints use canonical `GameState` from `lib/types.ts`

### 3. Cleaner Codebase
**Before:** 9 unused legacy endpoints causing confusion
**After:** Only the endpoints actually used by the frontend

### 4. Better Error Handling
**Before:** Silent failures when rooms don't exist
**After:** Clear error messages for non-hosts joining non-existent rooms

### 5. Testability
**Before:** Hard to test, scattered logic
**After:** Clean helpers in roomStore.ts with dedicated test suite

## Breaking Changes

### For Developers
- **Import Change:** If you were directly importing/using the old endpoints, they're gone
  - Use `lib/roomStore.ts` helpers instead
  - Or call `/api/rooms/[code]/sync` directly

### For Users
- **No Breaking Changes:** The frontend still works the same way
- Existing rooms in Redis with old format will be incompatible (need to create new rooms)

## Deployment Checklist

### Environment Variables (Vercel)
Ensure these are set for production:
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### For Local Development
```bash
# Option 1: With Redis (recommended)
# Copy .env.local.example to .env.local and add Redis credentials

# Option 2: Without Redis (in-memory)
# Just run npm run dev
# State will reset between serverless invocations
```

## Testing the Fix

### Manual Test Flow
1. **Create Room (Host):**
   - Navigate to `/`
   - Enter name, create room
   - Should redirect to `/room/[code]?host=true`
   - GameState should initialize

2. **Join Room (Non-Host):**
   - Open in new tab/incognito
   - Navigate to `/`
   - Enter name, enter room code
   - Should redirect to `/room/[code]`
   - Should see host's name in lobby

3. **Verify Sync:**
   - Host starts game
   - Non-host should see game start
   - Non-host places bet
   - Host should see bet appear

### Check Redis (Production)
```bash
# Using Upstash CLI or Redis CLI
GET room:123:state
# Should return GameState JSON

LRANGE room:123:actions 0 -1
# Should show pending actions
```

### Check Logs (Vercel)
```
✅ Good signs:
- "✅ P2P connected successfully!" OR "🔄 Starting polling mode..."
- No "Room not found" for hosts
- State syncing between players

❌ Bad signs:
- "Failed to register host" repeatedly
- "Room not found" for host
- Actions not being processed
```

## Rollback Plan

If something goes wrong:

1. **Revert the refactor:**
   ```bash
   git revert <commit-hash>
   ```

2. **Or restore specific files from git history:**
   ```bash
   git checkout <previous-commit> -- pages/api/rooms
   ```

## Future Improvements

### Recommended Next Steps
1. **Add Authentication:** Verify host identity for POST/DELETE on sync endpoint
2. **Rate Limiting:** Prevent action spam from malicious clients
3. **Better State Validation:** Add schema validation on GameState
4. **Monitoring:** Add logging/metrics for room creation, join, sync
5. **WebSocket Support:** Upgrade from polling to WebSocket for even lower latency

### Optional Enhancements
- Add room expiry notifications
- Implement reconnection logic for disconnected players
- Add spectator mode (settings.allowSpectators is defined but not fully implemented)
- Add replay/game history features

## Questions?

If you encounter issues:
1. Check `docs/MULTIPLAYER_ARCHITECTURE.md` for detailed flow diagrams
2. Review logs in Vercel dashboard
3. Verify Redis connectivity with Upstash dashboard
4. Test locally with `npm run dev` first

## Summary

This refactor **consolidates two competing architectures** into one coherent system:
- ✅ Single source of truth (roomStore.ts)
- ✅ One sync endpoint (sync.ts)
- ✅ Clean separation of concerns (P2P vs polling)
- ✅ Type-safe and testable
- ✅ Production-ready with Redis

The app should now be **stable and reliable** for multiplayer gameplay on Vercel.
