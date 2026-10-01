// "이 삶의 기억": 카드의 사실(나이·가족·직업·사인·지역)을 1인칭 회상체 템플릿에 끼워 넣는다. 장면만 창작.
import type { Life, Sex } from '../engine/types'
import { Rng } from '../engine/rng'
import { CURRENT_YEAR, eraOf, formatYear } from '../engine/eras'
import { eventsAt } from './mortality'

export interface Memory {
  kind: '배우자' | '자녀' | '직업' | '부모' | '역사 사건'
  title: string
  body: string
}
export interface LifeMemories {
  best: Memory
  last?: { title: string; body: string }
  /** 마지막 날을 만들지 않은 이유 */
  lastOmitted?: string
}

type Group = 'prehist' | 'ancient' | 'joseon' | 'colonial' | 'modern'
function groupOf(year: number): Group {
  if (year < -108) return 'prehist'
  if (year < 1392) return 'ancient'
  if (year < 1897) return 'joseon'
  if (year < 1945) return 'colonial'
  return 'modern'
}

const SEASONS = ['이른 봄', '늦은 봄', '장마 무렵', '한여름', '초가을', '늦가을', '첫눈 온 뒤', '한겨울']

/** 감각 문장의 장소 */
type Place = 'home' | 'work' | 'school' | 'street' | 'field' | 'shore' | 'forest' | 'market' | 'hospital'
interface SenseLine { t: string; from: number; to: number; place: Place[]; north?: boolean; summer?: boolean }
const L = (t: string, from: number, to: number, place: Place[], extra: Partial<SenseLine> = {}): SenseLine => ({ t, from, to, place, ...extra })
/**
 * 감각 문장 목록. 연대(from~to), 장소, 남북, 계절(summer) 조건을 붙인다.
 * 장면이 장소를 정하고, 그 장소에 맞는 문장만 남겨 뽑는다. 맞는 문장이 없으면 날씨 문장으로 대체.
 */
const SENSE_LINES: SenseLine[] = [
  // 구석기~청동기
  L('불 냄새가 옷에 배어 있었다', -40000, -108, ['home', 'forest', 'field']),
  L('숲에서 새 울음이 갑자기 그쳤다', -40000, -108, ['forest']),
  L('강물 소리가 밤새 들렸다', -40000, -108, ['shore', 'home']),
  L('도토리 떫은 물을 우려내던 냄새가 났다', -40000, -108, ['home']),
  L('바람이 움집 틈으로 들어왔다', -40000, -108, ['home']),
  L('불가에 아이들이 모여 있었다', -40000, -108, ['home']),
  // 삼국~고려
  L('보리 삶는 냄새가 났다', -108, 1392, ['home']),
  L('흙담이 볕에 데워져 있었다', -108, 1392, ['home', 'street']),
  L('소 울음이 멀리서 들렸다', -108, 1392, ['field', 'home']),
  L('절의 종소리가 골짜기를 건너왔다', -108, 1392, ['home', 'field', 'forest', 'street', 'school']),
  L('나루에 배 대는 소리가 났다', -108, 1392, ['shore']),
  L('장터에 사람 소리가 가득했다', -108, 1392, ['market', 'street']),
  // 조선
  L('보리밥 김이 부엌에서 올라왔다', 1392, 1897, ['home']),
  L('마당에 멍석 냄새가 났다', 1392, 1897, ['home']),
  L('닭이 담 너머에서 울었다', 1392, 1897, ['home']),
  L('삼베 짜는 소리가 옆방에서 들렸다', 1392, 1897, ['home']),
  L('장 담근 냄새가 뒤란에 있었다', 1392, 1897, ['home']),
  L('논에 물 대는 소리가 났다', 1392, 1897, ['field']),
  L('소 부리는 소리가 건너 논에서 들렸다', 1392, 1897, ['field']),
  L('장터에 엿장수 가위 소리가 났다', 1392, 1897, ['market', 'street']),
  L('갯벌 냄새가 바람에 실려 왔다', 1392, 1897, ['shore']),
  L('글 읽는 소리가 서당에서 흘러나왔다', 1392, 1897, ['school']),
  L('관아 앞에 사람들이 줄지어 있었다', 1392, 1897, ['work', 'street']),
  L('풀무 소리가 이른 아침부터 났다', 1392, 1897, ['work']),
  L('숲에서 나무 베는 소리가 났다', 1392, 1897, ['forest']),
  // 대한제국·일제강점기
  L('누런 조밥 냄새가 났다', 1897, 1945, ['home']),
  L('등잔 기름 냄새가 방에 남아 있었다', 1897, 1945, ['home']),
  L('신작로에 먼지가 일었다', 1897, 1945, ['street', 'field']),
  L('라디오 소리가 면사무소에서 흘러나왔다', 1897, 1945, ['street', 'market']),
  L('정미소 기계 소리가 마을까지 들렸다', 1897, 1945, ['work', 'home']),
  L('공장 사이렌이 아침을 알렸다', 1897, 1945, ['work']),
  L('보리 베는 소리가 들판에 가득했다', 1897, 1945, ['field']),
  L('보통학교 종이 울렸다', 1897, 1945, ['school']),
  // 남한 1945~69
  L('연탄 냄새가 골목에 있었다', 1945, 1970, ['home', 'street']),
  L('수돗가에서 물 받는 소리가 났다', 1945, 1970, ['home']),
  L('재봉틀 소리가 밤늦게까지 났다', 1945, 1970, ['home', 'work']),
  L('군용 트럭이 신작로를 지나갔다', 1945, 1970, ['street', 'field']),
  L('담 너머 라디오 소리가 들렸다', 1945, 1970, ['home', 'street']),
  L('공장 사이렌이 아침을 알렸다', 1945, 1970, ['work']),
  L('교실 난로에 조개탄 냄새가 났다', 1945, 1970, ['school']),
  L('보리 베는 소리가 들판에 가득했다', 1945, 1970, ['field']),
  L('병원 복도에 소독약 냄새가 났다', 1945, 2027, ['hospital']),
  // 남한 1970~89
  L('연탄 가는 냄새가 새벽에 났다', 1970, 1990, ['home']),
  L('텔레비전 소리가 옆집에서 넘어왔다', 1970, 1990, ['home']),
  L('밥솥 김 빠지는 소리가 났다', 1970, 2000, ['home']),
  L('두부 장수 종소리가 골목을 지났다', 1970, 1990, ['street', 'home']),
  L('버스 정류장에 매미 소리가 가득했다', 1970, 1990, ['street'], { summer: true }),
  L('기계 돌아가는 소리가 하루 종일 났다', 1970, 2000, ['work']),
  L('사무실에 타자기 소리가 났다', 1970, 1990, ['work']),
  L('교실 뒤 난로 위 도시락 냄새가 났다', 1970, 1990, ['school']),
  L('경운기 소리가 논둑을 지나갔다', 1970, 2027, ['field']),
  L('시장 골목에 튀김 냄새가 났다', 1970, 2027, ['market']),
  // 남한 1990~2009
  L('아파트 복도에 저녁 냄새가 돌았다', 1990, 2010, ['home']),
  L('컴퓨터 켜는 소리가 방에서 났다', 1990, 2010, ['home']),
  L('배달 오토바이 소리가 골목을 지났다', 1990, 2027, ['street', 'home']),
  L('편의점 문 여는 소리가 났다', 1990, 2027, ['street', 'market']),
  L('학원 버스가 단지 앞에 서 있었다', 1990, 2027, ['street', 'school']),
  L('교실 창밖으로 운동장 호루라기 소리가 났다', 1990, 2027, ['school']),
  L('사무실 프린터 소리가 났다', 1990, 2010, ['work']),
  L('공장 라디오에서 노래가 흘렀다', 1990, 2027, ['work']),
  // 남한 2010~
  L('휴대폰이 탁자 위에서 진동했다', 2010, 2027, ['home', 'work', 'school']),
  L('배달 앱 알림이 울렸다', 2010, 2027, ['home']),
  L('지하철 안내 방송이 흘러나왔다', 2010, 2027, ['street']),
  L('아파트 단지에 매미 소리가 가득했다', 2010, 2027, ['home', 'street'], { summer: true }),
  L('카페에서 커피 내리는 냄새가 났다', 2010, 2027, ['market', 'street']),
  L('키보드 소리만 사무실에 남아 있었다', 2010, 2027, ['work']),
  L('공장 라인이 잠깐 멈췄다', 2010, 2027, ['work']),
  L('교실에서 휴대폰 진동이 여기저기서 울렸다', 2010, 2027, ['school']),
  // 북한
  L('전기가 나가 초를 켰다', 1945, 2027, ['home'], { north: true }),
  L('옥수수 삶는 냄새가 났다', 1945, 2027, ['home'], { north: true }),
  L('확성기에서 아침 방송이 나왔다', 1945, 2027, ['street', 'work', 'field', 'school'], { north: true }),
  L('배급소 앞에 줄이 서 있었다', 1945, 2027, ['street', 'market'], { north: true }),
  L('농장 트럭이 흙길을 지나갔다', 1945, 2027, ['field', 'street'], { north: true }),
  L('작업반 호각 소리가 났다', 1945, 2027, ['work', 'field'], { north: true }),
]
/** 장소가 정해지지 않았거나 맞는 문장이 없을 때 쓰는 날씨 문장 (계절별) */
const WEATHER: Record<string, string[]> = {
  '이른 봄': ['아직 바람이 찼다', '땅이 갓 녹은 냄새가 났다'],
  '늦은 봄': ['볕이 등에 따가웠다', '꽃잎이 바닥에 깔려 있었다'],
  '장마 무렵': ['비가 이틀째 그치지 않았다', '공기가 무겁고 축축했다'],
  '한여름': ['저녁인데도 더위가 가시지 않았다', '땀이 마르지 않았다'],
  '초가을': ['바람이 처음으로 서늘했다', '하늘이 높았다'],
  '늦가을': ['해가 짧아져 금방 어두워졌다', '낙엽 태우는 냄새가 났다'],
  '첫눈 온 뒤': ['눈이 녹아 길이 질었다', '숨이 하얗게 보였다'],
  '한겨울': ['손끝이 곱았다', '문틈으로 찬바람이 들어왔다'],
}

