import type { EraId } from '../engine/eras'
import type { Country, Sex, SocialClass } from '../engine/types'
import type { Rng } from '../engine/rng'
import { pickRegion } from './regions'
import { modernSouthDiet } from './diet'

type W<T> = { v: T; w: number }

// ───────────────────── 국가·지역 ─────────────────────

const PALEO_REGIONS = ['한탄강 유역', '금강 유역', '낙동강 상류', '동해안 동굴 지대', '대동강 유역', '남해안']
const NEO_REGIONS = ['동해안 (오산리)', '한강 하류 (암사동)', '남해안 패총 지대 (동삼동)', '대동강 유역 (궁산)', '두만강 하류 (서포항)', '낙동강 하류']

const JOSEON_PROVINCES: W<string>[] = [
  { v: '한성', w: 3 },
  { v: '경기도', w: 12 },
  { v: '충청도', w: 12 },
  { v: '전라도', w: 16 },
  { v: '경상도', w: 20 },
  { v: '강원도', w: 6 },
  { v: '황해도', w: 8 },
  { v: '평안도', w: 14 },
  { v: '함경도', w: 9 },
]
const GORYEO_PROVINCES: W<string>[] = [
  { v: '개경 (경기)', w: 8 },
  { v: '양광도', w: 18 },
  { v: '경상도', w: 20 },
  { v: '전라도', w: 17 },
  { v: '교주도 (강원)', w: 6 },
  { v: '서해도 (황해)', w: 9 },
  { v: '북계 (평안)', w: 12 },
  { v: '동계 (함경 남부)', w: 8 },
  { v: '탐라', w: 2 },
]
const SOUTH_REGIONS: W<string>[] = [
  { v: '서울', w: 18 },
  { v: '경기도', w: 26 },
  { v: '인천', w: 6 },
  { v: '부산', w: 6.5 },
  { v: '경상남도', w: 6.5 },
  { v: '경상북도', w: 5 },
  { v: '대구', w: 4.6 },
  { v: '충청남도', w: 4.2 },
  { v: '전라남도', w: 3.5 },
  { v: '전북', w: 3.4 },
  { v: '충청북도', w: 3.1 },
  { v: '강원', w: 3 },
  { v: '대전', w: 2.8 },
  { v: '광주', w: 2.8 },
  { v: '울산', w: 2.2 },
  { v: '제주', w: 1.3 },
  { v: '세종', w: 0.8 },
]
const NORTH_REGIONS: W<string>[] = [
  { v: '평양', w: 13 },
  { v: '평안남도', w: 16 },
  { v: '평안북도', w: 11 },
  { v: '함경남도', w: 12 },
  { v: '함경북도', w: 9 },
  { v: '황해남도', w: 9 },
  { v: '황해북도', w: 8 },
  { v: '강원도', w: 6 },
  { v: '자강도', w: 5 },
  { v: '양강도', w: 3 },
  { v: '남포·개성 등 특별시', w: 4 },
]

