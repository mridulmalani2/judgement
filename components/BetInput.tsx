import { useState } from "react"

export default function BetInput({ max=0, onSubmit }: { max:number, onSubmit: (n:number)=>void }) {
  const [val, setVal] = useState(0)
  return (
    <div className="flex items-center gap-2">
      <div className="text-sm">Bet</div>
      <input type="number" min={0} max={max} value={val} onChange={e=>setVal(Number(e.target.value))} className="w-20 p-2 border rounded" />
      <button onClick={()=>onSubmit(val)} className="px-3 py-2 bg-blue-600 text-white rounded">Lock Bet</button>
    </div>
  )
}
