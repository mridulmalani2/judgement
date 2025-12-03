export class Autoplay {
  chooseOffTurnCard(hand:any[], leadSuit?:string) {
    if (!hand || hand.length === 0) return null
    const leadCards = hand.filter(h=>h.suit === leadSuit)
    if (leadCards.length > 0) {
      const ace = leadCards.find(c=>c.rank === 14)
      if (ace) return ace
      return leadCards.reduce((a,b)=> a.rank<b.rank ? a : b)
    }
    return hand.reduce((a,b)=> a.rank<b.rank ? a : b)
  }

  chooseOnTurnLead(hand:any[], trump?:string) {
    const nonTrump = hand.filter(h=>h.suit !== trump)
    if (nonTrump.length > 0) return nonTrump.reduce((a,b)=> a.rank<b.rank ? a : b)
    return hand.reduce((a,b)=> a.rank<b.rank ? a : b)
  }
}
