/** 받침 유무에 따른 조사 선택 */
function hasBatchim(word: string): boolean {
  const s = word.replace(/[^가-힣]+$/g, '')
  const ch = s.charCodeAt(s.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false
  return (ch - 0xac00) % 28 !== 0
}
export const eul = (w: string) => (hasBatchim(w) ? '을' : '를')
export const euro = (w: string) => {
  const s = w.replace(/[^가-힣]+$/g, '')
  const ch = s.charCodeAt(s.length - 1)
  const jong = ch >= 0xac00 && ch <= 0xd7a3 ? (ch - 0xac00) % 28 : 0
  return jong === 0 || jong === 8 ? '로' : '으로'
}
export const eun = (w: string) => (hasBatchim(w) ? '은' : '는')
export const i_ga = (w: string) => (hasBatchim(w) ? '이' : '가')
