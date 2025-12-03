export default function Leaderboard({ players }: { players: any[] }) {
  const sorted = [...players].sort((a,b)=> (b.totalPoints||0) - (a.totalPoints||0))
  return (
    <div className="bg-white rounded-xl p-3">
      <div className="text-sm font-medium mb-2">Leaderboard</div>
      <div className="space-y-2">
        {sorted.map((p:any, i:number)=> (
          <div key={p.id} className="flex justify-between">
            <div>{i+1}. {p.name}</div>
            <div className="font-semibold">{p.totalPoints}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