/**
 * 감각 문장 접두어. 연대·장소·남북·계절 조건에 맞는 문장을 고르고 "문장. " 형태로 돌려준다.
 * 셋 중 하나는 비워 문장 틀이 덜 보이게 한다. place 가 'weather' 면 날씨 문장만 쓴다.
 */
function sensePrefix(rng: Rng, year: number, north: boolean, season: string, place: Place | 'weather'): string {
  if (rng.chance(1 / 3)) return ''
  const summer = /여름|장마/.test(season)
  const modern = year >= 1945
  const pool = place === 'weather' ? [] : SENSE_LINES.filter((l) => year >= l.from && year < l.to && l.place.includes(place) && (!l.summer || summer) && (modern ? !!l.north === north : !l.north))
  const t = pool.length ? rng.pick(pool).t : rng.pick(WEATHER[season] ?? WEATHER['늦은 봄'])
  return `${t}. `
}

/** 직업 일터 이름 → 감각 장소 */
function placeOfWorkplace(w: string): Place {
  if (/공장|현장|사무실|부대|관아|서당|일터|작업장|가게|병원|교실/.test(w)) {
    if (/서당|교실/.test(w)) return 'school'
    if (/가게/.test(w)) return 'market'
    if (/병원/.test(w)) return 'hospital'
    return 'work'
  }
  if (/논|밭|들/.test(w)) return 'field'
  if (/나루|갯|강가|바다|물가/.test(w)) return 'shore'
  if (/숲|산/.test(w)) return 'forest'
  if (/장터|시장|길 위/.test(w)) return 'market'
  if (/집|마당|움집|초가|방/.test(w)) return 'home'
  return 'street'
}

