// 초상 묶음 생성: OpenAI Images API 로 시대군 × 성별 × 계층 × 나이대 × 변형 만큼 흑백 초상을 만든다.
// 사용 (제공자는 --provider 로 고르거나, 키가 있는 것을 자동 선택: gemini > openai > pollinations):
//   node scripts/gen-portraits.mjs --dry-run                                  # 프롬프트만 출력
//   node scripts/gen-portraits.mjs --provider pollinations --limit 1         # 키 없이 무료 (FLUX)
//   GEMINI_API_KEY=... node scripts/gen-portraits.mjs --limit 1              # Google AI Studio 무료 등급 (하루 500장)
//   OPENAI_API_KEY=... node scripts/gen-portraits.mjs --limit 1              # OpenAI (유료)
// 옵션: --model, --quality low|medium (OpenAI), --only south-f-common-young, --limit N
// 결과: public/portraits/<key>.png, src/data/portraits-manifest.json 갱신. 키는 파일에 저장하지 않는다.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def }
const DRY = args.includes('--dry-run')
const LIMIT = Number(opt('--limit', '0')) || Infinity
const MODEL = opt('--model', 'gpt-image-2')
const QUALITY = opt('--quality', 'low')
const ONLY = opt('--only', null) // 쉼표로 여러 접두어 (예: ancient,joseon,north-f-elite-young-0)
const ONLY_LIST = ONLY ? ONLY.split(',').map((x) => x.trim()).filter(Boolean) : null
const VARIANT_ONLY = opt('--variant', null) // 특정 변형 번호만 (예: --variant 1)
const REDO = args.includes('--redo') // 이미 있는 파일도 다시 만든다. 기존 파일은 archive/portraits-old/ 로 옮겨 둔다
const KEY = process.env.OPENAI_API_KEY
const GKEY = process.env.GEMINI_API_KEY
const PROVIDER = opt('--provider', GKEY ? 'gemini' : KEY ? 'openai' : 'pollinations')
if (!DRY && PROVIDER === 'openai' && !KEY) { console.error('OPENAI_API_KEY 환경변수가 필요합니다.'); process.exit(1) }
if (!DRY && PROVIDER === 'gemini' && !GKEY) { console.error('GEMINI_API_KEY 환경변수가 필요합니다. https://aistudio.google.com 에서 무료 발급'); process.exit(1) }
for (const [name, v] of [['OPENAI_API_KEY', KEY], ['GEMINI_API_KEY', GKEY]]) if (v && /[^\x21-\x7e]/.test(v)) { console.error(`${name} 에 영문·숫자가 아닌 글자가 들어 있습니다. 자리표시 문구 대신 실제 키를 넣어 주세요.`); process.exit(1) }

const GROUPS = ['prehist', 'ancient', 'joseon', 'colonial', 'south', 'north']
const SEXES = ['m', 'f']
const TIERS = ['elite', 'common', 'low']
const AGES = ['child', 'young', 'middle', 'old']
const VARIANTS = 2
// 선택 태그: 남한 남성 청년 이상에만 안경 변형을 덧붙인다 (나중에 'heavy' 등을 같은 자리에 추가)
const tagsFor = (g, s, a) => (g === 'south' && s === 'm' && a !== 'child' ? ['', 'glasses'] : [''])
const TAG_WORDS = { glasses: 'wearing plain thin-rimmed glasses, no lens reflections' }
// 변형마다 얼굴형·체격·표정·빛 방향을 달리 적어 같은 묶음 안에서 인상이 갈리게 한다
const VARIANT_WORDS = [
  'Round face with a broad jaw and full cheeks, single-fold eyelids, thick straight eyebrows, stocky build. Expression calm and slightly stern. Key light from the left.',
  'Long narrow face with high cheekbones and a pointed chin, double-fold eyelids, thin arched eyebrows, slender build. Expression soft with the hint of a smile. Key light from the right.',
]

const AGE_WORDS = { child: 'a child about 10 years old', young: 'a young adult in their mid-20s', middle: 'a middle-aged person about 45 years old', old: 'an elderly person about 70 years old' }
const SEX_WORDS = { m: 'Korean man', f: 'Korean woman' }
const SEX_CHILD = { m: 'Korean boy', f: 'Korean girl' }

