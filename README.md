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

3.  **Deploy to Vercel**:
    - Push this code to a GitHub repository.
    - Import the repository in Vercel.
    - Deploy! (No environment variables needed).

## Game Rules
- **Objective**: Predict how many tricks you will win.
- **Dealing**: Cards dealt decreases by 1 each round (e.g., 10, 9, 8...).
- **Trump**: Spades -> Hearts -> Diamonds -> Clubs (Rotates).
- **Betting**: Players bet sequentially. The last player cannot bet a number that makes the total bets equal the total tricks.
- **Scoring**: 
    - Exact prediction: `(Bet + 1) * 10 + Bet`
    - Incorrect: `0`

## Troubleshooting
- **Connection Issues**: If players can't connect, ensure you are not on a restrictive firewall (WebRTC requires UDP).
- **State Sync**: If state gets out of sync, refresh the page to reconnect to the host.