/** 배우자를 처음 만난 장면: 시대별 혼인 관습 */
function meetSpouse(rng: Rng, year: number, north: boolean, sex: Sex): string {
  const g = groupOf(year)
  if (g === 'prehist') return rng.pick(['다른 무리에서 온 사람이었다. 불가에서 처음 마주 앉았다.', '강 건너 무리와 만나는 날이었다. 그 사람이 먼저 고기를 건넸다.'])
  if (g === 'ancient' || g === 'joseon') return rng.pick(['혼인날 처음 얼굴을 보았다. 어른들이 정한 사람이었다.', '중매쟁이가 다녀간 지 한 달 만이었다. 초례청에서 처음 마주 섰다.', '혼담이 오간 뒤 딱 한 번 담 너머로 보았다. 혼인날이 두 번째였다.'])
  if (g === 'colonial') return rng.pick(['혼담이 오갈 때 사진 한 장을 먼저 보았다. 실물은 혼인날 보았다.', '어른들끼리 정한 혼사였다. 마당에서 초례를 치렀다.', '같은 공장에 다니던 사람이었다. 퇴근길에 몇 번 마주쳤다.'])
  if (north) return rng.pick(['직장 동료가 소개해 주었다. 처음 만난 곳은 공원 벤치였다.', '같은 농장에서 일하던 사람이었다. 총화가 끝나고 처음 말을 걸었다.'])
  if (year < 1980) return rng.pick(['맞선 자리였다. 다방에서 마주 앉아 커피를 시켰다.', '친척이 소개한 사람이었다. 극장 앞에서 처음 만났다.', '같은 직장 사람이었다. 퇴근길 버스에서 몇 번 같이 내렸다.'])
  if (year < 2000) return rng.pick(['친구가 소개해 준 자리였다. 경양식집에서 돈가스를 시켰다.', '같은 학교 동아리였다. 엠티에서 처음 오래 이야기했다.', '직장 동료였다. 회식 끝나고 같은 방향 택시를 탔다.', '삐삐로 음성 메시지를 남기던 사이였다. 처음 만난 날은 극장이었다.'])
  return rng.pick(['소개팅이었다. 카페에서 두 시간을 이야기했다.', '같은 회사였다. 점심을 몇 번 같이 먹다가 주말에 따로 만났다.', '친구 모임에서 처음 봤다. 그날 밤 메시지가 먼저 왔다.', '동호회에서 만났다. 처음 둘이 걸은 날은 한강이었다.', sex === 'F' ? '앱에서 만났다. 첫 만남은 지하철역 앞 카페였다.' : '앱에서 만났다. 약속 장소에 먼저 가서 기다렸다.'])
}
/** 첫 만남 뒤 한 문장 */
function meetAfter(rng: Rng, year: number): string {
  return groupOf(year) === 'modern'
    ? rng.pick(['무슨 말을 했는지는 기억나지 않는다.', '헤어지고 나서 집까지 걸어갔다.', '그날 밤 잠을 설쳤다.', '다음 약속을 내가 먼저 잡았다.'])
    : rng.pick(['얼굴을 똑바로 보지 못했다.', '무슨 말을 했는지는 기억나지 않는다.', '그 사람 손이 내 손보다 거칠었다.'])
}
const HOME: Record<Group, string[]> = {
  prehist: ['움집', '강가 막집'],
  ancient: ['초가', '토담집', '움집'],
  joseon: ['초가', '사랑채', '건넌방', '부엌 옆 골방'],
  colonial: ['초가', '토담집', '읍내 셋방'],
  modern: ['단칸방', '연립주택', '아파트', '주택 2층'],
}
const WORKPLACE: Record<Group, string[]> = {
  prehist: ['강가', '숲 가장자리', '조개 무지 옆', '밭머리'],
  ancient: ['논둑', '밭머리', '나루터', '장터'],
  joseon: ['논둑', '밭머리', '장터', '나루터', '뒷산 기슭'],
  colonial: ['논둑', '공장 마당', '읍내 장터', '부둣가'],
  modern: ['일터', '작업장', '사무실', '가게 앞', '현장'],
}

/** 직업 문자열로 일터를 고른다. 현대는 직업이 장소를 결정한다 */
function workplace(rng: Rng, g: Group, job: string): string {
  if (/주부|안주인|가사|살림|직조|길쌈|바느질|침선|가내/.test(job)) return rng.pick(HOME[g])
  if (/사원 노비|승려/.test(job)) return '절 마당'
  if (/노비|머슴|식모|예속민|노역/.test(job)) return '주인집 마당'
  if (/전사|병사|호위|군역|정군|참모/.test(job) && g !== 'modern') return rng.pick(['성 아래', '진지', '훈련터'])
  if (g === 'modern') {
    if (/생산직|공장|여공|제조/.test(job)) return '공장'
    if (/회사원|사무|공무원|은행|간부|사무원|지배인|연구|개발|엔지니어|디자이너|회계|변호사/.test(job)) return '사무실'
    if (/농|협동농장/.test(job)) return '논둑'
    if (/자영업|가게|상점|판매|음식점|상인|행상/.test(job)) return '가게'
    if (/건설|현장|광부|탄광|벌목/.test(job)) return '현장'
    if (/교사|교원|교수|학생/.test(job)) return '교실'
    if (/의사|간호|약사|요양/.test(job)) return '병원'
    if (/배달|물류|운전|택시|운수/.test(job)) return '길 위'
    if (/군|보위|보안/.test(job)) return '부대'
    return '일터'
  }
  if (g === 'colonial') {
    if (/공장|여공|정미소/.test(job)) return '공장 마당'
    if (/부두|철도|광부|탄광/.test(job)) return '부둣가'
    if (/교사|기자|의사|서기|변호사|간호/.test(job)) return '읍내'
    return rng.pick(['논둑', '밭머리'])
  }
  if (/어로|어민|해녀|조개|뱃사공|나루/.test(job)) return rng.pick(['나루터', '갯가'])
  if (/사냥|채집|석기|무두질/.test(job)) return rng.pick(['숲 가장자리', '강가'])
  if (/훈장|서당/.test(job)) return '서당'
  if (/역관|서리|향리|관료|관직|군관|촌주|관인|문반|무반/.test(job)) return '관아'
  if (/보부상|행상|장터|상인|주막/.test(job)) return '장터'
  return rng.pick(WORKPLACE[g])
}


