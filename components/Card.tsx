export default function Card({ rank, suit }: { rank: number, suit: string }) {
  const rankLabel = rank === 14 ? 'A' : rank === 13 ? 'K' : rank === 12 ? 'Q' : rank === 11 ? 'J' : String(rank)
  const suitSymbol = suit === 'spades' ? '♠' : suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : '♣'
  const color = suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="flex flex-col items-center justify-center w-20 h-28">
      <div className={`text-xl font-semibold ${color}`}>{rankLabel}</div>
      <div className={`text-2xl ${color}`}>{suitSymbol}</div>
    </div>
  )
}
