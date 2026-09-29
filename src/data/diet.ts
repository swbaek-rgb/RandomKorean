// 현대 남한 성장기 식단. 손으로 적은 인상이 아니라 아래 세 조사의 수치로 문구와 각주를 만든다.
//  - 국민건강영양조사 DT_11702_N021 (식품군별 1일 섭취량, 1세 이상, 1969~2024), DT_11702_N043 (하루 1회 이상 외식률, 2008~2024)
//  - 양곡소비량조사 DT_1ED0001 (1인당 연간 양곡 소비량, 1965~2024)
//  - 가계동향조사 DT_1L9H006 (소득 5분위별 가구당 가계수지, 2003~2016)
import type { SocialClass } from '../engine/types'
import type { Rng } from '../engine/rng'

interface Period {
  from: number
  /** 1인 하루 섭취량 g (국민건강영양조사, 해당 기간 평균) */
  grain: number
  meat: number
  fruit: number
  milk: number
  beverage?: number
  /** 1인당 연간 소비 kg (양곡소비량조사) */
  riceKg: number
  barleyKg: number
  /** 6~11세 하루 1회 이상 외식률 % (2008년 이후) */
  eatOutChild?: number
  /** 소득 1분위 대비 5분위 가구의 육류·과일·식사비 지출 배수 (가계동향조사) */
  gap?: { meat: number; fruit: number; dining: number; year: number }
}

const PERIODS: Period[] = [
  { from: 1965, grain: 500, meat: 12, fruit: 35, milk: 5, riceKg: 130, barleyKg: 40 },
  { from: 1980, grain: 420, meat: 30, fruit: 60, milk: 35, riceKg: 128, barleyKg: 8 },
  { from: 1990, grain: 330, meat: 55, fruit: 120, milk: 58, riceKg: 110, barleyKg: 1.5 },
  { from: 2000, grain: 300, meat: 90, fruit: 170, milk: 90, beverage: 60, riceKg: 85, barleyKg: 1.4, eatOutChild: 16, gap: { meat: 2.0, fruit: 2.1, dining: 3.5, year: 2003 } },
  { from: 2010, grain: 295, meat: 110, fruit: 175, milk: 105, beverage: 150, riceKg: 68, barleyKg: 1.3, eatOutChild: 33, gap: { meat: 1.9, fruit: 2.1, dining: 4.2, year: 2016 } },
  { from: 2020, grain: 255, meat: 118, fruit: 130, milk: 102, beverage: 245, riceKg: 57, barleyKg: 1.5, eatOutChild: 35, gap: { meat: 1.9, fruit: 2.1, dining: 4.2, year: 2016 } },
]

function periodFor(year: number): Period {
  let p = PERIODS[0]
  for (const q of PERIODS) if (year >= q.from) p = q
  return p
}

export interface DietPick {
  food: string
  note: string
  sources: string[]
}

/**
 * 성장기(출생 후 8년 무렵) 연도와 소득분위로 식단 문구를 정한다.
 * 문구에는 숫자를 넣지 않고, 각주에 조사 수치를 적는다.
 */
export function modernSouthDiet(rng: Rng, growYear: number, cls: SocialClass): DietPick {
  const p = periodFor(growYear)
  const high = cls.id === 'q5' || cls.id === 'q4'
  const low = cls.id === 'q1' || cls.id === 'q2'
  const sources = ['knhanes', 'kosis_food']
  let food: string
  const notes: string[] = []

  if (p.from < 1980) {
    // 곡류 하루 500g, 보리가 쌀의 3분의 1: 혼식 시대
    food = high ? rng.pick(['쌀밥과 김치, 생선', '쌀밥과 김치·된장국']) : rng.pick(['쌀·보리 혼식과 김치', '쌀·보리 혼식과 김치·된장국'])
    notes.push(`국민건강영양조사 1970년대: 1인 하루 곡류 약 ${p.grain}g, 고기 ${p.meat}g, 우유 ${p.milk}g`)
    notes.push(`양곡소비량조사 1970년: 1인당 쌀 136kg·보리 37kg`)
  } else if (p.from < 1990) {
    food = high ? rng.pick(['쌀밥과 김치, 고기·달걀 반찬', '쌀밥과 김치, 생선·우유']) : rng.pick(['쌀밥과 김치, 생선·달걀', '쌀밥과 김치·나물'])
    notes.push(`1980년대: 하루 곡류 약 ${p.grain}g, 고기 ${p.meat}g, 우유 ${p.milk}g으로 고기·우유 섭취가 늘기 시작`)
    notes.push(`보리 소비 1980년 14kg → 1985년 5kg으로 혼식이 사라짐`)
  } else if (p.from < 2000) {
    food = high ? rng.pick(['쌀밥과 김치, 고기·과일', '쌀밥과 김치, 고기 반찬과 우유']) : rng.pick(['쌀밥과 김치, 고기·과일 반찬', '쌀밥과 김치, 생선·과일'])
    notes.push(`1990년대: 하루 곡류 약 ${p.grain}g, 고기 ${p.meat}g, 과일 ${p.fruit}g, 우유 ${p.milk}g`)
    notes.push(`1인당 쌀 소비 1990년 120kg → 2000년 94kg`)
  } else {
    if (high) food = rng.pick(['쌀밥과 고기·과일, 빵', '쌀밥과 김치, 고기·과일 반찬'])
    else if (low) food = rng.pick(['쌀밥과 김치·채소 반찬', '쌀밥과 김치, 달걀·채소 반찬'])
    else food = rng.pick(['쌀밥과 김치, 고기 반찬', '쌀밥과 김치, 고기·과일'])
    const dec = p.from < 2010 ? '2000년대' : p.from < 2020 ? '2010년대' : '2020년대'
    notes.push(`국민건강영양조사 ${dec}: 하루 곡류 약 ${p.grain}g, 고기 ${p.meat}g, 과일 ${p.fruit}g, 음료 ${p.beverage}g. 6~11세 하루 1회 이상 외식 ${p.eatOutChild}%`)
    if (p.gap) {
      sources.push('kosis_hies_food')
      if (high) notes.push(`가계동향조사 ${p.gap.year}년: 소득 5분위 가구의 육류 지출은 1분위의 ${p.gap.meat}배, 과일 ${p.gap.fruit}배, 식사비 ${p.gap.dining}배`)
      else if (low) notes.push(`가계동향조사 ${p.gap.year}년: 소득 1분위 가구의 육류·과일 지출은 5분위의 절반, 식사비는 4분의 1. 곡물 지출은 분위와 무관하게 비슷`)
      else notes.push(`가계동향조사 ${p.gap.year}년: 곡물 지출은 소득분위와 무관하게 비슷하고 차이는 육류·과일·외식에서 남`)
    }
    notes.push(`1인당 쌀 소비 ${p.from}년 ${p.riceKg}kg`)
  }
  return { food, note: notes.join(' · '), sources }
}