// 시대군 × 계층 × 성별 복식. 고증 명사를 구체적으로 적고, 한푸·기모노를 금지한다.
function costume(group, tier, sex, age) {
  const f = sex === 'f'
  // 미혼 아이는 상투·쪽 대신 땋은 머리에 댕기 (삼국~조선 공통). 모자·망건·비녀 없음
  if (age === 'child' && (group === 'ancient' || group === 'joseon')) {
    const era = group === 'ancient' ? 'Ancient Korea, Three Kingdoms to Goryeo period (not Chinese, not Japanese)' : 'Joseon dynasty Korea, traditional Korean hanbok (not Chinese hanfu, not Japanese kimono)'
    const cloth = tier === 'elite' ? 'silk jeogori with a white dongjeong collar strip' : tier === 'low' ? 'coarse undyed hemp jeogori with a white dongjeong collar strip' : 'undyed cotton jeogori with a white dongjeong collar strip'
    return `${era}. Unmarried child: hair parted in the center and woven into a single long braid hanging down the back, tied at the end with a daenggi ribbon, no topknot, no bun, no headband, no hat, no hairpin, ${cloth}`
  }
  switch (group) {
    case 'prehist':
      return f ? 'Late Paleolithic to Bronze Age Korea. Hair tied back roughly, plain hide or coarse hemp garment over one shoulder, no ornaments' + (tier === 'elite' ? ', a single jade or shell pendant' : '')
               : 'Late Paleolithic to Bronze Age Korea. Rough hair, plain hide or coarse hemp garment, weathered skin' + (tier === 'elite' ? ', a bronze or jade pendant' : '')
    case 'ancient':
      return f ? 'Ancient Korea, Three Kingdoms to Goryeo period (Goguryeo tomb mural style clothing, not Chinese, not Japanese). Hair parted in the center and gathered into a low knot at the nape, ' + (tier === 'elite' ? 'cross-collared silk jeogori with a contrasting dark collar band and wide sleeves, a single small hair ornament' : tier === 'low' ? 'coarse undyed hemp jeogori with a plain collar, no ornaments, sun-weathered skin' : 'plain undyed hemp jeogori with a dark collar band, no ornaments')
               : 'Ancient Korea, Three Kingdoms to Goryeo period (Goguryeo tomb mural style clothing, not Chinese, not Japanese). ' + (tier === 'elite' ? 'cross-collared silk robe with a dark collar band, hair in a topknot covered by a small black silk cap (jeolpung or bokdu, a low fitted dark cap, not a tall hat, not a white hat)' : tier === 'low' ? 'coarse hemp jeogori, bare head with hair tied in a topknot, weathered skin, no hat' : 'plain hemp jeogori with a dark collar band, hair in a topknot tied with a narrow dark cloth band')
    case 'joseon':
      return f ? 'Joseon dynasty Korea, traditional Korean hanbok (not Chinese hanfu, not Japanese kimono). Center-parted hair pulled tightly back into a low bun at the nape fastened with one plain binyeo hairpin, no flowers, no crown, no headdress, ' + (tier === 'elite' ? 'short silk jeogori jacket with a white dongjeong collar strip and long goreum ribbon ties' : tier === 'low' ? 'short coarse undyed hemp jeogori jacket with a white dongjeong collar strip, no ornaments, sun-weathered skin' : 'short undyed cotton jeogori jacket with a white dongjeong collar strip and goreum ribbon ties, no ornaments')
               : 'Joseon dynasty Korea, traditional Korean hanbok (not Chinese, not Japanese). ' + (tier === 'elite' ? 'white ramie dopo overcoat over a jeogori, wearing a gat: a black semi-transparent horsehair hat with a tall narrow cylindrical crown and a wide flat brim, thin chin cord, a black manggeon headband visible under the brim, hair in a topknot' : tier === 'low' ? 'coarse hemp jeogori with a white dongjeong collar strip, bare head with hair in a topknot, no hat, no headband, weathered skin' : 'undyed cotton jeogori with a white dongjeong collar strip, hair in a topknot wrapped with a narrow black manggeon headband, no hat')
    case 'colonial':
      return f ? 'Korea in the 1930s under Japanese rule. Hair in a low bun, ' + (tier === 'elite' ? 'neat silk jeogori or a simple Western blouse' : 'faded white cotton jeogori')
               : 'Korea in the 1930s under Japanese rule. ' + (tier === 'elite' ? 'Western suit jacket and round glasses, short hair' : 'white cotton jeogori, short cropped hair')
    case 'south':
      return f ? 'Present-day South Korea. ' + (tier === 'elite' ? 'neat blouse or blazer, tidy hair' : tier === 'low' ? 'plain t-shirt or cardigan, hair simply tied' : 'plain collared shirt or knit, natural hair')
               : 'Present-day South Korea. ' + (tier === 'elite' ? 'dark blazer over a collared shirt, neat short hair' : tier === 'low' ? 'plain work jacket or t-shirt, short hair' : 'plain collared shirt or knit, short hair')
    case 'north':
      return f ? 'Present-day North Korea. Plain dark blazer over a white blouse, hair tied back, no badges' : 'Present-day North Korea. Plain dark jacket buttoned to the collar, short hair, no badges or pins'
  }
}

