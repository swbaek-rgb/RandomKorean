// 출산당 산모 사망률(MMR)과 자연 출산력 연령 곡선.
// 근거: 김두얼(2012) 행장류 양반 여성 출생 838건 중 출산 관련 사망 25건(≈3.0%), 조선 왕비 3.7%,
//       유럽 1650~1800년 약 1.0%(Loudon). 계급별 영양 상태 차이를 반영해 양반을 낮게, 상민·노비를 높게 둔다.
import type { EraId } from '../engine/eras'
import type { SocialClass } from '../engine/types'

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

const MODERN_SOUTH: [number, number][] = [[1897, 0.01], [1944, 0.01], [1955, 0.004], [1970, 0.001], [1990, 0.0002], [2020, 0.00011], [2026, 0.0001]]
const MODERN_NORTH: [number, number][] = [[1945, 0.004], [1970, 0.001], [1990, 0.0005], [2020, 0.0009], [2026, 0.0009]]

/** 출산 1회당 산모 사망 확률 */
export function maternalMortalityPerBirth(year: number, era: EraId, cls: SocialClass, north: boolean): number {
  if (year >= 1897) return interp(north && year >= 1945 ? MODERN_NORTH : MODERN_SOUTH, year)
  if (era === 'joseon1' || era === 'joseon2') {
    switch (cls.id) {
      case 'yangban': return 0.02
      case 'jungin': return 0.0225
      case 'nobi': return 0.03
      default: return 0.025 // 상민
    }
  }
  // 삼국·고려와 그 이전: 2.5~3.0%. 지배층 2.5, 일반민 2.75, 예속민 3.0
  if (cls.hazard < 0.9) return 0.025
  if (cls.hazard > 1) return 0.03
  return 0.0275
}

/** Coale-Trussell 자연 출산력 연령 곡선 (혼인 여성, 연간 출산율) */
const NATURAL_FERTILITY: [number, number][] = [[15, 0.3], [20, 0.46], [25, 0.431], [30, 0.395], [35, 0.322], [40, 0.167], [45, 0.024], [50, 0]]
export function naturalFertility(age: number): number {
  if (age < 15 || age >= 50) return 0
  for (let i = 1; i < NATURAL_FERTILITY.length; i++) {
    if (age < NATURAL_FERTILITY[i][0]) return NATURAL_FERTILITY[i - 1][1]
  }
  return 0
}

/**
 * 혼인 여성이 그 해에 출산할 확률.
 * 자연 출산력 곡선을 "기준 초혼 연령부터 49세까지의 합 = 그 해 합계출산율" 이 되도록 비례 조정한다.
 * 늦게 혼인하면 출산 기회가 줄고, 곡선 뒤쪽 나이는 출산율이 낮다.
 */
export function birthProbability(age: number, tfr: number, referenceMarriageAge: number): number {
  let sum = 0
  for (let a = Math.round(referenceMarriageAge); a < 50; a++) sum += naturalFertility(a)
  if (sum <= 0) return 0
  return Math.min(0.95, naturalFertility(age) * (tfr / sum))
}
