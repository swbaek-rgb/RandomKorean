import { CURRENT_YEAR, FIRST_YEAR } from './eras'

/** 한반도 인구 추정 앵커 (년, 명). 로그 선형 보간. */
export const POP_ANCHORS: [number, number][] = [
  [-40000, 5000],
  [-20000, 8000],
  [-8000, 15000],
  [-3000, 60000],
  [-1500, 150000],
  [-500, 400000],
  [-108, 700000],
  [300, 1500000],
  [668, 2500000],
  [918, 2500000],
  [1100, 3000000],
  [1392, 5500000],
  [1500, 8000000],
  [1600, 11000000],
  [1700, 14000000],
  [1800, 18500000],
  [1897, 17000000],
  [1925, 19500000],
  [1944, 25900000],
  [1955, 30000000],
  [1970, 46000000],
  [1990, 63000000],
  [2010, 74000000],
  [2026, 77500000],
]

/** 조출생률 (인구 1000명당 연간 출생) 앵커 */
export const CBR_ANCHORS: [number, number][] = [
  [-40000, 42],
  [1392, 42],
  [1897, 42],
  [1925, 45],
  [1950, 40],
  [1960, 42],
  [1970, 30],
  [1983, 20],
  [1995, 15],
  [2005, 10],
  [2015, 8.5],
  [2026, 5.5],
]

function interp(anchors: [number, number][], year: number, log: boolean): number {
  if (year <= anchors[0][0]) return anchors[0][1]
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i]
    if (year <= x1) {
      const [x0, y0] = anchors[i - 1]
      const t = (year - x0) / (x1 - x0)
      if (log) return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)))
      return y0 + t * (y1 - y0)
    }
  }
  return anchors[anchors.length - 1][1]
}

export const population = (y: number) => interp(POP_ANCHORS, y, true)
export const crudeBirthRate = (y: number) => interp(CBR_ANCHORS, y, false)
export const birthsInYear = (y: number) => (population(y) * crudeBirthRate(y)) / 1000

/** 남한 합계출산율 (여성 1명당 자녀 수) */
const TFR_SOUTH: [number, number][] = [
  [-40000, 6.0],
  [1925, 6.2],
  [1960, 6.0],
  [1970, 4.5],
  [1983, 2.1],
  [1990, 1.57],
  [2000, 1.48],
  [2010, 1.23],
  [2018, 0.98],
  [2023, 0.72],
  [2026, 0.75],
]
const TFR_NORTH: [number, number][] = [
  [1945, 6.0],
  [1970, 4.0],
  [1990, 2.3],
  [2000, 2.0],
  [2026, 1.8],
]
export function tfr(year: number, north: boolean): number {
  return interp(north ? TFR_NORTH : TFR_SOUTH, year, false)
}

/** 누적 출생 가중치 배열: 출생아 가중 모드에서 연도 추첨에 사용 */
let cumulative: Float64Array | null = null
export function birthWeightedYear(u: number): number {
  const n = CURRENT_YEAR - FIRST_YEAR + 1
  if (!cumulative) {
    cumulative = new Float64Array(n)
    let acc = 0
    for (let i = 0; i < n; i++) {
      acc += birthsInYear(FIRST_YEAR + i)
      cumulative[i] = acc
    }
  }
  const target = u * cumulative[n - 1]
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cumulative[mid] < target) lo = mid + 1
    else hi = mid
  }
  return FIRST_YEAR + lo
}

/** 시대별 출생 비중 (안내 문구용) */
export function eraBirthShare(start: number, end: number): number {
  let part = 0
  let total = 0
  for (let y = FIRST_YEAR; y <= CURRENT_YEAR; y++) {
    const b = birthsInYear(y)
    total += b
    if (y >= start && y < end) part += b
  }
  return part / total
}
