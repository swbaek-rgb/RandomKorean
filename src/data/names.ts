import type { EraId } from '../engine/eras'
import type { Country, Sex, SocialClass } from '../engine/types'
import type { Rng } from '../engine/rng'

// 2015 인구총조사 성씨 비율 (%)
const SURNAMES: { v: string; w: number }[] = [
  { v: '김', w: 21.5 }, { v: '이', w: 14.7 }, { v: '박', w: 8.4 }, { v: '최', w: 4.7 }, { v: '정', w: 4.3 },
  { v: '강', w: 2.4 }, { v: '조', w: 2.1 }, { v: '윤', w: 2.1 }, { v: '장', w: 2.0 }, { v: '임', w: 1.7 },
  { v: '한', w: 1.5 }, { v: '오', w: 1.5 }, { v: '서', w: 1.5 }, { v: '신', w: 1.4 }, { v: '권', w: 1.4 },
  { v: '황', w: 1.3 }, { v: '안', w: 1.3 }, { v: '송', w: 1.2 }, { v: '전', w: 1.1 }, { v: '홍', w: 1.0 },
  { v: '유', w: 1.0 }, { v: '고', w: 0.9 }, { v: '문', w: 0.9 }, { v: '양', w: 0.9 }, { v: '손', w: 0.9 },
  { v: '배', w: 0.8 }, { v: '백', w: 0.8 }, { v: '허', w: 0.7 }, { v: '남', w: 0.6 }, { v: '심', w: 0.5 },
  { v: '노', w: 0.5 }, { v: '하', w: 0.5 }, { v: '곽', w: 0.4 }, { v: '성', w: 0.4 }, { v: '차', w: 0.4 },
  { v: '주', w: 0.4 }, { v: '우', w: 0.4 }, { v: '구', w: 0.4 }, { v: '민', w: 0.3 }, { v: '류', w: 0.3 },
]

const PALEO_M = ['큰돌', '곰', '늑대', '불', '검은 눈', '빠른 발', '뿔', '바위', '번개', '매']
const PALEO_F = ['새벽', '물', '달', '이슬', '꽃', '작은 새', '강', '별', '풀', '나무']

const SAMGUK_M = ['거칠부', '이사부', '알천', '사다함', '온달', '계백', '을파소', '명림답부', '죽죽', '관창', '원술', '소나', '눌최', '검군', '비류', '온조', '도미', '벌구', '부례', '야이차', '거도', '이차돈', '아진', '연개소문', '을지문덕', '흑치상지', '복신', '도침', '거칠', '마루', '소지', '내물', '눌지', '자비', '실직', '아달', '고이', '무령', '사비', '비담', '염종', '설오유', '기루', '개루', '대소', '해루', '을두지', '위나', '우수', '주루']
const SAMGUK_F = ['소서노', '평강', '선화', '도화', '아효', '지소', '사소', '보희', '문희', '아로', '설', '운제', '알영', '사도', '마야', '만명', '만호', '지혜', '연화', '보량', '옥진', '미실', '숙명', '난초', '가야', '누리', '아리', '지은', '보리', '만월', '수로', '유화', '아유', '벼리', '가온', '다소', '새라', '고운', '해', '나리']
const NAMBUK_ELITE_M = ['유신', '춘추', '법민', '정명', '흠돌', '보고', '치원', '승우', '언위', '충원', '인문', '흠운', '경신', '헌창', '범문', '양상', '경문', '위홍', '준옹', '견훤', '궁예', '길선', '흥종', '흥덕', '헌안']
const NAMBUK_M = ['처용', '득오', '죽지', '월명', '충담', '광덕', '엄장', '검군', '실처', '지장', '진표', '순정', '노힐', '달달', '박박', '거타', '지귀', '수로', '김대성', '아사달', '희명', '거득', '융천']
const GORYEO_ELITE_M = ['자겸', '부식', '중부', '충헌', '의방', '방실', '규보', '제현', '색', '몽주', '지백', '치양', '윤관', '순', '강조', '연', '광필', '유', '충렬', '경', '준', '가신', '인우', '양', '언필', '보', '온', '천택', '흥', '리']
const GORYEO_COMMON_M = ['만적', '돌', '망이', '망소이', '개똥', '김돌', '금이', '억이', '삼돌', '노비', '이의민', '검', '득', '충', '두', '하', '벌개', '큰돌', '작은돌', '쇠', '바우', '무리', '대', '금']
const GORYEO_COMMON_F = ['어리', '가시', '고미', '늘', '눈', '금이', '소이', '보배', '두리', '연이', '달', '개', '실', '고', '아지', '언', '나리']

