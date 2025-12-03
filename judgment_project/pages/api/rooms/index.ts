import { NextApiRequest, NextApiResponse } from "next"

type Room = {
  roomCode: string
  hostId: string
  hostName: string
  maxPlayers: number
  players: any[]
  started?: boolean
  handsDealt?: boolean
  phase?: string
  dealerSeatIndex?: number
  roundIndex?: number
  cardsPerPlayer?: number
  trump?: string
}

const ROOMS: Record<string, Room> = (global as any).ROOMS || {}
;(global as any).ROOMS = ROOMS

function gen3digit() {
  return Math.floor(100 + Math.random()*900).toString()
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { hostName, maxPlayers } = req.body
  const roomCode = (()=>{ let c; do { c = gen3digit() } while (ROOMS[c]) ; return c })()
  const hostId = 'host-' + Math.random().toString(36).slice(2,9)
  ROOMS[roomCode] = {
    roomCode,
    hostId,
    hostName,
    maxPlayers: maxPlayers || 5,
    players: [{
      id: hostId,
      name: hostName,
      seatIndex: 0,
      isHost: true,
      isAway: false,
      currentBet: null,
      tricksWonThisRound: 0,
      totalPoints: 0,
      handCount: 0
    }],
    started: false,
    handsDealt: false,
    phase: 'lobby',
    dealerSeatIndex: 0,
    roundIndex: 0
  }
  res.json({ roomCode })
}
