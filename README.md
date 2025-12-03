# Judgment Card Game

A multiplayer trick-taking card game built for family fun.

## Features
- **Multiplayer**: Play with 2-10 players.
- **Host Authoritative**: One player hosts, others join.
- **WebRTC Mesh**: Low-latency peer-to-peer gameplay.
- **Accessibility**: High contrast, large text, and clear UI.
- **Responsive**: Works on tablets and desktops.

## Tech Stack
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Networking**: WebRTC (SimplePeer) + Vercel Serverless (Signaling)

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.
    To test multiplayer locally, open multiple browser windows (Incognito helps).

3.  **Deploy for Online Multiplayer**:

    For reliable online multiplayer, you need to set up Redis for persistent signaling:

    ### Step 1: Set up Upstash Redis (Free)
    1. Sign up at [https://upstash.com/](https://upstash.com/)
    2. Create a new Redis database (select the free tier)
    3. Copy your REST API credentials:
       - `UPSTASH_REDIS_REST_URL`
       - `UPSTASH_REDIS_REST_TOKEN`

    ### Step 2: Deploy to Vercel
    1. Push this code to a GitHub repository
    2. Import the repository in [Vercel](https://vercel.com)
    3. Add environment variables in Vercel dashboard:
       - Go to your project → Settings → Environment Variables
       - Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
    4. Deploy!

    ### Step 3: Test Your Deployment
    - Share your Vercel URL with friends
    - Create a game and share the 3-digit room code
    - Players should be able to connect from different networks

    **Note**: The app will work without Redis (using in-memory storage) but online multiplayer may be unreliable due to serverless cold starts. Redis ensures signals persist between function invocations.

## Game Rules
- **Objective**: Predict how many tricks you will win.
- **Dealing**: Cards dealt decreases by 1 each round (e.g., 10, 9, 8...).
- **Trump**: Spades -> Hearts -> Diamonds -> Clubs (Rotates).
- **Betting**: Players bet sequentially. The last player cannot bet a number that makes the total bets equal the total tricks.
- **Scoring**: 
    - Exact prediction: `(Bet + 1) * 10 + Bet`
    - Incorrect: `0`

## Architecture

### Multiplayer Implementation
- **P2P WebRTC**: Direct peer-to-peer connections for low-latency gameplay
- **Host-Authoritative**: Game host's browser runs all game logic and validates moves
- **Mesh Network**: Players connect directly to each other after initial signaling
- **Persistent Signaling**: Upstash Redis stores WebRTC signaling messages across serverless cold starts
- **STUN Servers**: Multiple public STUN servers for reliable NAT traversal

### Why This Architecture?
- ✅ **Free**: No server costs for 5 players once a week
- ✅ **Low Latency**: P2P connections are faster than server relay
- ✅ **Scalable**: Works for 2-10 players without infrastructure changes
- ✅ **Reliable**: Redis ensures signaling works across serverless deployments

## Troubleshooting
- **Connection Issues**: If players can't connect, ensure you are not on a restrictive firewall (WebRTC requires UDP). Try from different networks.
- **State Sync**: If state gets out of sync, refresh the page to reconnect to the host.
- **Cold Start Issues**: If using in-memory signaling (no Redis), the first player to join after a period of inactivity may experience delays. Redis eliminates this.
- **Firewall/NAT**: Some corporate networks block WebRTC. Try from home networks or mobile data.