const JOSEON_HANJA_M = ['기', '종', '병', '수', '영', '상', '원', '희', '헌', '식', '환', '용', '재', '규', '진', '명', '창', '석', '태', '현', '순', '익', '득', '치', '선', '덕', '인', '의', '만', '철', '광', '문', '경', '길', '봉', '학', '성', '주', '동', '준', '옥', '한', '삼', '중', '보', '윤', '완', '승', '휘', '구']
const JOSEON_YANGBAN_F_AMYEONG = ['난이', '옥이', '연이', '순이', '매', '설', '초희', '월', '단', '숙', '정', '현', '아기', '금', '경', '희', '수', '향', '란', '매향', '은', '옥경', '소', '연희']
const JOSEON_SANGMIN_M = ['만복', '억쇠', '삼돌', '끝동', '어둔', '마당쇠', '복동', '길동', '바우', '돌이', '개남', '봉이', '만석', '천석', '달수', '득남', '판돌', '갑돌', '을돌', '점돌', '쇠돌', '용이', '작은놈', '큰놈', '오쇠', '검동', '금돌', '어인', '기특', '작은개']
const JOSEON_SANGMIN_F = ['언년', '분이', '막내', '섭섭이', '간난이', '곱단', '끝순', '점순', '순이', '옥이', '금이', '갑순', '을순', '삼월', '사월', '어린', '개똥', '곱분', '막동', '작은년', '큰년', '아지', '노랑', '조이', '단이', '연이', '복이', '득녀', '이쁜이', '어여쁜']
const JOSEON_NOBI_M = ['돌쇠', '개똥', '마당쇠', '쇠돌', '복동', '똥개', '작은놈', '큰놈', '검동', '어둔', '바우', '억쇠', '말똥', '개남', '금동', '방구', '두꺼비', '개불', '삼돌', '어인노미', '넙쇠', '먹쇠', '판쇠', '늦동', '망나니']
const JOSEON_NOBI_F = ['언년', '삼월', '사월', '분이', '어린년', '큰년', '작은년', '곱분', '개똥', '섭섭', '간난', '막내', '조이', '아지', '늦년', '똥녀', '방울', '노랑', '금년', '점년', '보리', '이월', '오월', '유월']