/** 직업군별 장면. scene 은 사건 한 문장, after 는 여운 한 문장. start 가 true 면 일을 시작한 첫해 무렵의 기억 */
interface JobScenes { test: RegExp; scenes: string[]; after: string[]; start?: boolean }
const JOB_SCENES: JobScenes[] = [
  { test: /과거 준비|유생/, scenes: ['과거 보러 한양 가던 길이었다. 짚신이 사흘 만에 닳았다.', '시험장에서 붓을 들었는데 첫 글자가 떠오르지 않았다.', '낙방 소식을 들고 집에 돌아오던 저녁이었다. 아버지는 아무 말이 없었다.', '책을 읽다 잠든 밤, 어머니가 등잔을 꺼 주고 갔다.'], after: ['그 뒤로도 글은 놓지 않았다.', '급제는 끝내 못 했지만 그 길은 오래 기억난다.'] },
  { test: /문반|무반|관료|급제|관직|군관|향리|서리|촌주|관인/, scenes: ['처음 관아에 들어가던 날, 문지기가 내 이름을 물었다.', '첫 녹봉을 받아 집에 가져갔다. 쌀 자루가 생각보다 가벼웠다.', '상관 앞에서 문서를 잘못 읽었다. 방 안이 조용해졌다.', '밤늦게까지 장부를 맞추고 나오니 달이 높았다.'], after: ['그 일을 오래 했다.', '그날 배운 조심성이 평생 남았다.'], start: true },
  { test: /훈장|서당|교사|교원|교수|보통학교/, scenes: ['첫 수업이었다. 아이들 눈이 전부 나를 보고 있었다.', '글을 못 읽던 아이가 처음으로 한 줄을 다 읽었다.', '학생 하나가 집에서 삶은 감자를 가져왔다.', '졸업하는 아이들이 마당에서 절을 했다.'], after: ['가르치는 일을 그만두고도 그 아이들 얼굴은 남았다.', '그 뒤로 오래 그 일을 했다.'] },
  { test: /의사|의관|의녀|간호|약사|의원/, scenes: ['처음 혼자 환자를 본 날이었다. 손이 떨리는 것을 들키지 않으려 했다.', '밤새 열이 오르던 아이가 새벽에 잠들었다.', '살리지 못한 사람의 가족이 오히려 나를 위로했다.', '급한 환자를 업고 뛰던 길이 아직 다리에 남아 있다.'], after: ['그 뒤로 사람 몸 앞에서 함부로 말하지 않았다.', '그날의 손끝 감각이 아직 남아 있다.'] },
  { test: /승려|목사|전도사|무당|주술사|제사장|제의/, scenes: ['처음 의례를 혼자 맡은 날이었다. 목소리가 갈라졌다.', '새벽 예불 종을 치는데 손이 얼어 있었다.', '마을 사람들이 병 낫기를 빌러 왔다. 나는 아는 만큼만 말했다.', '큰비가 온 뒤 첫 제사였다. 사람들이 조용히 모였다.'], after: ['그 뒤로 사람들 앞에 설 때마다 그날이 떠올랐다.', '믿음보다 오래 남은 것은 그날의 조용함이었다.'] },
  { test: /노비|예속민|노역|머슴|식모|가내 노동|잡역/, scenes: ['주인집 마당을 쓸다 해가 뜨는 것을 보았다.', '처음으로 매를 맞지 않고 하루가 끝났다.', '주인집 제삿날 남은 음식을 동생에게 가져다주었다.', '도망간 사람 이야기를 밤에 들었다. 나는 가지 않았다.'], after: ['그 뒤로도 오래 그 집에 있었다.', '그날 밤 생각은 아무에게도 하지 않았다.'] },
  { test: /농|소작|자작|벼|밭|화전|협동농장|경작|농경/, scenes: ['모내기 날이었다. 허리를 펴니 논이 전부 초록이었다.', '가뭄 끝에 비가 왔다. 논둑에 서서 그냥 맞았다.', '첫 타작이었다. 낟알이 마당에 쌓이는 것을 오래 보았다.', '소가 처음으로 내 말을 들었다.', '추수 끝난 저녁, 새 쌀로 밥을 지었다.'], after: ['그 뒤로 해마다 같은 일을 했지만 그날만 남았다.', '땅은 거짓말을 안 한다는 말을 그때 믿게 됐다.'] },
  { test: /어로|어민|해녀|조개|갯일|물질|뱃사공|어선|나루/, scenes: ['처음 깊은 물에 들어간 날이었다. 숨이 생각보다 길었다.', '그물이 찢어질 만큼 고기가 들었다.', '바람이 갑자기 바뀌어 배를 돌렸다. 뭍에 닿고서야 다리가 풀렸다.', '물속에서 해가 흔들리는 것을 보았다.'], after: ['바다는 그 뒤로도 늘 같았다.', '그날 이후 바람 냄새로 날씨를 알게 됐다.'] },
  { test: /사냥|덫|큰 짐승/, scenes: ['처음 큰 짐승을 잡은 날이었다. 무리가 밤새 불을 피웠다.', '사흘을 쫓고도 놓쳤다. 돌아오는 길에 아무도 말하지 않았다.', '눈 위의 발자국이 새것이었다. 심장이 먼저 뛰었다.', '다친 동료를 업고 돌아왔다. 짐승은 두고 왔다.'], after: ['그 뒤로 숲에 들어갈 때마다 그날이 떠올랐다.', '고기보다 그날 불빛이 오래 남았다.'] },
  { test: /채집|도토리|산나물|열매/, scenes: ['도토리가 유난히 많이 떨어진 가을이었다. 바구니를 세 번 채웠다.', '처음 보는 열매를 먹지 않기로 했다. 그게 맞았다.', '아이들을 데리고 산에 올랐다. 돌아오는 길에 하나가 잠들었다.'], after: ['그 산길은 눈 감고도 걸을 수 있다.', '겨울을 넘길 수 있겠다고 그날 처음 생각했다.'] },
  { test: /석기|토기|옥|장신구|대장장이|옹기|목수|갓|유기|청동|주조|장인|도자|피혁|유기 제조|가공/, scenes: ['처음으로 물건이 내 손에서 제대로 나왔다. 아무도 안 보는데 혼자 웃었다.', '가마를 열었는데 반이 깨져 있었다. 남은 반이 좋았다.', '스승이 내 것을 보고 아무 말 없이 고개를 끄덕였다.', '밤새 불을 지켰다. 새벽에 손이 화상투성이였다.'], after: ['그날의 손끝 감각이 아직 남아 있다.', '그 뒤로 물건에 내 표를 남겼다.'] },
  { test: /길쌈|직조|가락바퀴|바느질|침선|재봉|방직|여공|봉제/, scenes: ['처음 짠 베를 장에 내다 팔았다. 값을 깎이고도 좋았다.', '밤새 베틀 앞에 앉아 있었다. 새벽에 손가락이 굳어 있었다.', '공장 기계가 멈춘 날, 처음으로 낮에 하늘을 봤다.', '실이 끊어지지 않고 하루가 갔다. 그런 날은 드물었다.'], after: ['그 뒤로 옷감을 만지면 그날이 떠오른다.', '손은 그 일을 잊지 않았다.'] },
  { test: /행상|보부상|교역/, scenes: ['장이 서는 날 새벽에 짐을 지고 나갔다. 다 팔고 빈 지게로 돌아왔다.', '고개를 넘다 비를 만났다. 물건을 먼저 덮고 나는 다 젖었다.', '낯선 마을에서 하룻밤을 얻어 잤다. 그 집 아이가 내 짐을 신기해했다.', '외상값을 못 받고 돌아서는데 뒤에서 불러 세웠다.'], after: ['길에서 보낸 날이 집에서 보낸 날보다 많았다.', '그 고갯길은 지금도 걸음 수까지 기억난다.'] },
  { test: /상|장터|점원|판매|가게|자영업|음식점|주막|상점/, scenes: ['처음 가게 문을 연 날이었다. 첫 손님이 물만 마시고 갔다.', '장이 서는 날 새벽에 짐을 지고 나갔다. 다 팔고 빈 지게로 돌아왔다.', '외상값을 못 받고 돌아서는데 뒤에서 불러 세웠다.', '단골이 처음으로 내 이름을 불렀다.'], after: ['장사는 그 뒤로도 늘 그랬다. 좋은 날과 빈 날이 번갈아 왔다.', '그날 첫 손님 얼굴은 아직 기억난다.'] },
  { test: /전사|군|장교|병사|호위|보위|보안|군역|정군|참모/, scenes: ['첫 훈련에서 넘어졌다. 아무도 웃지 않았다.', '처음 무기를 손에 쥔 날, 생각보다 무거웠다.', '보초를 서다 새벽이 오는 것을 보았다.', '전우 하나가 돌아오지 못한 날, 밥이 넘어가지 않았다.'], after: ['그 뒤로 큰 소리에 몸이 먼저 반응했다.', '그날 이후 밤을 무서워하지 않게 됐다.'] },
  { test: /생산직|공장|제조|정미소|고무신|광부|탄광|벌목|부두|철도|건설|현장|노동자|노무자/, scenes: ['첫 월급날이었다. 봉투째 어머니에게 드렸다.', '야근이 끝나고 나오니 해가 뜨고 있었다.', '기계가 멈춰 처음으로 낮에 앉아 있었다.', '같이 일하던 사람이 다쳤다. 그날 이후 장갑을 벗지 않았다.', '처음으로 내가 만든 물건이 트럭에 실려 나가는 것을 보았다.'], after: ['그 뒤로 오래 그 일을 했다.', '몸이 먼저 기억하는 일이었다.'] },
  { test: /회사원|사무|공무원|은행|기업|직원|개발자|엔지니어|디자이너|연구|회계|변호사|기자|지배인|간부|사무원/, scenes: ['첫 출근 날이었다. 출입증을 세 번 확인했다.', '처음 맡은 일을 끝내고 퇴근하는데 다리가 풀렸다.', '큰 실수를 했고, 상사가 대신 사과했다.', '밤새 일하고 새벽 첫차를 탔다. 창밖이 파랬다.', '승진 소식을 들은 날 저녁, 집에 가서 아무 말도 안 했다.'], after: ['그 뒤로 오래 그 일을 했다.', '그날 배운 것이 나머지 일을 버티게 했다.'] },
  { test: /운전|택시|배달|물류|운수|인력거|운전수|길 위/, scenes: ['처음 혼자 핸들을 잡고 나간 날이었다. 손바닥이 젖었다.', '새벽 길이 텅 비어 있었다. 그때만 그 도시가 내 것 같았다.', '길에서 쓰러진 사람을 병원까지 태워다 주었다.', '비 오는 밤, 손님이 남긴 우산이 아직 차에 있다.'], after: ['길은 그 뒤로도 매일 달랐다.', '그날 이후 새벽을 좋아하게 됐다.'] },
  { test: /주부|가사|안주인|살림/, scenes: ['처음 혼자 김장을 한 날이었다. 손이 밤새 얼얼했다.', '아이 셋 밥을 차리고 나니 내 밥은 식어 있었다.', '집안 제사를 처음 혼자 치렀다. 시어머니가 아무 말 없이 상을 보았다.', '장을 담그고 뒤란에 항아리를 놓았다. 그해 장이 제일 맛있었다.'], after: ['그 뒤로 집 안의 일은 늘 내 몫이었다.', '그날 손맛이 아이들 기억에도 남았다고 했다.'] },
  { test: /학생|대학생/, scenes: ['시험 전날 밤, 창밖으로 눈이 왔다.', '처음 친구 집에서 자고 온 날이었다.', '선생님이 내 글을 반 앞에서 읽어 주었다.', '수학여행 버스에서 노래를 불렀다. 목이 쉬었다.'], after: ['그때 친구들 이름은 아직 다 기억난다.', '그날이 어린 시절의 마지막 같았다.'] },
  { test: /장마당|배급|외화벌이|예술단|노동당|기업소/, scenes: ['배급이 끊긴 달, 처음으로 장마당에 나가 물건을 팔았다.', '총화 시간에 내 이름이 불렸다. 손에 땀이 났다.', '농장 작업이 끝나고 돌아오는 길에 별이 많았다.', '외화 물건을 처음 만져 본 날이었다.'], after: ['그 뒤로 오래 그 일을 했다.', '그날 이후 말을 줄였다.'] },
  { test: /촌락장|군장|연장자|길잡이|이야기꾼|중재/, scenes: ['처음 무리 앞에서 결정을 내린 날이었다. 아무도 반대하지 않아서 더 무서웠다.', '두 집안이 다투는 것을 밤새 들었다. 새벽에 양쪽이 고개를 끄덕였다.', '아이들에게 옛이야기를 처음으로 끝까지 해 주었다.'], after: ['그 뒤로 사람들이 나를 찾았다.', '그날부터 잠이 얕아졌다.'] },
  { test: /불 지킴이|움막|가죽|무두질/, scenes: ['밤새 불을 꺼뜨리지 않았다. 아침에 모두가 아무 말 없이 불 곁에 앉았다.', '큰 짐승 가죽을 처음 혼자 손질했다. 손에 냄새가 며칠 갔다.', '움막 지붕을 고치고 나니 비가 왔다.'], after: ['그 뒤로 불은 늘 내 몫이었다.', '그날 손 냄새는 오래 남았다.'] },
]
const JOB_GENERIC: JobScenes = { test: /./, scenes: ['그날 처음으로 일이 손에 익었다는 것을 느꼈다.', '같이 일하던 사람이 내 이름을 처음 불러 주었다.', '해가 지도록 끝나지 않았고, 그래도 좋았다.', '실수를 했고, 아무도 나무라지 않았다.'], after: ['그 뒤로 오래 그 일을 했다.', '그날의 손끝 감각이 아직 남아 있다.'] }
function jobScenes(job: string): JobScenes {
  return JOB_SCENES.find((j) => j.test.test(job)) ?? JOB_GENERIC
}

