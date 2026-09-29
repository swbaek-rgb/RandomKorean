/**
 * 지역 스냅숏: 특정 시점의 행정구역 목록과 호구(또는 인구·출생아) 가중치.
 * 표시 규칙: 당시 지명 + (지금의 대표 지역). 옛 경계를 현재 경계로 쪼개지 않는다.
 */
export type WeightUnit = '호' | '구' | '인구' | '출생아'

export interface RegionRow {
  /** 상위 행정구역 (도·부). 당시 명칭 */
  province: string
  /** 당시 군현·시군구 이름. 현대 자료는 현재 이름 그대로 */
  name: string
  /** 가중치 (호·구·인구·출생아 수). 0 이상 */
  weight: number
  /** 지금의 대표 지역 한 줄. 현대 자료는 비워 둔다 */
  now?: string
}

export interface RegionSnapshot {
  /** 자료 시점 */
  year: number
  /** 이 스냅숏을 적용할 출생 연도 범위 (포함) */
  from: number
  to: number
  /** 남한·북한 구분. 1945년 이전 자료는 undefined (한반도 전체) */
  side?: 'south' | 'north'
  /** 출처 레지스트리 id */
  source: string
  unit: WeightUnit
  /** 자료 설명 (배지 옆 각주) */
  note?: string
  rows: RegionRow[]
}