// 근현대 인기 이름 (대법원 출생신고 통계 + 세대별 집계)
const MODERN_M: [number, string[]][] = [
  [1897, ['영수', '영식', '정남', '영호', '광수', '종수', '명수', '정수', '봉수', '태영', '순호', '용수', '기수', '만수', '수동', '판석', '두만', '종호', '재수', '병호']],
  [1945, ['영수', '영호', '영식', '정남', '정호', '성수', '광수', '종수', '기수', '명수', '영철', '재호', '병철', '용수', '상철', '순호', '진수', '태수', '동수', '길수']],
  [1960, ['영수', '영호', '영철', '성호', '정호', '종호', '성수', '재호', '명수', '진호', '상철', '병철', '영식', '정수', '용호', '재우', '광호', '동수', '승호', '경수']],
  [1970, ['정훈', '성호', '상훈', '지훈', '성진', '상현', '준호', '재훈', '진호', '성민', '정호', '영수', '동훈', '경수', '태호', '상우', '재현', '승현', '영진', '용준']],
  [1980, ['지훈', '성민', '정훈', '준호', '민수', '지원', '동현', '현우', '성호', '준영', '상훈', '민호', '재현', '승현', '진우', '태현', '영준', '민석', '재훈', '성진']],
  [1990, ['지훈', '성민', '동현', '현우', '민수', '준호', '지원', '준영', '민재', '성현', '준혁', '재현', '민석', '태현', '승민', '진우', '현준', '동욱', '상현', '민호']],
  [2000, ['민준', '지훈', '현우', '준서', '우진', '건우', '예준', '도현', '동현', '준혁', '지호', '현준', '민재', '승민', '준영', '시우', '지원', '하준', '재원', '민성']],
  [2010, ['민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '지후', '준서', '준우', '현우', '도현', '지훈', '건우', '우진', '선우', '서진', '민재', '현준']],
  [2020, ['이준', '서준', '도윤', '하준', '시우', '은우', '지호', '예준', '유준', '이안', '수호', '선우', '주원', '시온', '지우', '민준', '준우', '유찬', '연우', '도현']],
]
const MODERN_F: [number, string[]][] = [
  [1897, ['영자', '순자', '정자', '옥순', '춘자', '옥희', '명자', '영숙', '순희', '복순', '정순', '말순', '봉순', '금순', '옥분', '정희', '순남', '분이', '옥례', '점례']],
  [1945, ['영자', '순자', '영숙', '정자', '정순', '명숙', '영희', '순희', '미숙', '정희', '옥순', '경자', '춘자', '영순', '명자', '경숙', '말숙', '금자', '숙자', '옥희']],
  [1960, ['미숙', '영숙', '미영', '정숙', '경숙', '은숙', '미경', '정희', '명숙', '영희', '순자', '경희', '현숙', '은희', '미자', '영미', '정미', '은정', '경아', '선희']],
  [1970, ['은주', '미영', '은정', '지영', '미경', '혜진', '은영', '현주', '정은', '미정', '경희', '미선', '수진', '은희', '정미', '선영', '지연', '민정', '미숙', '은경']],
  [1980, ['지혜', '지영', '지은', '수진', '은지', '혜진', '민정', '미정', '아름', '보람', '은정', '지현', '수연', '현정', '은영', '소영', '지연', '유진', '미영', '혜영']],
  [1990, ['유진', '지은', '지현', '민지', '수빈', '예진', '지원', '은지', '다은', '수진', '지혜', '지영', '하늘', '예지', '민경', '혜원', '수민', '보라', '아영', '소연']],
  [2000, ['서연', '민서', '수빈', '서현', '지민', '지우', '지원', '하은', '예은', '수민', '지현', '유진', '예진', '민지', '채원', '서영', '다은', '지연', '지아', '소연']],
  [2010, ['서윤', '서연', '지우', '서현', '하은', '하윤', '민서', '지유', '채원', '수아', '지민', '지아', '다은', '예은', '은서', '수빈', '지원', '유나', '예린', '소율']],
  [2020, ['이서', '서아', '하윤', '지아', '아윤', '하은', '서윤', '아린', '시아', '하린', '지우', '지안', '수아', '유나', '아인', '예린', '유주', '채원', '소율', '서현']],
]
const NORTH_M = ['철수', '영남', '성일', '광철', '명철', '정남', '영철', '진혁', '성철', '광혁', '명수', '현철', '은철', '성진', '철호', '경일', '용남', '동혁', '광명', '금성', '창혁', '영일', '정혁', '학철', '충성']
const NORTH_F = ['영희', '순희', '정순', '옥희', '미향', '은주', '향미', '명옥', '은심', '설향', '향순', '영옥', '금순', '미경', '은향', '금희', '옥경', '정심', '경희', '유미', '선화', '순영', '광명', '봄', '금주']

function decadeList(list: [number, string[]][], year: number): string[] {
  let out = list[0][1]
  for (const [y, names] of list) if (year >= y) out = names
  return out
}

const SURNAME_TOTAL = SURNAMES.reduce((a, b) => a + b.w, 0)
let nameProb = 1
function surname(rng: Rng, north: boolean): string {
  const i = rng.weightedIndex(SURNAMES.map((x) => x.w))
  nameProb *= SURNAMES[i].w / SURNAME_TOTAL
  const s = SURNAMES[i].v
  return north && s === '이' ? '리' : north && s === '유' ? '류' : s
}
function pick<T>(rng: Rng, arr: readonly T[]): T {
  nameProb *= 1 / arr.length
  return rng.pick(arr)
}

export function pickName(rng: Rng, era: EraId, year: number, country: Country, cls: SocialClass, sex: Sex): { name: string; sources: string[]; note?: string; prob: number } {
  nameProb = 1
  const r = pickNameInner(rng, era, year, country, cls, sex)
  return { ...r, prob: nameProb }
}

function pickNameInner(rng: Rng, era: EraId, year: number, country: Country, cls: SocialClass, sex: Sex): { name: string; sources: string[]; note?: string } {
  const f = sex === 'F'
  switch (era) {
    case 'paleo':
    case 'neo':
      return { name: pick(rng, f ? PALEO_F : PALEO_M), sources: ['fiction_name'], note: '문자 기록 이전. 부름 이름은 창작' }
    case 'bronze':
      if (cls.literate && rng.chance(0.5)) return { name: pick(rng, f ? SAMGUK_F : ['부루', '준', '위만', '우거', '해모수', '해부루', '단', '검', '한', '왕검']), sources: ['history_db', 'fiction_name'], note: '고조선 지배층 이름 기록 일부 존재' }
      return { name: pick(rng, f ? [...PALEO_F, ...SAMGUK_F.slice(20)] : [...PALEO_M, ...SAMGUK_M.slice(28)]), sources: ['fiction_name'], note: '일반민 이름 기록 없음. 창작' }
    case 'samguk': {
      if (cls.surname && year > 500) {
        const sn = country.name.includes('신라') ? pick(rng, ['김', '박', '석', '김', '김']) : country.name.includes('백제') ? pick(rng, ['부여', '사', '연', '협', '해', '진', '국', '목', '백']) : pick(rng, ['고', '을', '명림', '연', '해', '을지'])
        return { name: sn + pick(rng, f ? SAMGUK_F : SAMGUK_M), sources: ['history_db', 'name_history'], note: '6세기 이후 왕족·귀족은 성을 사용' }
      }
      return { name: pick(rng, f ? SAMGUK_F : SAMGUK_M), sources: ['history_db', 'name_history'], note: '삼국사기·금석문의 고유어 이름 방식' }
    }
    case 'nambuk': {
      if (cls.surname) return { name: pick(rng, ['김', '김', '김', '박', '최', '설', '장', '대', '고']) + pick(rng, f ? SAMGUK_F : NAMBUK_ELITE_M), sources: ['history_db', 'name_history'], note: '귀족은 한자식 성명 사용' }
      return { name: pick(rng, f ? SAMGUK_F : NAMBUK_M), sources: ['history_db', 'name_history'], note: '평민은 성 없이 고유어 이름 (향가·설화 인물 방식)' }
    }
    case 'goryeo': {
      if (cls.surname) return { name: surname(rng, false) + pick(rng, f ? JOSEON_YANGBAN_F_AMYEONG : GORYEO_ELITE_M), sources: ['history_db', 'name_history'], note: '귀족·향리는 성씨 사용' }
      return { name: pick(rng, f ? GORYEO_COMMON_F : GORYEO_COMMON_M), sources: ['name_history'], note: '고려 평민·천민 다수는 성이 없었음' }
    }
    case 'joseon1':
    case 'joseon2': {
      if (cls.id === 'yangban' || cls.id === 'jungin') {
        const sn = surname(rng, false)
        if (f) return { name: `${sn}씨 (아명 ${pick(rng, JOSEON_YANGBAN_F_AMYEONG)})`, sources: ['name_history'], note: '양반가 여성은 족보·호적에 성씨만 기록' }
        return { name: sn + pick(rng, JOSEON_HANJA_M) + pick(rng, JOSEON_HANJA_M), sources: ['name_history', 'kosis_surname'], note: '항렬자를 넣은 두 글자 한자 이름' }
      }
      if (cls.id === 'nobi') return { name: pick(rng, f ? JOSEON_NOBI_F : JOSEON_NOBI_M), sources: ['name_history', 'yi_nobi'], note: '노비는 성 없이 호적에 이름만 기록' }
      const hasSurname = rng.chance(year < 1600 ? 0.5 : year < 1800 ? 0.7 : 0.9)
      const given = pick(rng, f ? JOSEON_SANGMIN_F : JOSEON_SANGMIN_M)
      return { name: hasSurname ? `${surname(rng, false)} ${given}` : given, sources: ['name_history', 'kosis_surname'], note: hasSurname ? '상민도 조선 후기로 갈수록 성씨 사용' : '조선 전기 상민 상당수는 성이 없었음' }
    }
    case 'colonial':
      return { name: surname(rng, false) + pick(rng, decadeList(f ? MODERN_F : MODERN_M, year)), sources: ['kosis_names', 'kosis_surname'], note: '1909년 민적법 이후 전 국민 성명 등록' }
    case 'modern':
      if (country.north) return { name: surname(rng, true) + pick(rng, f ? NORTH_F : NORTH_M), sources: ['kdi_nk', 'kosis_surname'], note: '북한 표기 (두음법칙 미적용)' }
      return { name: surname(rng, false) + pick(rng, decadeList(f ? MODERN_F : MODERN_M, year)), sources: ['kosis_names', 'kosis_surname'], note: `${Math.floor(year / 10) * 10}년대 출생 인기 이름` }
  }
}