export function pickCountry(rng: Rng, era: EraId, year: number): { country: Country; sources: string[]; note?: string } {
  switch (era) {
    case 'paleo':
      return { country: { name: '국가 이전 · 이동 수렵 무리', region: rng.pick(PALEO_REGIONS) }, sources: ['jeongok'] }
    case 'neo':
      return { country: { name: '국가 이전 · 정착 촌락', region: rng.pick(NEO_REGIONS) }, sources: ['jeongok'] }
    case 'bronze': {
      if (year < -700) {
        return {
          country: { name: rng.chance(0.4) ? '초기 고조선 권역' : '군장 사회 (한반도 중·남부)', region: rng.pick(['대동강 유역', '한강 유역', '금강 유역', '영산강 유역', '낙동강 유역', '요동·서북부']) },
          sources: ['encykorea', 'history_db'],
        }
      }
      const c = rng.weighted<Country>([
        { v: { name: '고조선', region: rng.pick(['왕검성 (평양) 일대', '청천강 유역', '요동', '대동강 남부']) }, w: 45 },
        { v: { name: '진국 (한반도 남부 소국 연맹)', region: rng.pick(['한강 유역', '금강 유역', '영산강 유역', '낙동강 유역']) }, w: 45 },
        { v: { name: '옥저·동예 지역', region: rng.pick(['함흥 평야', '동해안 강릉 일대']) }, w: 10 },
      ])
      return { country: c, sources: ['encykorea', 'history_db'] }
    }
    case 'samguk': {
      const list: W<Country>[] = []
      if (year < 313) list.push({ v: { name: '낙랑군 (한 군현)', region: '대동강 유역' }, w: 8 })
      if (year < 300) {
        list.push({ v: { name: '마한 소국', region: rng.pick(['한강 하류', '충청 내륙', '영산강 유역']) }, w: 25 })
        list.push({ v: { name: '진한 소국 / 초기 신라', region: rng.pick(['경주 분지', '낙동강 동안']) }, w: 12 })
        list.push({ v: { name: '변한 소국 / 초기 가야', region: rng.pick(['김해', '함안', '고령']) }, w: 10 })
        list.push({ v: { name: '고구려', region: rng.pick(['압록강 중류 (국내성)', '동해안 (옥저 지역)']) }, w: 15 })
        list.push({ v: { name: '백제 (초기)', region: '한강 하류 (한성)' }, w: 10 })
      } else {
        list.push({ v: { name: '고구려', region: rng.pick(year > 427 ? ['평양', '대동강 유역', '황해도', '함경 남부', '강원 북부'] : ['국내성', '평양', '동해안']) }, w: 28 })
        if (year < 660) list.push({ v: { name: '백제', region: rng.pick(year < 475 ? ['한성 (한강 하류)', '충청', '전라'] : year < 538 ? ['웅진 (공주)', '충청', '전라'] : ['사비 (부여)', '충청', '전라', '한강 유역']) }, w: 30 })
        list.push({ v: { name: '신라', region: rng.pick(year < 550 ? ['경주 (서라벌)', '경북 동남부', '낙동강 동안'] : ['경주 (서라벌)', '경북', '한강 유역', '충청 동부', '강원 동해안']) }, w: 25 })
        if (year < 562) list.push({ v: { name: '가야', region: rng.pick(year < 400 ? ['금관가야 (김해)', '아라가야 (함안)'] : ['대가야 (고령)', '아라가야 (함안)', '소가야 (고성)']) }, w: 8 })
        if (year >= 660) list.push({ v: { name: '옛 백제 땅 (당 웅진도독부·신라)', region: rng.pick(['충청', '전라']) }, w: 25 })
      }
      return { country: rng.weighted(list), sources: ['samguk_pop', 'history_db'] }
    }
    case 'nambuk': {
      const list: W<Country>[] = [
        { v: { name: '통일신라', region: rng.pick(['서라벌 (경주)', '상주', '양주 (양산)', '강주 (진주)', '웅주 (공주)', '전주', '무주 (광주)', '한주 (경기·황해)', '삭주 (강원)', '명주 (강릉)']) }, w: 85 },
      ]
      if (year >= 698) list.push({ v: { name: '발해 (남경남해부 등 한반도 북부)', region: rng.pick(['함흥 평야', '함경도 해안', '평안도 북부']) }, w: 15 })
      if (year >= 892) list.push({ v: { name: '후백제', region: rng.pick(['완산주 (전주)', '충청', '전라']) }, w: 25 })
      if (year >= 901) list.push({ v: { name: '태봉 (후고구려)', region: rng.pick(['철원', '송악 (개성)', '한강 유역']) }, w: 25 })
      return { country: rng.weighted(list), sources: ['history_db', 'encykorea'] }
    }
    case 'goryeo':
      return { country: { name: '고려', region: rng.weighted(GORYEO_PROVINCES) }, sources: ['goryeo_pop'] }
    case 'joseon1':
    case 'joseon2': {
      const r = pickRegion(rng, year)
      if (r) return { country: { name: '조선', region: `${r.province} ${r.label}` }, sources: [r.source], note: `${r.snapshotYear}년 ${r.unit} 비율 기준` }
      return { country: { name: '조선', region: rng.weighted(JOSEON_PROVINCES) }, sources: ['kwon_shin'] }
    }
    case 'colonial': {
      const r = pickRegion(rng, year)
      if (r) return { country: { name: year < 1910 ? '대한제국' : '일제강점기 조선', region: `${r.province} ${r.label}` }, sources: [r.source], note: `${r.snapshotYear}년 ${r.unit} 비율 기준` }
      const region = rng.weighted(JOSEON_PROVINCES).replace('한성', year < 1910 ? '한성' : '경성')
      return { country: { name: year < 1910 ? '대한제국' : '일제강점기 조선' , region }, sources: ['chosen_sotokufu'] }
    }
    case 'modern': {
      if (year < 1948) {
        const north = rng.chance(0.33)
        const name = north ? '소련 군정 북한 지역' : '미군정 남한 지역'
        const r = pickRegion(rng, year, north ? 'north' : 'south')
        if (r) return { country: { name, region: `${r.province} ${r.label}`, north }, sources: [r.source], note: `${r.snapshotYear}년 ${r.unit} 비율 기준` }
        return { country: { name, region: rng.weighted(north ? NORTH_REGIONS : SOUTH_REGIONS), north }, sources: ['kosis_pop', 'un_wpp'] }
      }
      // 인구비: 1950 남 2.0 : 북 1.0 → 2026 남 2.0 : 북 1.0 (출생아 기준은 북한이 약간 높음)
      const northShare = year < 1990 ? 0.34 : year < 2010 ? 0.38 : 0.45
      const north = rng.chance(northShare)
      const r = pickRegion(rng, year, north ? 'north' : 'south')
      if (r) return { country: { name: north ? '조선민주주의인민공화국 (북한)' : '대한민국 (남한)', region: `${r.province} ${r.label}`, north }, sources: [r.source], note: `${r.snapshotYear}년 ${r.unit} 비율 기준` }
      return {
        country: { name: north ? '조선민주주의인민공화국 (북한)' : '대한민국 (남한)', region: rng.weighted(north ? NORTH_REGIONS : SOUTH_REGIONS), north },
        sources: ['kosis_pop', 'un_wpp'],
      }
    }
  }
}