/** 1→첫째, 2→둘째 … */
export function ordinal(n: number): string {
  const w = ['', '첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째']
  return w[n] ?? `${n}째`
}

function withParticle(word: string, a: string, b: string): string {
  const s = word.replace(/[^가-힣]+$/g, '')
  const ch = s.charCodeAt(s.length - 1)
  const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0
  return has ? a : b
}

function jobPhrase(job: string): string {
  // "은퇴 · 전직 X", "X, 45세 이후 Y", "X (…)" 를 정리
  let j = job.replace(/^은퇴 · 전직 /, '').replace(/\s*\([^)]*\)/g, '').replace(/,.*$/, '').trim()
  if (j.startsWith('대학생')) j = '대학생'
  return j
}

function home(life: Life, rng: Rng, g: Group): string {
  const elite = life.socialClass.value.hazard < 0.9
  if (g === 'joseon') return rng.pick(elite ? ['사랑채', '안채', '건넌방'] : ['초가', '건넌방', '부엌 옆 골방'])
  if (g === 'modern' && life.country.value.north) return rng.pick(['살림집', '농장 마을 집'])
  return rng.pick(HOME[g])
}

function whoWasThere(life: Life, rng: Rng, ageAtDeath: number): string {
  const f = life.family.value
  const spouseAlive = f.married && f.widowedAt === undefined && f.divorcedAt === undefined
  if (spouseAlive && rng.chance(0.8)) return ageAtDeath - (f.marriedAt ?? ageAtDeath) >= 10 ? '곁에는 오래 같이 산 사람이 있었다' : '곁에는 같이 사는 사람이 있었다'
  if (f.childrenSurvived > 0) return f.childrenSurvived === 1 ? '하나 남은 아이가 손을 잡고 있었다' : rng.pick(['막내가 손을 잡고 있었다', '큰아이가 머리맡에 앉아 있었다', '아이들이 방 안에 다 모여 있었다'])
  if (f.siblingsSurvived > 0) return rng.pick(['동생이 물을 떠다 놓았다', '형제 하나가 곁을 지켰다'])
  return rng.pick(['이웃이 들여다보고 갔다', '혼자였지만 조용했다'])
}

