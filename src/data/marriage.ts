// 혼인·이혼·미혼: 통계청 혼인·이혼통계, 인구총조사 혼인상태, 조선 호적 연구
import type { Sex } from '../engine/types'

function interp(anchors: [number, number][], year: number): number {
  if (year <= anchors[0][0]) return anchors[0][1]
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i]
    if (year <= x1) {
      const [x0, y0] = anchors[i - 1]
      return y0 + ((year - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return anchors[anchors.length - 1][1]
}

/** 평균 초혼연령 (혼인 시점 연도 기준) */
const FIRST_MARRIAGE_F: [number, number][] = [
  [-40000, 17], [1896, 17], // 조선 호적 연구: 여 15~18
  [1930, 17.5], [1944, 18.5], // 국세조사
  [1955, 20.5], [1970, 23.3], [1980, 23.4], [1990, 24.8], [2000, 26.5], [2010, 28.9], [2020, 30.8], [2023, 31.5], [2026, 31.8],
]
const FIRST_MARRIAGE_M: [number, number][] = [
  [-40000, 20], [1896, 20],
  [1930, 21], [1944, 22],
  [1955, 24.5], [1970, 27.1], [1980, 26.4], [1990, 27.8], [2000, 29.3], [2010, 31.8], [2020, 33.2], [2023, 34.0], [2026, 34.2],
]
const FIRST_MARRIAGE_NORTH_F: [number, number][] = [[1945, 20], [1960, 22], [1990, 24], [2026, 25.5]]
const FIRST_MARRIAGE_NORTH_M: [number, number][] = [[1945, 24], [1960, 26], [1990, 27], [2026, 28.5]]

export function meanFirstMarriageAge(year: number, sex: Sex, north: boolean): number {
  if (north && year >= 1945) return interp(sex === 'F' ? FIRST_MARRIAGE_NORTH_F : FIRST_MARRIAGE_NORTH_M, year)
  return interp(sex === 'F' ? FIRST_MARRIAGE_F : FIRST_MARRIAGE_M, year)
}

/** 생애미혼율: 45~49세 시점 미혼 비율. 연도는 그 나이에 도달한 해 */
const NEVER_MARRIED_F: [number, number][] = [
  [-40000, 0.02], [1944, 0.02], [1970, 0.01], [1990, 0.009], [2000, 0.015], [2010, 0.028], [2015, 0.05], [2020, 0.076], [2035, 0.15], [2050, 0.22],
]
const NEVER_MARRIED_M: [number, number][] = [
  [-40000, 0.03], [1944, 0.03], [1970, 0.01], [1990, 0.011], [2000, 0.02], [2010, 0.058], [2015, 0.109], [2020, 0.168], [2035, 0.25], [2050, 0.32],
]
export function neverMarriedRate(yearAt45: number, sex: Sex, north: boolean): number {
  if (north && yearAt45 >= 1945) return 0.03
  return interp(sex === 'F' ? NEVER_MARRIED_F : NEVER_MARRIED_M, yearAt45)
}

/** 조이혼율 (인구 1000명당 연간 이혼 건수) */
const CRUDE_DIVORCE: [number, number][] = [
  [1910, 0.4], [1930, 0.5], [1944, 0.3], [1955, 0.3], [1970, 0.4], [1980, 0.6], [1990, 1.1], [1997, 2.0], [2003, 3.4], [2010, 2.5], [2020, 2.1], [2023, 1.8], [2026, 1.8],
]
/**
 * 부부 한 쌍의 연간 이혼 확률.
 * 조이혼율은 인구 1000명당이므로 1000명당 부부 수(약 240쌍)로 나눈다.
 * 전근대: 관의 허가가 필요했고 양반은 사실상 불가. 상민 이하는 드물게 '사정파의'.
 */
export function divorceHazard(year: number, north: boolean, elite: boolean): number {
  if (year < 1897) return elite ? 0 : 0.0008
  if (north && year >= 1945) return 0.4 / 240
  return interp(CRUDE_DIVORCE, year) / 240
}

/** 이혼·사별 후 재혼 확률 (남은 생애 동안) */
export function remarriageProb(year: number, sex: Sex, ageAt: number, elite: boolean, widowed: boolean): number {
  if (ageAt >= 55) return 0.05
  if (year < 1897) {
    if (sex === 'M') return 0.65 // 재취가 일반적
    return elite ? 0 : widowed ? 0.25 : 0.35 // 양반 여성은 재가 금지(경국대전)
  }
  if (year < 1945) return sex === 'M' ? 0.55 : 0.2
  return sex === 'M' ? 0.4 : 0.3
}
