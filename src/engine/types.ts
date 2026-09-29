import type { EraId } from './eras'

export type Sex = 'M' | 'F'
export type Mode = 'uniform' | 'weighted'

export interface Sourced<T> {
  value: T
  sources: string[]
  /** 확률 각주 등 보조 설명 */
  note?: string
  /** 이 결과가 나올 확률 설명 (연한 글씨) */
  odds?: string
}

export interface Country {
  name: string
  region: string
  /** 현대 북한이면 true */
  north?: boolean
}

export interface SocialClass {
  id: string
  name: string
  desc: string
  /** 사망 위험 배수 */
  hazard: number
  /** 이름에 성씨를 쓰는지 */
  surname: boolean
  /** 문자를 아는 계층인지 (한자 이름) */
  literate: boolean
}

export interface Family {
  fatherJob: string
  siblingsBorn: number
  siblingsSurvived: number
  birthOrder: number
  married: boolean
  marriedAt?: number
  /** 이혼한 나이 */
  divorcedAt?: number
  /** 사별한 나이 */
  widowedAt?: number
  remarried: boolean
  childrenBorn: number
  childrenSurvived: number
}

export interface Death {
  age: number
  year: number
  cause: string
  /** 사건(전쟁·기근)으로 인한 사망이면 사건명 */
  event?: string
  /** 출산 관련 사망 */
  maternal?: boolean
}

export interface Life {
  seed: number
  mode: Mode
  /** 사용자가 연표에서 직접 고른 생년이면 값이 있음 */
  fixedYear?: number
  birthYear: number
  eraId: EraId
  eraName: string
  sex: Sex
  name: Sourced<string>
  country: Sourced<Country>
  socialClass: Sourced<SocialClass>
  occupation: Sourced<string>
  staple: Sourced<string>
  family: Sourced<Family>
  death: Sourced<Death | null>
  currentAge: number | null
  /** 이 시대 출생 비중 (출생아 가중 모드 기준) */
  eraShare: number
  /** 생년 추첨 확률 설명 */
  yearOdds?: string
  /** 시대 각주: 영아사망률, 15세 생존율 */
  mortalityNote: string
}