function prompt(group, sex, tier, age, tag = '', variant = 0) {
  const who = age === 'child' ? SEX_CHILD[sex] : SEX_WORDS[sex]
  return [
    `Black and white studio portrait photograph of ${AGE_WORDS[age].replace('a child about 10 years old', 'a child about 10 years old')}, a ${who}, head and shoulders, facing the camera, neutral calm expression, direct eye contact.`,
    costume(group, tier, sex, age) + (tag ? ', ' + TAG_WORDS[tag] : '') + '.',
    VARIANT_WORDS[variant % VARIANT_WORDS.length],
    'Even soft frontal light, plain white background, no shadows on the wall, medium contrast, clean and smooth, no film grain, no texture, no vignette, no frame. Face fills the upper half of the frame.',
    'Fictional person who resembles no real individual. No text, no watermark, no border, no logos.',
    'Do not depict: Chinese hanfu, Japanese kimono, military uniform, political badges, jewelry unless listed, modern glasses unless listed.',
  ].join(' ')
}

// 모델·파라미터가 거부되면 순서대로 대안을 시도한다
const MODEL_FALLBACKS = [MODEL, 'gpt-image-1.5', 'gpt-image-1-mini', 'gpt-image-1'].filter((m, i, a) => a.indexOf(m) === i)
let modelInUse = MODEL
let useOutputFormat = true
async function callApi(body) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 비JSON 응답 */ }
  return { ok: res.ok, status: res.status, text, json }
}
/** Pollinations: 키 없음. FLUX 계열, 768×1024 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function generatePollinations(prompt, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&model=flux&nologo=true&seed=${seed}`
  // 무료 등급은 402/429 로 간헐적으로 거부한다. 간격을 두고 다시 시도
  for (let attempt = 1; attempt <= 8; attempt++) {
    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': 'RandomKorean-portraits/1.0' }, signal: AbortSignal.timeout(90000) })
    } catch (e) {
      const wait = Math.min(60000, 8000 * attempt)
      console.error(`Pollinations 접속 오류 (${attempt}/8) ${e?.cause?.code || e?.name || e} → ${wait / 1000}s 뒤 재시도`)
      await sleep(wait)
      continue
    }
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      if (!/image/.test(res.headers.get('content-type') || '')) { console.error('이미지가 아닌 응답:', buf.slice(0, 120).toString()); return null }
      await sleep(4000) // 다음 요청 전 간격
      return buf
    }
    const body = (await res.text()).slice(0, 120)
    if (res.status === 402 || res.status === 429 || res.status >= 500) {
      const wait = Math.min(60000, 8000 * attempt)
      console.error(`Pollinations ${res.status} (${attempt}/8) ${body} → ${wait / 1000}s 뒤 재시도`)
      await sleep(wait)
      continue
    }
    console.error(`Pollinations ${res.status}: ${body}`)
    return null
  }
  return null
}
/** Gemini: gemini-2.5-flash-image (Nano Banana). 무료 등급 하루 500건 */
async function generateGemini(prompt) {
  const models = [opt('--model', null), 'gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'].filter(Boolean).filter((m, i, a) => a.indexOf(m) === i)
  // AIza… 와 서비스 계정 바인딩 키(AQ.…) 모두 Gemini API 주소를 먼저 쓴다. 키가 Vertex(Agent Platform) 전용이면 그쪽으로 넘어간다
  for (const model of models) {
    for (const vertex of [false, true]) for (const withAspect of [true, false]) {
      const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], ...(withAspect ? { imageConfig: { aspectRatio: '3:4' } } : {}) } }
      const url = vertex
        ? `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encodeURIComponent(GKEY)}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const res = await fetch(url, {
        method: 'POST', headers: { ...(vertex ? {} : { 'x-goog-api-key': GKEY }), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const text = await res.text()
      let json = null; try { json = JSON.parse(text) } catch { /* */ }
      if (!res.ok) {
        const msg = (json?.error?.message || text).slice(0, 200)
        console.error(`Gemini${vertex ? '(Vertex)' : ''} ${res.status} (${model}${withAspect ? ', 3:4' : ''}): ${msg}`)
        if (res.status === 402) { console.error('선불 크레딧이 0입니다. https://ai.studio/projects 에서 충전한 뒤 다시 실행하세요.'); process.exit(1) }
        if (res.status === 429) {
          // 어떤 한도에 걸렸는지 (limit: 0 이면 이 모델은 무료 등급 자체가 없는 것)
          const details = json?.error?.details || []
          for (const d of details) for (const v of d.violations || []) console.error('  한도:', v.quotaMetric || '', v.quotaId || '', 'limit =', v.quotaValue ?? '?')
          const retry = details.find((d) => d['@type']?.includes('RetryInfo'))?.retryDelay
          if (retry) console.error('  다시 시도까지:', retry)
          console.error('limit = 0 이면 이 프로젝트/지역의 무료 등급에 이미지 생성 할당량이 없는 것입니다. 분당 한도면 잠시 뒤 다시 실행하세요.')
          process.exit(1)
        }
        if (/aspect|imageConfig|Unknown name/i.test(msg) && withAspect) continue
        break
      }
      const part = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
      if (!part) { console.error('응답에 이미지가 없습니다:', text.slice(0, 200)); return null }
      return Buffer.from(part.inlineData.data, 'base64')
    }
  }
  return null
}

async function generate(prompt) {
  for (;;) {
    const body = { model: modelInUse, prompt, size: '1024x1536', quality: QUALITY, n: 1 }
    if (useOutputFormat) body.output_format = 'png'
    const r = await callApi(body)
    if (r.ok) return r.json
    const msg = (r.json?.error?.message || r.text || '').slice(0, 300)
    console.error(`API ${r.status}: ${msg}`)
    if (r.status === 401) { console.error('키가 거부되었습니다. OPENAI_API_KEY 값을 확인하세요.'); process.exit(1) }
    if (r.status === 429) { console.error('한도 초과 또는 잔액 부족입니다. 결제 설정을 확인하세요.'); process.exit(1) }
    if (/output_format/i.test(msg) && useOutputFormat) { useOutputFormat = false; console.error('→ output_format 없이 재시도'); continue }
    if (/model|not found|does not exist|invalid/i.test(msg)) {
      const i = MODEL_FALLBACKS.indexOf(modelInUse)
      if (i >= 0 && i + 1 < MODEL_FALLBACKS.length) { modelInUse = MODEL_FALLBACKS[i + 1]; console.error(`→ 모델을 ${modelInUse} 로 바꿔 재시도`); continue }
    }
    return null
  }
}

const keys = []
for (const g of GROUPS) for (const s of SEXES) for (const t of TIERS) for (const a of AGES) for (let v = 0; v < VARIANTS; v++) for (const tag of tagsFor(g, s, a)) keys.push({ key: `${g}-${s}-${t}-${a}-${v}${tag ? '-' + tag : ''}`, g, s, t, a, tag, v })
const todo = keys.filter((k) => (!ONLY_LIST || ONLY_LIST.some((o) => k.key.startsWith(o))) && (VARIANT_ONLY === null || String(k.v) === VARIANT_ONLY) && (REDO || !(existsSync(`public/portraits/${k.key}.png`) || existsSync(`public/portraits/${k.key}.jpg`)))).slice(0, LIMIT)
console.log(`전체 ${keys.length}장 중 대상 ${todo.length}장 (제공자 ${PROVIDER}${PROVIDER === 'openai' ? `, 모델 ${MODEL}, 품질 ${QUALITY}` : ''})`)
mkdirSync('public/portraits', { recursive: true })

for (const k of todo) {
  const p = prompt(k.g, k.s, k.t, k.a, k.tag, k.v)
  if (DRY) { console.log(`\n[${k.key}]\n${p}`); continue }
  let buf = null
  if (PROVIDER === 'pollinations') buf = await generatePollinations(p, keys.indexOf(k) + 1)
  else if (PROVIDER === 'gemini') buf = await generateGemini(p)
  else {
    const json = await generate(p)
    const b64 = json?.data?.[0]?.b64_json
    if (b64) buf = Buffer.from(b64, 'base64')
    else if (json) console.error(k.key, '응답에 이미지가 없습니다', JSON.stringify(json).slice(0, 300))
  }
  if (!buf) continue
  for (const ext of ['png', 'jpg']) if (existsSync(`public/portraits/${k.key}.${ext}`)) { mkdirSync('archive/portraits-old', { recursive: true }); renameSync(`public/portraits/${k.key}.${ext}`, `archive/portraits-old/${k.key}.${ext}`) }
  writeFileSync(`public/portraits/${k.key}.png`, buf)
  console.log('저장', k.key, `(${PROVIDER}${PROVIDER === 'openai' ? ' ' + modelInUse : ''})`)
  writeManifest()
}
// manifest 갱신 (저장할 때마다, 그리고 마지막에)
function writeManifest() {
  const files = readdirSync('public/portraits').filter((f) => /^[a-z]+-[mf]-[a-z]+-[a-z]+-\d(-[a-z]+)*\.(png|jpg)$/.test(f)).sort()
  writeFileSync('src/data/portraits-manifest.json', JSON.stringify({ files }, null, 2) + '\n')
  return files.length
}
console.log(`manifest: ${writeManifest()}장`)