// ───────────────────── 계급 ─────────────────────

const C = (id: string, name: string, desc: string, hazard: number, surname: boolean, literate: boolean): SocialClass => ({ id, name, desc, hazard, surname, literate })

export function pickClass(rng: Rng, era: EraId, year: number, country: Country): { cls: SocialClass; sources: string[]; note: string } {
  let list: W<SocialClass>[]
  let sources: string[]
  switch (era) {
    case 'paleo':
      list = [
        { v: C('band', '무리 구성원', '20~30명 규모 이동 수렵채집 무리. 뚜렷한 계급 없음.', 1, false, false), w: 95 },
        { v: C('band_lead', '무리의 연장자·우두머리 가계', '경험 많은 사냥꾼·연장자. 세습 권력은 아님.', 0.95, false, false), w: 5 },
      ]
      sources = ['paleo_demo', 'jeongok']
      break
    case 'neo':
      list = [
        { v: C('village', '촌락 구성원', '움집 10여 채 규모 정착 촌락. 평등 사회.', 1, false, false), w: 93 },
        { v: C('village_lead', '촌락 유력 가계', '큰 움집·많은 토기를 가진 가계. 계급 분화 초기.', 0.95, false, false), w: 7 },
      ]
      sources = ['jeongok', 'encykorea']
      break
    case 'bronze':
      list = [
        { v: C('chief', '군장·지배 가계', '고인돌을 세울 수 있는 족장 집안. 청동검 소유.', 0.8, false, true), w: 2 },
        { v: C('warrior', '전사·유력자', '군장을 따르는 무장 계층.', 0.95, false, false), w: 8 },
        { v: C('commoner', '일반 부족민', '농경·어로 종사. 고인돌 축조 노역 동원.', 1, false, false), w: 80 },
        { v: C('bond', '예속민·노비', '전쟁 포로나 빚으로 예속. 8조법에 노비 규정 존재.', 1.2, false, false), w: 10 },
      ]
      sources = ['encykorea', 'history_db']
      break
    case 'samguk':
    case 'nambuk':
      if (country.name.includes('신라')) {
        list = [
          { v: C('jingol', '진골', '왕족과 최고 귀족. 골품제 최상위(성골 소멸 이후).', 0.75, true, true), w: 1 },
          { v: C('6dupum', '6두품', '득난(得難). 관직 상한 아찬. 학문·행정 담당.', 0.85, true, true), w: 2 },
          { v: C('45dupum', '4~5두품', '하급 관료·지방 유력자.', 0.9, true, true), w: 5 },
          { v: C('pyeongmin', '평민', '농민. 정전(丁田)을 받아 경작하고 조세·역을 부담.', 1, false, false), w: 74 },
          { v: C('nobi', '노비', '귀족·관청·사원 소속. 매매·상속 대상.', 1.2, false, false), w: 18 },
        ]
      } else if (country.name.includes('발해')) {
        list = [
          { v: C('goguryeo_elite', '고구려계 지배층', '대씨·고씨 등 왕족·귀족.', 0.8, true, true), w: 5 },
          { v: C('commoner', '평민', '농민·어민.', 1, false, false), w: 75 },
          { v: C('malgal', '말갈계 피지배층', '촌락 단위로 편제된 피지배 집단.', 1.15, false, false), w: 20 },
        ]
      } else if (country.name.includes('낙랑')) {
        list = [
          { v: C('han_official', '한인 관리·상인 가계', '군현 지배층.', 0.8, true, true), w: 8 },
          { v: C('native', '토착민', '군현 지배 아래 조세를 내는 토착 농민.', 1, false, false), w: 80 },
          { v: C('nobi', '노비', '', 1.2, false, false), w: 12 },
        ]
      } else if (year < 300) {
        list = [
          { v: C('chief', '소국 지배층 (읍군·신지)', '소국의 우두머리 가계.', 0.8, false, true), w: 3 },
          { v: C('commoner', '하호 (일반민)', '소국의 농민·어민.', 1, false, false), w: 82 },
          { v: C('bond', '예속민·노비', '', 1.2, false, false), w: 15 },
        ]
      } else {
        list = [
          { v: C('noble', '귀족', country.name.includes('백제') ? '8대 성(사·연·협·해·진·국·목·백) 등 귀족. 관등 16관등.' : '대가(大加) 등 귀족. 5부 출신.', 0.8, true, true), w: 3 },
          { v: C('minor_official', '하급 관인·촌주', '지방 촌락의 유력자.', 0.9, true, true), w: 5 },
          { v: C('commoner', '평민', '농민. 조세와 요역(축성·전쟁) 부담.', 1, false, false), w: 74 },
          { v: C('nobi', '노비', '전쟁 포로·채무 노비.', 1.2, false, false), w: 18 },
        ]
      }
      sources = ['encykorea', 'history_db']
      break
    case 'goryeo':
      list = [
        { v: C('munbeol', '문벌 귀족', '음서와 공음전으로 세습되는 최상층. 무신정권기엔 무신 가문.', 0.75, true, true), w: 1 },
        { v: C('hyangri', '향리·중류층', '지방 행정 실무자, 하급 관리, 군반.', 0.9, true, true), w: 5 },
        { v: C('yangin', '양인 (백정 농민)', '군역·조세 부담 농민. 대다수 성씨 없음.', 1, false, false), w: 68 },
        { v: C('cheonmin', '천민 (노비·향소부곡민)', '공·사노비, 향·소·부곡 거주민. 만적의 난(1198) 계층.', 1.2, false, false), w: 26 },
      ]
      sources = ['encykorea', 'history_db']
      break
    case 'joseon1':
      list = [
        { v: C('yangban', '양반', '문·무반 관료 가문. 과거 응시, 군역 면제.', 0.75, true, true), w: 7 },
        { v: C('jungin', '중인', '기술관·서리·향리·서얼.', 0.9, true, true), w: 3 },
        { v: C('sangmin', '상민 (양인)', '농민·상인·수공업자. 조세·군역·요역 부담.', 1, true, false), w: 55 },
        { v: C('nobi', '노비', '15~16세기 인구의 3분의 1. 매매·상속 대상.', 1.2, false, false), w: 35 },
      ]
      sources = ['yi_nobi', 'encykorea']
      break
    case 'joseon2': {
      // 호적 분석: 노비 비율 17세기 37% → 18세기 12% → 19세기 3%. 양반 호 비율은 반대로 증가.
      const t = Math.min(1, Math.max(0, (year - 1650) / 200))
      const nobi = 37 - 34 * t
      const yangban = 10 + 40 * t
      list = [
        { v: C('yangban', '양반', t > 0.5 ? '호적상 양반 호가 절반에 이르는 시기. 상당수는 몰락 양반·신분 상승 가계.' : '문·무반 관료 가문. 과거 응시, 군역 면제.', 0.8, true, true), w: yangban },
        { v: C('jungin', '중인', '역관·의관·서리·향리·서얼.', 0.9, true, true), w: 3 },
        { v: C('sangmin', '상민 (양인)', '농민·상인·수공업자. 조세·군역 부담.', 1, true, false), w: 100 - yangban - 3 - nobi },
        { v: C('nobi', '노비', year > 1801 ? '1801년 공노비 해방 후 잔존 사노비.' : '매매·상속 대상. 도망·속량으로 감소 추세.', 1.2, false, false), w: nobi },
      ]
      sources = ['yi_nobi', 'kwon_shin']
      break
    }
    case 'colonial':
      list = [
        { v: C('landlord', '지주', '소작을 주는 토지 소유 가문. 상당수 옛 양반.', 0.8, true, true), w: 3 },
        { v: C('owner_farmer', '자작농', '자기 땅을 경작하는 농민.', 0.95, true, true), w: 18 },
        { v: C('half_tenant', '자소작농', '일부 자기 땅과 소작지를 함께 경작.', 1, true, false), w: 25 },
        { v: C('tenant', '소작농', '농가의 절반 이상. 소출의 절반을 소작료로 냄.', 1.1, true, false), w: 42 },
        { v: C('urban_worker', '도시 노동자·영세 상인', '경성·부산·평양 등지의 공장·부두 노동.', 1.05, true, false), w: 8 },
        { v: C('intelligentsia', '신지식층·전문직', '교사·의사·기자·관공리.', 0.85, true, true), w: 2 },
        { v: C('baekjeong', '백정·최하층', '갑오개혁으로 법적 신분은 폐지됐으나 차별 지속. 형평운동(1923).', 1.15, true, false), w: 2 },
      ]
      sources = ['chosen_sotokufu', 'encykorea']
      break
    case 'modern':
      if (country.north) {
        list = [
          { v: C('core', '핵심 계층', '항일 빨치산·전사자 유족·노동당 간부 가계. 평양 거주 우선.', 0.85, true, true), w: 28 },
          { v: C('wavering', '동요 계층', '일반 노동자·농민·사무원.', 1, true, true), w: 45 },
          { v: C('hostile', '적대 계층', '지주·월남자 가족·종교인 가계. 진학·거주 제한.', 1.2, true, true), w: 27 },
        ]
        sources = ['kdi_nk', 'un_wpp']
      } else {
        list = [
          { v: C('q5', '소득 5분위 (상위 20%)', '가구 소득 상위 20%.', 0.85, true, true), w: 20 },
          { v: C('q4', '소득 4분위', '', 0.92, true, true), w: 20 },
          { v: C('q3', '소득 3분위 (중위)', '', 1, true, true), w: 20 },
          { v: C('q2', '소득 2분위', '', 1.08, true, true), w: 20 },
          { v: C('q1', '소득 1분위 (하위 20%)', '', 1.2, true, true), w: 20 },
        ]
        sources = ['kosis_kfs']
      }
      break
  }
  const idx = rng.weightedIndex(list.map((i) => i.w))
  const total = list.reduce((a, b) => a + b.w, 0)
  const share = Math.round((list[idx].w / total) * 100)
  return { cls: list[idx].v, sources, note: `이 시기 인구의 약 ${share}%가 이 계층` }
}

