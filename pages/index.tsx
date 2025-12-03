import Head from "next/head"
import { useRouter } from "next/router"
import { v4 as uuidv4 } from "uuid"
import { useState } from "react"
import LanguageToggle from "../components/LanguageToggle"

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [seats, setSeats] = useState(5)
  const [roomCode, setRoomCode] = useState("")
  const [creating, setCreating] = useState(false)

  async function createRoom() {
    if (!name.trim()) return alert("Enter your name")
    setCreating(true)
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hostName: name, maxPlayers: seats })
    })
    const data = await res.json()
    setCreating(false)
    router.push(`/room/${data.roomCode}?name=${encodeURIComponent(name)}&host=1`)
  }

  function joinRoom() {
    if (!roomCode.trim()) return alert("Enter room code")
    router.push(`/room/${roomCode}?name=${encodeURIComponent(name)}`)
  }

  return (
    <div className="min-h-screen bg-uiBg text-gray-900 p-6">
      <Head>
        <title>Judgment</title>
      </Head>

      <header className="max-w-3xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-semibold">Judgment</h1>
          <LanguageToggle />
        </div>
        <p className="mt-2 text-sm text-gray-600">A family trick-taking card game — accessible & elegant</p>
      </header>

      <main className="max-w-3xl mx-auto space-y-6">
        <section className="bg-white shadow rounded-xl p-6">
          <label className="block text-sm font-medium mb-2">Your name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full p-3 rounded-lg border" placeholder="Type your name"/>
          <div className="flex gap-4 mt-4">
            <div>
              <label className="block text-sm">Seats</label>
              <select value={seats} onChange={e=>setSeats(Number(e.target.value))} className="p-2 rounded border">
                {Array.from({length:9}).map((_,i)=><option key={i} value={i+2}>{i+2} players</option>)}
              </select>
            </div>
            <div className="flex-1"></div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={createRoom} disabled={creating} className="bg-periwinkle text-white px-5 py-3 rounded-2xl shadow">
              {creating ? "Creating..." : "Create game"}
            </button>
            <button onClick={()=>{ }} className="px-4 py-3 rounded-xl border">How it works</button>
          </div>
        </section>

        <section className="bg-white shadow rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">Join a game</h2>
          <div className="flex gap-2">
            <input value={roomCode} onChange={e=>setRoomCode(e.target.value)} className="p-3 rounded-lg border flex-1" placeholder="Room code (e.g. 123)"/>
            <button onClick={joinRoom} className="px-4 py-3 bg-gray-800 text-white rounded-xl">Join</button>
          </div>
          <p className="mt-3 text-sm text-gray-600">Share the 3-digit room code with family to join quickly.</p>
        </section>

        <section className="text-sm text-gray-600">
          <strong>Accessibility:</strong> Large fonts, high-contrast UI, Hindi support, simple flows — made for grandparents but polished for everyone.
        </section>
      </main>
    </div>
  )
}