function lastDay(life: Life, rng: Rng): { title: string; body: string } | { omitted: string } {
  const d = life.death.value!
  const g = groupOf(d.year)
  const season = rng.pick(SEASONS)
  const cause = d.cause
  if (/자살/.test(cause)) return { omitted: '마지막 날의 기억은 남기지 않았습니다.' }
  const title = `마지막 날 · ${formatYear(d.year)} ${season}, ${d.age}세`
  const who = whoWasThere(life, rng, d.age)
  const region = life.country.value.region.replace(/\s*\(.*\)$/, '')
  let where: string
  let scene: string
  if (d.event && /베트남전/.test(d.event)) {
    // 파병 전사: 전장
    where = rng.pick(['베트남의 정글', '낯선 나라의 진지', '헬기가 내리던 벌판'])
    scene = rng.pick(['파병 두 해째였다. 더위가 낯설었다.', '새벽 순찰이었다. 소리는 앞에서 났다.', '편지를 쓰다 말고 나갔다. 그 편지는 부치지 못했다.'])
    const nearby = rng.pick(['전우가 곁에 있었다', '같이 간 사람들은 먼저 흩어졌다'])
    const tail = rng.pick(['마지막에 떠오른 것은 고향 집 마당이었다.', '소리가 먼저 사라졌다.'])
    return { title, body: `${where}${withParticle(where, '이었다', '였다')}. ${scene} ${nearby}. ${tail}` }
  }
  if (d.event && /전쟁|전투|폭격|학살|토벌|전사|약탈|포로|처형/.test(cause) && !/기근/.test(cause)) {
    // 전쟁·학살: 곁에 가족이 있는 병상 문장을 쓰지 않는다
    where = rng.pick(['마을 어귀', '피난 가던 길', '집 뒤 골짜기', '읍내 근처', '강나루'])
    scene = rng.pick([`${d.event} 때였다. 아침부터 마을 밖에서 소리가 났고, 사람들이 흩어졌다.`, `${d.event} 때였다. 밤에 떠나기로 했는데 그날 낮에 먼저 왔다.`, `${d.event} 때였다. 숨을 곳을 찾다가 늦었다.`])
    const nearby = rng.pick(['같이 있던 사람들은 흩어졌다', '가족은 나중에야 알았다', '옆에 모르는 사람이 쓰러져 있었다', '아이들은 먼저 보냈다'])
    const tail = rng.pick(['아프다는 느낌보다 놀람이 먼저였다.', '마지막에 떠오른 것은 아침에 두고 온 밥상이었다.', '소리가 먼저 사라졌다.'])
    return { title, body: `${where}${withParticle(where, '이었다', '였다')}. ${scene} ${nearby}. ${tail}` }
  }
  if (d.event) {
    // 기근·역병 사건 (임진왜란 기근·역병 사망 포함): 집에서, 가족이 곁에
    where = home(life, rng, g)
    const ev = d.event.replace(/\s*\(\d{4}\)$/, '') // 문장에서는 연도 괄호를 뺀다
    scene = /기근/.test(cause)
      ? `${ev} 두 해째였다. 먹을 것이 며칠째 없었고, 몸이 가벼워져 있었다.`
      : /괴질|호열자|콜레라/.test(cause)
        ? `${ev}${withParticle(ev, '이', '가')} 마을을 지나던 해였다. 토하고 설사한 지 하루 만이었다. 물이 자꾸 빠져나갔다.`
        : /독감/.test(cause)
          ? `${ev}${withParticle(ev, '이', '가')} 마을을 지나던 해였다. 열이 오르고 기침이 멎지 않았다. 옆집도 같은 병이었다.`
          : `${ev}${withParticle(ev, '이', '가')} 마을을 지나던 해였다. 열이 며칠째 내리지 않았다.`
  } else if (/충돌|폭력|형벌|처형|학살|전투|맹수|습격|사냥 중 부상/.test(cause)) {
    // 폭력·짐승·싸움: 병상 문장을 쓰지 않는다
    let nearby: string
    if (/맹수|습격/.test(cause)) {
      where = rng.pick(['숲 가장자리', '물가', '무리에서 조금 떨어진 곳'])
      scene = rng.pick(['짐승 소리를 먼저 들었다. 돌아설 틈이 없었다.', '새끼를 데리고 있던 놈이었다. 내가 길을 잘못 들었다.'])
      nearby = rng.pick(['무리가 소리를 듣고 달려왔다', '혼자였다'])
    } else if (/사냥 중 부상/.test(cause)) {
      where = rng.pick(['숲 가장자리', '움집'])
      scene = rng.pick(['짐승이 먼저 움직였다. 상처는 며칠 뒤에 덧났다.', '창이 빗나갔고 다리를 다쳤다. 열이 나기 시작한 것은 사흘째였다.'])
      nearby = rng.pick(['무리가 번갈아 곁을 지켰다', '아이들이 밖에서 기다렸다'])
    } else if (/충돌|전투/.test(cause)) {
      where = rng.pick(['강 건너 벌판', '움집 앞', '무리의 경계'])
      scene = rng.pick(['다른 무리가 강 건너에서 왔다. 싸움은 오래 걸리지 않았다.', '먹을 것을 두고 시작된 다툼이었다. 돌이 날아왔다.', '우리 쪽이 먼저 갔다. 나는 앞줄에 있었다.'])
      nearby = rng.pick(['같이 간 사람들이 나를 끌어냈다', '혼자 남았다'])
    } else {
      // 폭력·형벌·처형·학살
      where = rng.pick(['관아 앞', '장터', '마을 어귀'])
      scene = rng.pick(['매를 맞은 지 사흘째였다. 일어나지 못했다.', '장터 싸움에 휘말렸다. 누가 먼저였는지는 기억나지 않는다.', '끌려간 사람들 속에 내가 있었다. 이유는 끝내 듣지 못했다.'])
      nearby = rng.pick(['가족은 뒤늦게 알았다', '아무도 가까이 오지 못했다'])
    }
    const tail = rng.pick(['아프다는 느낌보다 놀람이 먼저였다.', '마지막에 떠오른 것은 아침에 두고 온 불이었다.', '소리가 먼저 사라졌다.'])
    return { title, body: `${where}${withParticle(where, '이었다', '였다')}. ${scene} ${nearby}. ${tail}` }
  } else if (/기근|굶주림|영양실조|아사/.test(cause)) {
    where = home(life, rng, g)
    scene = rng.pick(['먹을 것이 며칠째 없었다. 몸이 가벼워져 있었다.', /봄/.test(season) ? '보리가 패기 전인데 곳간이 비어 있었다. 물만 자주 마셨다.' : '곳간이 빈 지 오래였다. 물만 자주 마셨다.', '풀뿌리도 다 캐고 난 뒤였다. 배고픔이 어느 순간 사라졌다.'])
  } else if (d.maternal) {
    where = home(life, rng, g)
    scene = rng.pick(['아이 울음소리는 들었다. 그다음은 기억이 흐리다.', g === 'prehist' || g === 'ancient' ? '여자들이 오래 곁에 붙어 있었다. 불을 크게 피웠다.' : '산파가 오래 붙어 있었다. 방이 더웠다.', '아이를 낳고 사흘째였다. 열이 올랐다.'])
  } else if (/노환|노쇠/.test(cause)) {
    where = home(life, rng, g)
    scene = rng.pick(['며칠 전부터 밥을 못 넘겼다. 아프지는 않았다.', '숨이 느려지는 것을 스스로 알았다.', '아침에 눈을 뜨니 볕이 방 안까지 들어와 있었다.'])
  } else if (/중풍|뇌졸중|뇌혈관|심장|고혈압/.test(cause)) {
    // 급성: 쓰러진 날
    where = d.year >= 1980 && rng.chance(0.6) ? `${region} 근처 병원` : home(life, rng, g)
    scene = rng.pick(['아침에 일어나다 쓰러졌다. 그 뒤로는 소리만 들렸다.', '며칠 전부터 한쪽 손이 말을 듣지 않았다. 그날은 말이 먼저 어눌해졌다.', '밭에서 돌아와 앉았는데 가슴이 조여 왔다.'])
  } else if (/암|간질환|당뇨|치매|알츠하이머|폐렴|만성|코로나/.test(cause)) {
    // 만성·오래 앓은 병
    where = d.year >= 1980 && rng.chance(0.75) ? `${region} 근처 병원` : home(life, rng, g)
    scene = d.year >= 1980
      ? rng.pick(['병원에 들어온 지 여러 날이었다. 창밖이 잘 보이는 자리였다.', '기계 소리가 낮게 났다. 잠이 자주 왔다.', '오후에 잠깐 정신이 맑았다. 그때 사람들 얼굴을 봤다.'])
      : rng.pick(['앓은 지 한 해가 넘었다. 몸이 절반으로 줄어 있었다.', '오래 누워 지냈다. 그날은 이상하게 통증이 없었다.'])
  } else if (/추위/.test(cause)) {
    where = home(life, rng, g)
    scene = rng.pick(['눈이 사흘째 왔다. 불이 새벽에 꺼졌다.', '땔감이 떨어진 지 여러 날이었다. 잠이 자꾸 왔다.'])
  } else if (/치아|소화|위장|체증|적취/.test(cause)) {
    where = home(life, rng, g)
    scene = rng.pick(['밥을 못 넘긴 지 오래됐다. 물만 조금씩 마셨다.', '배가 아픈 지 한 달이 넘었다. 그날은 아프지 않았다.'])
  } else if (/익사|사고|추락|낙마|화재|교통|운수|산업재해/.test(cause)) {
    // 사고사: 장소는 사인이 정하고, 곁에 가족이 있었다는 문장은 쓰지 않는다
    const job = jobPhrase(life.occupation.value)
    if (/교통|운수/.test(cause)) where = rng.pick(['국도 위', '집 근처 길', '읍내 도로'])
    else if (/익사/.test(cause)) where = rng.pick(g === 'prehist' || g === 'ancient' ? ['강가', '냇가', '바닷가'] : ['강가', '바닷가', '저수지 둑'])
    else if (/군/.test(cause)) where = '부대 근처'
    else if (/낙마/.test(cause)) where = rng.pick(['고갯길', '장터 가는 길'])
    else if (/화재/.test(cause)) where = home(life, rng, g)
    else where = workplace(rng, g, job) // 산업재해·추락·기타 사고
    scene = rng.pick(['평소와 같은 아침이었다. 순간이었다.', '그날 일은 반쯤 끝나 있었다. 생각할 겨를이 없었다.', '오후였고, 날이 맑았다. 갑작스러웠다.'])
    const nearby = rng.pick(['같이 있던 사람들이 달려왔다', '모르는 사람들이 먼저 왔다', '혼자였다', '가족은 나중에야 알았다'])
    const tail = rng.pick(['마지막에 떠오른 것은 아침에 두고 온 밥상이었다.', '아프다는 느낌은 없었다.', '소리가 먼저 사라졌다.'])
    return { title, body: `${where}${withParticle(where, '이었다', '였다')}. ${scene} ${nearby}. ${tail}` }
  } else {
    // 감염병·역병·결핵·굶주림 등
    where = home(life, rng, g)
    scene = rng.pick(['열이 며칠째 내리지 않았다. 물을 자주 찾았다.', '기침이 오래갔다. 겨울 내내 그랬다.', '앓아누운 지 열흘쯤 됐다. 방이 조용했다.'])
  }
  const tail = rng.pick(['오래전 일들이 순서 없이 떠올랐다.', '마지막에 떠오른 것은 어릴 적 집이었다.', '무섭지는 않았다.', '바깥 소리가 점점 멀어졌다.'])
  return { title, body: `${where}${withParticle(where, '이었다', '였다')}. ${scene} ${who}. ${tail}` }
}