// ───────────────────── 직업 ─────────────────────

export function pickOccupation(rng: Rng, era: EraId, year: number, country: Country, cls: SocialClass, sex: Sex, ageReached: number): { job: string; sources: string[] } {
  const female = sex === 'F'
  if (era === 'paleo') {
    return {
      job: female ? rng.pick(['채집 (도토리·열매·뿌리) 및 소형 동물 사냥', '채집과 가죽 손질', '채집·불 관리']) : rng.pick(['사슴·멧돼지 사냥', '석기 제작 (슴베찌르개·돌날)', '사냥과 어로']),
      sources: ['paleo_demo'],
    }
  }
  if (era === 'neo') {
    return {
      job: female ? rng.pick(['조·기장 밭 경작과 채집', '토기 제작 (빗살무늬토기)', '조개 채취와 그물 짜기']) : rng.pick(['어로 (작살·낚시)', '사냥과 밭 개간', '간석기 제작', '농경 (조·기장·피)']),
      sources: ['jeongok'],
    }
  }
  const premodern = era === 'bronze' || era === 'samguk' || era === 'nambuk' || era === 'goryeo' || era === 'joseon1' || era === 'joseon2'
  if (premodern) {
    const src = ['encykorea', 'history_db']
    switch (cls.id) {
      case 'chief':
      case 'jingol':
      case 'noble':
      case 'munbeol':
      case 'goguryeo_elite':
      case 'han_official':
        return { job: female ? '귀족 가문의 안주인 (가내 노비·재산 관리)' : rng.pick(['관직 (중앙 관료)', '장군·무장', '지방 태수·성주', '왕실 종친']), sources: src }
      case '6dupum':
      case '45dupum':
      case 'minor_official':
      case 'hyangri':
        return { job: female ? '관인 집안 안살림' : rng.pick(['지방 행정 실무 (향리·촌주)', '하급 관리', '승려 (사원 소속)', '학문·유학자']), sources: src }
      case 'yangban':
        if (female) return { job: '양반가 안주인 (집안 관리·바느질·길쌈)', sources: src }
        return {
          job: rng.weighted([
            { v: '과거 준비 유생 (평생 급제하지 못함)', w: 45 },
            { v: '문반 관료 (급제)', w: 8 },
            { v: '무반 관료·군관', w: 7 },
            { v: '향촌 사족 (서원·향약 운영)', w: 25 },
            { v: '훈장 (서당 교사)', w: 10 },
            { v: '몰락 양반 (직접 농사)', w: 5 },
          ]),
          sources: src,
        }
      case 'jungin':
        return { job: female ? (rng.chance(0.15) ? '의녀' : '중인 집안 안살림') : rng.pick(['역관 (통역)', '의관', '서리 (관청 서기)', '산원 (회계)', '화원 (도화서)', '향리']), sources: src }
      case 'warrior':
        return { job: female ? '가사와 농경' : '전사·군장 호위', sources: src }
      case 'nobi':
      case 'bond':
      case 'cheonmin':
      case 'malgal':
        if (female) return { job: rng.pick(['솔거 노비 (주인집 부엌일·물 긷기)', '외거 노비 (농사, 신공 납부)', '관비 (관청 허드렛일)', rng.chance(0.3) ? '기녀 (관기)' : '솔거 노비 (아이 돌봄·빨래)']), sources: src }
        return { job: rng.pick(['솔거 노비 (주인집 농사·잡일)', '외거 노비 (소작 농사, 신공 납부)', '관노 (관청 잡역)', '사원 노비', era === 'goryeo' ? '향·소·부곡의 수공업 (숯·소금·도자기)' : '백정 (도살·유기 제조)']), sources: src }
      default: {
        // 평민·상민·양인
        if (female) return { job: rng.weighted([{ v: '농사와 길쌈 (베·모시 짜기)', w: 80 }, { v: '어촌 해녀·조개 채취', w: 6 }, { v: '장터 행상 (보부상 아내)', w: 5 }, { v: '주막 운영', w: 3 }, { v: '무당', w: 3 }, { v: '침선 (바느질 품팔이)', w: 3 }]), sources: src }
        return {
          job: rng.weighted([
            { v: '농민 (자작)', w: 35 },
            { v: '농민 (소작·병작)', w: 40 },
            { v: '어민', w: 6 },
            { v: era === 'joseon2' ? '보부상' : '행상', w: 4 },
            { v: rng.pick(['대장장이', '옹기장이', '목수', '갓장이', '유기장']), w: 5 },
            { v: '군역 복무 후 농사 (정군·보인)', w: 5 },
            { v: '승려', w: 3 },
            { v: '뱃사공·역졸', w: 2 },
          ]),
          sources: src,
        }
      }
    }
  }
  if (era === 'colonial') {
    const src = ['chosen_sotokufu']
    switch (cls.id) {
      case 'landlord':
        return { job: female ? '지주가 안주인' : rng.pick(['지주 (소작 관리)', '지주 겸 면장·군수', '금융조합 이사', '지주 겸 일본 유학생']), sources: src }
      case 'intelligentsia':
        return { job: female ? rng.pick(['보통학교 교사', '간호부', '전화교환수', '여기자']) : rng.pick(['보통학교 교사', '의사', '신문 기자', '군청 서기', '변호사', '목사·전도사']), sources: src }
      case 'urban_worker':
        return { job: female ? rng.pick(['방직 공장 여공', '고무신 공장 여공', '식모', '노점 행상']) : rng.pick(['부두 노동자', '광부', '정미소 노동자', '인력거꾼', '철도 노무자', '영세 상점 점원']), sources: src }
      case 'baekjeong':
        return { job: female ? '가내 노동' : rng.pick(['도축업', '유기 제조', '피혁 가공']), sources: src }
      case 'owner_farmer':
        return { job: female ? '농사와 가사' : rng.pick(['자작농', '자작농 겸 마을 구장', '자작농 겸 소규모 상업']), sources: src }
      case 'half_tenant':
        return { job: female ? '농사와 가사' : '자소작농', sources: src }
      default:
        return {
          job: female ? rng.weighted([{ v: '소작 농사와 가사', w: 85 }, { v: '방직 공장 여공 (도시 이주)', w: 8 }, { v: '식모', w: 5 }, { v: '해녀', w: 2 }]) : rng.weighted([{ v: '소작농', w: 75 }, { v: '화전민', w: 5 }, { v: '만주 이주 농민', w: 8 }, { v: '일본 탄광·공장 노동 이주', w: 7 }, { v: '머슴', w: 5 }]),
          sources: src,
        }
    }
  }
  // 현대
  if (country.north) {
    const src = ['kdi_nk']
    if (cls.id === 'core') return { job: female ? rng.pick(['당 간부 가정 사무원', '의사', '교원', '평양 상점 판매원', '예술단원']) : rng.pick(['노동당 간부', '군 장교', '외화벌이 무역 일꾼', '보위부·보안원', '대학 교수', '기업소 지배인']), sources: src }
    if (cls.id === 'hostile') return { job: female ? rng.pick(['협동농장 농민', '장마당 상인', '탄광 노동자', '농촌 교원']) : rng.pick(['협동농장 농민', '탄광 노동자', '벌목공', '군 복무 후 협동농장 배치']), sources: src }
    return { job: female ? rng.weighted([{ v: '협동농장 농민', w: 35 }, { v: '장마당 상인', w: 25 }, { v: '공장 노동자', w: 20 }, { v: '교원', w: 8 }, { v: '간호원·의사', w: 5 }, { v: '사무원', w: 7 }]) : rng.weighted([{ v: '협동농장 농민', w: 35 }, { v: '공장 노동자', w: 25 }, { v: '10년 군 복무 후 노동자', w: 20 }, { v: '광부', w: 8 }, { v: '운전수', w: 5 }, { v: '기술자', w: 7 }]), sources: src }
  }
  // 남한: 산업 구조가 시대에 따라 크게 변함. 직업을 갖는 시점 ≈ 출생 + 25년
  const jobYear = year + Math.min(ageReached, 30)
  const src = ['kosis_jobs']
  const farmShare = jobYear < 1965 ? 0.6 : jobYear < 1980 ? 0.4 : jobYear < 1995 ? 0.18 : jobYear < 2010 ? 0.08 : 0.05
  const highEnd = cls.id === 'q5' || cls.id === 'q4'
  const lowEnd = cls.id === 'q1' || cls.id === 'q2'
  const metro = ['서울', '부산', '대구', '인천', '광주', '대전', '울산'].includes(country.region)
  const pool: W<string>[] = []
  pool.push({ v: female ? '농업 (농가 주부)' : '농업', w: farmShare * 100 * (highEnd ? 0.4 : 1) * (metro ? 0.1 : 1) })
  if (jobYear < 1995) {
    pool.push({ v: female ? '봉제·전자 공장 생산직' : '제조업 생산직', w: 25 * (highEnd ? 0.5 : 1) })
    pool.push({ v: female ? '가정주부 (전업)' : '건설 노동자', w: female ? 30 : 8 })
    pool.push({ v: female ? '미용사·재봉사' : '운전기사·택시', w: 5 })
    pool.push({ v: '자영업 (식당·소매점)', w: 12 })
    pool.push({ v: female ? '교사·간호사·은행원' : '회사원 (사무직)', w: 12 * (highEnd ? 2 : 1) })
    pool.push({ v: female ? '교사·약사' : rng.pick(['공무원', '교사', '의사·약사', '엔지니어', '군 장교']), w: 6 * (highEnd ? 2.5 : 0.5) })
  } else {
    pool.push({ v: '제조업 생산직', w: 15 * (lowEnd ? 1.3 : 0.7) })
    pool.push({ v: '자영업 (식당·카페·소매점)', w: 14 })
    pool.push({ v: '회사원 (사무·관리직)', w: 25 * (highEnd ? 1.5 : 0.8) })
    pool.push({ v: rng.pick(['소프트웨어 개발자', '엔지니어', '디자이너', '연구원']), w: 8 * (highEnd ? 1.8 : 0.6) })
    pool.push({ v: rng.pick(['의사', '변호사', '약사', '회계사']), w: 2.5 * (highEnd ? 3 : 0.2) })
    pool.push({ v: rng.pick(['교사', '공무원', '공기업 직원']), w: 8 * (highEnd ? 1.3 : 0.8) })
    pool.push({ v: female ? '간호사·보육교사·요양보호사' : '배달·물류·운전', w: 9 * (lowEnd ? 1.5 : 0.7) })
    pool.push({ v: rng.pick(['서비스직 (판매·콜센터)', '음식점 종사자', '건설 노동자', '경비·청소']), w: 10 * (lowEnd ? 1.8 : 0.5) })
    pool.push({ v: female ? '전업주부' : '프리랜서·유튜버', w: female ? 10 : 3 })
  }
  return { job: rng.weighted(pool), sources: src }
}

