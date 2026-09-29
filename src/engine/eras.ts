export type EraId =
  | 'paleo'
  | 'neo'
  | 'bronze'
  | 'samguk'
  | 'nambuk'
  | 'goryeo'
  | 'joseon1'
  | 'joseon2'
  | 'colonial'
  | 'modern'

export interface Era {
  id: EraId
  name: string
  /** 시작 연도 (포함). 음수는 기원전 */
  start: number
  /** 끝 연도 (미포함) */
  end: number
  sources: string[]
  /** 시대를 상징하는 빛깔 (돌·흙·청동·황토·금·청자·쪽·자주·재·백자) */
  tint: string
}

export const FIRST_YEAR = -40000
export const CURRENT_YEAR = 2026

export const ERAS: Era[] = [
  { id: 'paleo', name: '후기 구석기', start: -40000, end: -8000, sources: ['jeongok', 'paleo_demo'], tint: '#8a8275' },
  { id: 'neo', name: '신석기', start: -8000, end: -1500, sources: ['jeongok'], tint: '#a2714c' },
  { id: 'bronze', name: '청동기·고조선', start: -1500, end: -108, sources: ['encykorea', 'history_db'], tint: '#4f9583' },
  { id: 'samguk', name: '원삼국·삼국', start: -108, end: 668, sources: ['samguk_pop', 'history_db'], tint: '#b0563f' },
  { id: 'nambuk', name: '남북국 (통일신라·발해)', start: 668, end: 918, sources: ['history_db', 'encykorea'], tint: '#cfa243' },
  { id: 'goryeo', name: '고려', start: 918, end: 1392, sources: ['goryeo_pop', 'history_db'], tint: '#5fa598' },
  { id: 'joseon1', name: '조선 전기', start: 1392, end: 1592, sources: ['kwon_shin', 'yi_nobi'], tint: '#4468a6' },
  { id: 'joseon2', name: '조선 후기', start: 1592, end: 1897, sources: ['kwon_shin', 'yi_nobi', 'sillok'], tint: '#95527a' },
  { id: 'colonial', name: '대한제국·일제강점기', start: 1897, end: 1945, sources: ['chosen_sotokufu'], tint: '#7a746e' },
  { id: 'modern', name: '현대', start: 1945, end: CURRENT_YEAR + 1, sources: ['kosis_pop', 'un_wpp'], tint: '#9db4c4' },
]

export function eraOf(year: number): Era {
  for (const e of ERAS) if (year >= e.start && year < e.end) return e
  return ERAS[ERAS.length - 1]
}

export function formatYear(year: number): string {
  if (year <= -10000) {
    const ago = CURRENT_YEAR - year
    return `약 ${Math.round(ago / 1000).toLocaleString('ko-KR')}천 년 전`.replace(/(\d+)천/, (_, n) => {
      const k = Number(n)
      return k >= 10 ? `${(k / 10).toFixed(k % 10 === 0 ? 0 : 1)}만` : `${k}천`
    })
  }
  if (year === 0) return '기원전 1년'
  if (year < 0) return `기원전 ${-year}년`
  if (year < 1000) return `서기 ${year}년`
  return `${year}년`
}