export function lifeMemories(life: Life): LifeMemories | null {
  const d = life.death.value
  const ageReached = d ? d.age : CURRENT_YEAR - life.birthYear
  if (ageReached < 15) return null
  const rng = new Rng((life.seed ^ 0x9e3779b9) >>> 0)
  const f = life.family.value
  const g = groupOf(life.birthYear)
  const region = life.country.value.region.replace(/\s*\(.*\)$/, '')

  // 살아서 지난 역사 사건 (5세 이후)
  const lived: { name: string; age: number; cause: string }[] = []
  for (let a = 6; a < ageReached; a++) {
    for (const e of eventsAt(life.birthYear + a, life.country.value)) {
      if (e.extra < 0.003) continue // 파병·코로나처럼 일상에 남지 않는 미세 사건은 제외
      if (!lived.some((x) => x.name === e.name)) lived.push({ name: e.name, age: a, cause: e.cause })
    }
  }

  const cands: { kind: Memory['kind']; w: number }[] = [{ kind: '직업', w: 25 }, { kind: '부모', w: 15 }]
  if (f.married) cands.push({ kind: '배우자', w: 20 })
  if (f.childrenBorn > 0) cands.push({ kind: '자녀', w: 20 })
  if (lived.length > 0) cands.push({ kind: '역사 사건', w: 30 })
  const kind = rng.weighted(cands.map((c) => ({ v: c.kind, w: c.w })))

  const season = rng.pick(SEASONS)
  const north = !!life.country.value.north
  const senseFor = (a: number, place: Place | 'weather') => sensePrefix(rng, life.birthYear + a, north, season, place)
  let age: number
  let body: string
  const job = jobPhrase(life.occupation.value)

  switch (kind) {
    case '배우자': {
      const widowed = f.widowedAt !== undefined && rng.chance(0.5)
      age = widowed ? f.widowedAt! : f.marriedAt!
      body = widowed
        ? `${senseFor(age, 'home')}그 사람이 누운 지 며칠째였다. 내가 ${age}세, 같이 산 지 ${age - f.marriedAt!}년이었다. ${rng.pick(['이름을 불러도 대답이 느렸다.', '손이 차가워지는 것을 내가 먼저 알았다.'])} ${rng.pick(['그 뒤로 나는 오래 혼자 밥을 먹었다.', '그날 이후 집이 넓어졌다.'])}`
        : `${senseFor(age, 'weather')}${meetSpouse(rng, life.birthYear + age, north, life.sex)} 내가 ${age}세였다. ${meetAfter(rng, life.birthYear + age)} ${f.widowedAt !== undefined ? `그 사람과 ${f.widowedAt - age}년을 살았다.` : f.divorcedAt !== undefined ? `그 뒤 ${f.divorcedAt - age}년을 같이 살았다.` : '그 뒤로 줄곧 같이 살았다.'}`
      break
    }
    case '자녀': {
      const lost = f.childrenSurvived < f.childrenBorn && rng.chance(0.5)
      if (lost) {
        age = Math.min(ageReached, f.marriedAt! + 3 + rng.int(0, 10))
        const bore = life.sex === 'F' ? '낳아' : '얻어'
        body = `${senseFor(age, 'home')}아이 하나가 열이 내리지 않은 지 사흘째였다. 내가 ${age}세였다. ${rng.pick(['밤새 이마에 손을 얹고 있었다.', '아무것도 먹이지 못했다.'])} ${f.childrenBorn}명을 ${bore} ${f.childrenSurvived}명을 키웠는데, 그 아이 생각이 제일 자주 난다.`
      } else {
        age = Math.min(ageReached, f.marriedAt! + 1 + rng.int(0, 3))
        body = `${senseFor(age, 'home')}${f.childrenBorn === 1 ? '아이가' : '첫아이가'} 처음으로 ${rng.pick([life.sex === 'F' ? '내 등에서 소리를 냈다' : '내 무릎에 올라왔다', '혼자 걸었다', '내 이름 비슷한 것을 불렀다'])}. 내가 ${age}세였다. ${rng.pick(['그날 일은 손에 잡히지 않았다.', life.sex === 'F' ? '그 뒤로 아이를 업고 일하러 나갔다.' : '그날은 일찍 집에 돌아왔다.'])} ${f.childrenBorn > 1 ? `그 아래로 ${f.childrenBorn - 1}명이 더 태어났다.` : '그 아이 하나였다.'}`
      }
      break
    }
    case '부모': {
      age = rng.int(7, 14)
      const father = jobPhrase(f.fatherJob)
      {
        const modern = groupOf(life.birthYear + age) === 'modern'
        const scene = modern
          ? rng.pick(['현관에서 구두 신는 소리를 들었다.', '출근길에 학교 앞까지 태워다 주었다.', '늦게 들어와 내 방 문을 열어 보고 갔다.', '쉬는 날 처음으로 일터에 데려가 주었다.'])
          : rng.pick(['따라나섰다가 돌려보내졌다.', '뒷모습을 문틈으로 보았다.', '그날 처음으로 일을 거들었다.'])
        const mother = modern
          ? rng.pick(['어머니는 아무 말이 없었다.', '어머니가 도시락을 가방에 넣어 주었다.', '어머니는 그날도 나보다 먼저 나갔다.'])
          : rng.pick(['어머니는 아무 말이 없었다.', '어머니가 남은 밥을 내 그릇에 덜어 주었다.'])
        body = `${senseFor(age, 'home')}${modern ? `아버지가 ${father}${withParticle(father, '으로', '로')} 일하던 때였다.` : `아버지가 ${father}${withParticle(father, '으로', '로')} 나가던 아침이었다.`} 내가 ${age}세, ${f.siblingsBorn === 0 ? '외동이었다' : `${f.siblingsBorn + 1}남매 중 ${ordinal(f.birthOrder)}였다`}. ${scene} ${mother}`
      }
      break
    }
    case '역사 사건': {
      const e = rng.pick(lived)
      age = e.age
      // 아이였으면 어른 일터가 아니라 집·학교 근처
      const place = age < 15 ? rng.pick(['집 마당', groupOf(life.birthYear + age) === 'modern' ? '학교 가는 길' : '마을 어귀', '동네 어귀']) : rng.pick(WORKPLACE[g])
      body = `${e.name} 때였다. 내가 ${age}세였다. ${senseFor(age, 'street')}${/기근/.test(e.cause) ? rng.pick(['그해에는 봄이 와도 먹을 것이 없었다. 마을에서 몇 집이 비었다.', '풀뿌리를 캐러 다녔다. 어른들이 말수가 줄었다.']) : /전쟁|전투|폭격|학살|토벌|침입|약탈/.test(e.cause) ? rng.pick([`${place}에 있다가 소리를 듣고 숨었다. 며칠 뒤 돌아온 마을은 조용했다.`, '사람들이 밤에 떠났다. 우리 집은 남았다.']) : rng.pick(['옆집부터 앓기 시작했다. 우리 집은 문을 닫아걸었다.', '마을에 곡소리가 끊이지 않던 해였다.'])} ${rng.pick(['그 뒤로 배부른 날을 당연하게 여기지 않았다.', '그때 살아남은 것이 지금도 이상하다.', '그해 이야기는 오래 하지 않았다.'])}`
      break
    }
    default: {
      const js = jobScenes(job)
      let startAge = /학생/.test(job) ? rng.int(10, 17) : g === 'modern' ? rng.int(19, 28) : /훈장|관료|관직|향리|의관|의녀|역관|승려|주술사|제사장|촌락장|군장/.test(job) ? rng.int(20, 28) : rng.int(15, 20)
      if (/주부|안주인|살림/.test(job) && f.marriedAt !== undefined) startAge = Math.max(startAge, f.marriedAt)
      age = Math.min(ageReached, js.start ? startAge + rng.int(0, 2) : /학생/.test(job) ? rng.int(startAge, 18) : rng.int(startAge, 50))
      const place = workplace(rng, g, job)
      const scene = rng.pick(js.scenes)
      if (/처음|첫/.test(scene)) age = Math.min(ageReached, startAge + rng.int(0, 2))
      // 첫 문장 형식을 셋 중 하나로 돌려 반복을 줄인다
      const sp = placeOfWorkplace(place)
      const opener = rng.pick([
        `${senseFor(age, sp)}${place}${withParticle(place, '이었다', '였다')}.`,
        `${place}에서 ${job}${withParticle(job, '으로', '로')} ${/전사|군|병사|학생|주부|안주인|노비|예속민/.test(job) ? '지내던' : '일하던'} 때였다. ${senseFor(age, sp)}`,
        `${senseFor(age, sp)}`,
      ])
      body = `${opener}${opener && !opener.endsWith(' ') ? ' ' : ''}${scene} 내가 ${age}세였다. ${rng.pick(js.after)}`
    }
  }
  const year = life.birthYear + age
  const best: Memory = { kind, title: `가장 기억에 남는 하루 · ${formatYear(year)} ${season}, ${age}세 · ${region}`, body }
  const out: LifeMemories = { best }
  if (d) {
    const l = lastDay(life, rng)
    if ('omitted' in l) out.lastOmitted = l.omitted
    else out.last = l
  }
  return out
}

// eraOf 는 시대 라벨용으로 남겨 둔다 (향후 어휘 확장)
export const _eraOf = eraOf