// ───────────────────── 주식 ─────────────────────

export function pickStaple(rng: Rng, era: EraId, year: number, country: Country, cls: SocialClass): { food: string; sources: string[]; note?: string } {
  const elite = ['chief', 'jingol', '6dupum', '45dupum', 'noble', 'munbeol', 'yangban', 'goguryeo_elite', 'han_official', 'landlord', 'core', 'q5', 'q4', 'minor_official', 'hyangri', 'jungin', 'intelligentsia'].includes(cls.id)
  const lowest = ['nobi', 'bond', 'cheonmin', 'malgal', 'tenant', 'baekjeong', 'hostile', 'q1'].includes(cls.id)
  switch (era) {
    case 'paleo':
      return { food: rng.pick(['사슴·멧돼지 고기와 도토리·개암', '민물고기와 채집한 뿌리·열매', '매머드·들소 등 대형 동물 고기 (빙하기)', '조개·물고기와 도토리']), sources: ['jeongok', 'paleo_demo'] }
    case 'neo':
      return { food: rng.pick(['도토리 (떫은맛을 우려낸 도토리죽·묵)', '조·기장 잡곡죽과 도토리', '굴·꼬막 등 조개와 생선 (패총 지대)', '도토리와 사슴·멧돼지 고기', '기장·피 죽과 채집 나물']), sources: ['jeongok', 'food_history'] }
    case 'bronze':
      return { food: elite ? '쌀밥과 고기·생선 (지배층)' : rng.pick(['조·기장·보리 잡곡밥', '콩과 조를 섞은 잡곡죽', '보리·피 죽과 어패류', '기장밥과 산나물']), sources: ['food_history', 'jeongok'] }
    case 'samguk':
    case 'nambuk':
    case 'goryeo':
      if (elite) return { food: rng.pick(['쌀밥과 고기·젓갈', '쌀밥과 채소 절임·장', era === 'goryeo' ? '쌀밥과 차, 불교 영향으로 채식 위주' : '쌀밥과 육류']), sources: ['food_history', 'encykorea'] }
      if (lowest) return { food: rng.pick(['피·조 잡곡죽', '보리죽과 나물', '조밥과 소금에 절인 채소', '도토리·칡 등 구황 식물 (흉년)']), sources: ['food_history'] }
      return { food: rng.pick(['조밥·보리밥과 된장', '콩·조 잡곡밥과 김치 (무 절임)', '보리밥과 젓갈', country.region.includes('해안') || country.region.includes('탐라') ? '잡곡밥과 생선·해조류' : '기장·조밥과 나물']), sources: ['food_history'] }
    case 'joseon1':
    case 'joseon2': {
      if (elite) return { food: rng.pick(['쌀밥과 국·김치·생선 (양반 밥상)', '쌀밥과 고기 반찬, 제사 음식', '쌀밥과 장·젓갈']), sources: ['food_history'] }
      if (lowest) return { food: rng.pick(['보리·조 잡곡죽', '조밥과 소금 절인 채소', '피죽과 시래기', year > 1830 && country.region.includes('강원') ? '감자와 옥수수' : '보리죽과 산나물', '흉년엔 소나무 껍질(송기)·도토리']), sources: ['food_history', 'sillok'] }
      const region = country.region
      if (region.includes('제주') || region.includes('탐라')) return { food: '좁쌀밥과 보리, 고구마 (18세기 후반 이후)', sources: ['food_history'] }
      if (region.includes('함경') || region.includes('강원')) return { food: year > 1830 ? '감자·옥수수와 조밥' : '조밥과 귀리', sources: ['food_history'] }
      return { food: rng.pick(['보리밥과 된장국·김치', '보리·쌀 섞은 밥과 김치 (수확기), 봄엔 보리죽', '조밥·콩밥과 나물', year > 1700 ? '보리밥과 고추 넣은 김치' : '보리밥과 짠지·젓갈']), sources: ['food_history'] }
    }
    case 'colonial':
      if (elite) return { food: '쌀밥과 국·김치, 고기 반찬', sources: ['food_history', 'chosen_sotokufu'] }
      return { food: rng.pick(['보리밥·조밥 (쌀은 공출·수출로 부족)', '만주산 좁쌀밥', '감자·고구마와 보리밥', '보리죽과 콩깻묵 (1940년대 공출기)', '조밥과 김치·된장']), sources: ['food_history', 'chosen_sotokufu'] }
    case 'modern':
      if (country.north) {
        // 계급을 먼저 본다. 기근은 성장기(5~15세)가 1994~1998년과 겹칠 때만, 계급·지역에 따라 차등.
        const famine = year + 15 >= 1994 && year + 5 <= 1998
        const city = ['평양', '남포·개성 등 특별시'].includes(country.region)
        const remote = ['함경북도', '양강도', '자강도', '함경남도'].includes(country.region)
        if (cls.id === 'core') {
          if (city) return { food: rng.pick(['쌀밥 (배급) 과 김치', '쌀밥과 고기 반찬 (간부 공급)', '쌀밥과 옥수수 소량 혼합']), sources: ['fao_nk', 'kdi_nk'] }
          return { food: rng.pick(['쌀·옥수수 혼합 배급 밥 (간부 우선 공급)', '쌀밥과 옥수수 혼합, 기근기에도 배급 유지', '쌀 위주 배급과 김치']), sources: ['fao_nk', 'kdi_nk'] }
        }
        if (cls.id === 'wavering') {
          if (famine) return { food: rng.pick(['옥수수밥, 고난의 행군기엔 강냉이죽과 장마당 식량', '옥수수국수와 장마당에서 산 쌀', remote ? '강냉이죽과 풀죽 (배급 중단)' : '옥수수밥과 감자, 배급 중단기엔 장마당 의존']), sources: ['fao_nk', 'nk_famine'] }
          if (city) return { food: rng.pick(['쌀·옥수수 혼합 배급 밥과 김치', '옥수수밥과 쌀 혼합', '배급 쌀과 장마당 반찬']), sources: ['fao_nk', 'kdi_nk'] }
          return { food: rng.pick(['옥수수밥 (강냉이밥) 과 쌀 소량 혼합', '옥수수국수·감자', '장마당에서 산 쌀과 옥수수']), sources: ['fao_nk', 'kdi_nk'] }
        }
        // 적대 계층: 배급 후순위, 소외 지역 거주 비중 높음
        if (famine) return { food: rng.pick(['강냉이죽과 풀죽 (배급 완전 중단)', '옥수수 속대 가루와 산나물', '풀죽과 감자, 장마당 품팔이로 연명']), sources: ['fao_nk', 'nk_famine'] }
        return { food: rng.pick(['옥수수밥과 감자', '강냉이밥과 시래기', remote ? '감자·옥수수와 산나물' : '옥수수밥과 장마당 쌀 소량']), sources: ['fao_nk', 'kdi_nk'] }
      }
      // 성장기 = 출생 후 8년 무렵. 1965년 이후는 국민건강영양조사·양곡소비량·가계동향 수치로 문구와 각주를 만든다
      const grow = year + 8
      if (grow < 1965) return { food: rng.pick(['보리밥과 김치 (쌀 부족, 보릿고개)', '보리·쌀 혼식과 미국 원조 밀가루 수제비', '보리밥·감자·고구마']), sources: ['kosis_food', 'food_history'], note: '양곡소비량조사 1965년: 1인당 쌀 121kg·보리 50kg. 봄철 보릿고개' }
      const d = modernSouthDiet(rng, grow, cls)
      return { food: d.food, sources: d.sources, note: d.note }
  }
}
