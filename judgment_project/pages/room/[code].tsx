import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import { v4 as uuidv4 } from "uuid"
import LanguageToggle from "../../components/LanguageToggle"
import CardView from "../../components/Card"
import PlayerSeat from "../../components/PlayerSeat"
import BetInput from "../../components/BetInput"
import Leaderboard from "../../components/Leaderboard"
import { createDeck, shuffleDeck, cardId } from "../../lib/deck"
import { computeCardsPerPlayer, trumpForRound } from "../../lib/gameEngine"
import { Autoplay } from "../../lib/autoplay"

type PlayerState = {
  id: string
  name: string
  seatIndex: number
  isHost?: boolean
  isAway?: boolean
  connected?: boolean
  currentBet?: number | null
  tricksWonThisRound: number
  totalPoints: number
  handCount: number
}

type LocalState = {
  hand: Array<{ id: string, rank: number, suit: string }>
}

const POLL_MS = 600

export default function RoomPage() {
  const router = useRouter()
  const { code } = router.query as { code?: string }
  const urlName = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('name') : null
  const hostFlag = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('host') : null

  const [localId] = useState(()=>uuidv4())
  const [name] = useState(urlName || `Player${localId.slice(0,4)}`)
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [isHost, setIsHost] = useState(!!hostFlag)
  const [started, setStarted] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [cardsPerPlayer, setCardsPerPlayer] = useState<number | null>(null)
  const [dealerSeatIndex, setDealerSeatIndex] = useState<number>(0)
  const [trump, setTrump] = useState<string>('spades')
  const [phase, setPhase] = useState<'lobby'|'betting'|'playing'|'scoring'|'finished'>('lobby')
  const [localHand, setLocalHand] = useState<Array<any>>([])
  const [leadSeat, setLeadSeat] = useState<number | null>(null)
  const [currentTrick, setCurrentTrick] = useState<{ seatIndex:number, cardId:string }[]>([])
  const [messages, setMessages] = useState<string[]>([])
  const pollingRef = useRef<number | null>(null)
  const hostStateRef = useRef<any>(null)
  const autoplayRef = useRef(new Autoplay())

  useEffect(()=> {
    if (!code) return
    joinRoom()
    pollingRef.current = window.setInterval(pollRoom, POLL_MS)
    return ()=> { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [code])

  async function joinRoom() {
    if (!code) return
    await fetch(`/api/rooms/${code}/join`, {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ id: localId, name })
    })
    pollRoom()
  }

  async function pollRoom(){
    if (!code) return
    try {
      const res = await fetch(`/api/rooms/${code}`)
      if (res.status === 404) return
      const data = await res.json()
      setPlayers(data.players.map((p:any)=>({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        isHost: p.id === data.hostId,
        isAway: p.isAway || false,
        connected: true,
        currentBet: p.currentBet ?? null,
        tricksWonThisRound: p.tricksWonThisRound ?? 0,
        totalPoints: p.totalPoints ?? 0,
        handCount: p.handCount ?? 0
      })))
      setIsHost(data.hostId === localId)
      setStarted(data.started)
      setPhase(data.phase)
      setDealerSeatIndex(data.dealerSeatIndex ?? 0)
      setRoundIndex(data.roundIndex ?? 0)
      setTrump(data.trump ?? trumpForRound(data.roundIndex ?? 0))
      setCardsPerPlayer(data.cardsPerPlayer ?? null)
      hostStateRef.current = data
      if (isHost && data.started && (!data.handsDealt)) {
        await hostDealRound()
      }
    } catch (e) { console.error(e) }
  }

  async function hostDealRound(){
    if (!code) return
    const res = await fetch(`/api/rooms/${code}/deal`, { method: 'POST' })
    const data = await res.json()
    setTimeout(()=>pollRoom(), 300)
  }

  async function startGame() {
    if (!code) return
    await fetch(`/api/rooms/${code}/start`, { method: 'POST' })
    setStarted(true)
  }

  async function requestHandFromHost() {
    const res = await fetch(`/api/rooms/${code}/hand?id=${localId}`)
    if (res.status===200) {
      const data = await res.json()
      setLocalHand(data.hand || [])
    }
  }

  useEffect(()=> {
    if (phase === 'playing') {
      if (leadSeat === null) {
        setLeadSeat((dealerSeatIndex + 1) % Math.max(1, players.length))
      }
    }
  }, [phase, dealerSeatIndex, players])

  async function playCard(cardIdStr: string) {
    if (!code) return
    await fetch(`/api/rooms/${code}/play`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({ playerId: localId, cardId: cardIdStr })
    })
    setLocalHand(prev => prev.filter(c=>c.id !== cardIdStr))
  }

  async function submitBet(n: number) {
    if (!code) return
    await fetch(`/api/rooms/${code}/bet`, {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ playerId: localId, bet: n })
    })
  }

  async function toggleAwayFor(playerId: string) {
    await fetch(`/api/rooms/${code}/away`, {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ playerId })
    })
  }

  return (
    <div className="min-h-screen bg-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm text-gray-700">Room: <strong>{code}</strong></div>
            <div className="text-sm text-gray-600">Round {roundIndex + 1} • {cardsPerPlayer ?? "-"} cards • Trump: <strong>{trump}</strong></div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {isHost && <button onClick={startGame} className="px-3 py-2 bg-periwinkle text-white rounded-xl">Start</button>}
            <button onClick={() => navigator.share?.({ title: 'Judgment', url: window.location.href })} className="px-3 py-2 rounded-lg border">Share</button>
          </div>
        </div>

        <div className="bg-green-200 rounded-2xl p-6">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({length:5}).map((_,i)=> {
              const player = players[i]
              return <div key={i} className="bg-white rounded-xl p-3 shadow">
                {player ? (
                  <PlayerSeat
                    name={player.name}
                    isLocal={player.id === localId}
                    isHost={player.isHost}
                    isDealer={dealerSeatIndex === player.seatIndex}
                    bet={player.currentBet ?? null}
                    tricks={player.tricksWonThisRound}
                    points={player.totalPoints}
                    onMarkAway={() => toggleAwayFor(player.id)}
                  />
                ) : (
                  <div className="text-gray-400">Empty seat</div>
                )}
              </div>
            })}
          </div>

          <div className="mt-6 bg-white rounded-xl p-4 shadow">
            <div className="mb-3">Table (center) — current trick</div>
            <div className="min-h-[120px] border rounded-lg p-3">
              <div className="flex gap-4">
                {currentTrick.map((t, idx)=> <div key={idx} className="p-2 border rounded">{t.cardId}</div>)}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600">Your hand</div>
              <div className="flex gap-2 mt-2 overflow-auto">
                {localHand.length === 0 && <div className="text-gray-500">No cards yet</div>}
                {localHand.map((c:any)=> (
                  <button key={c.id} onClick={()=>playCard(c.id)} className="min-w-[72px] p-3 rounded-lg border bg-white">
                    <CardView rank={c.rank} suit={c.suit} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-3">
                <BetInput max={cardsPerPlayer ?? 0} onSubmit={submitBet} />
                <button onClick={() => requestHandFromHost()} className="px-3 py-2 rounded-lg border">Request Hand</button>
                {isHost && <button onClick={()=>fetch(`/api/rooms/${code}/end`,{method:'POST'})} className="px-3 py-2 rounded-lg bg-red-500 text-white">End Game</button>}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Leaderboard players={players} />
          </div>
        </div>

      </div>
    </div>
  )
}
