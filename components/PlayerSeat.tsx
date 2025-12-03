export default function PlayerSeat({ name, isLocal, isHost, isDealer, bet, tricks, points, onMarkAway }:
  { name: string, isLocal?: boolean, isHost?: boolean, isDealer?: boolean, bet?: number|null, tricks:number, points:number, onMarkAway?: ()=>void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-lg font-medium">{name}{isLocal ? ' (You)' : ''}</div>
        <div className="text-sm text-gray-600">{isHost ? 'Host' : isDealer ? 'Dealer' : ''}</div>
      </div>
      <div className="text-right">
        <div className="text-sm">Bet: <strong>{bet ?? '-'}</strong></div>
        <div className="text-sm">Tricks: <strong>{tricks}</strong></div>
        <div className="text-sm">Pts: <strong>{points}</strong></div>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={onMarkAway} className="px-2 py-1 text-xs rounded border">Away</button>
      </div>
    </div>
  )
}
