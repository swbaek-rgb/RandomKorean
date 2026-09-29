import type { Rng } from '../../engine/rng'
import type { RegionSnapshot, RegionRow } from './types'
import hogu1789 from './1789-hogu-chongsu.json'
import census1935 from './1935-kokusei.json'
import census1955 from './1955-census-south.json'
import census1975 from './1975-census-south.json'
import census1990 from './1990-census-south.json'
import births2020 from './2020-births-south.json'
import census2008n from './2008-census-north.json'

/**
 * 스냅숏 등록. rows 가 비어 있으면 그 시점은 건너뛰고 도 단위로 폴백한다.
 * 수치는 scripts/ 의 가져오기 도구로 원본 통계에서 채운다.
 */
const SNAPSHOTS: RegionSnapshot[] = [hogu1789, census1935, census1955, census1975, census1990, births2020, census2008n] as RegionSnapshot[]

export interface PickedRegion {
  province: string
  name: string
  now?: string
  /** "동래부 (지금의 부산)" 형태 */
  label: string
  snapshotYear: number
  unit: string
  source: string
}

/** 출생 연도에 맞는 스냅숏 (적용 범위 안, 자료가 채워진 것) */
export function snapshotFor(year: number, side?: 'south' | 'north'): RegionSnapshot | null {
  const candidates = SNAPSHOTS.filter((s) => s.rows.length > 0 && year >= s.from && year <= s.to && (s.side === undefined || side === undefined || s.side === side))
  if (candidates.length === 0) return null
  candidates.sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))
  return candidates[0]
}

function fromRow(row: RegionRow, snap: RegionSnapshot): PickedRegion {
  const label = row.now ? `${row.name} (지금의 ${row.now})` : row.name
  return { province: row.province, name: row.name, now: row.now, label, snapshotYear: snap.year, unit: snap.unit, source: snap.source }
}

export function pickFromSnapshot(rng: Rng, snap: RegionSnapshot, rows: RegionRow[] = snap.rows): PickedRegion | null {
  if (rows.length === 0) return null
  return fromRow(rows[rng.weightedIndex(rows.map((r) => Math.max(0, r.weight)))], snap)
}

export function pickRegion(rng: Rng, year: number, side?: 'south' | 'north'): PickedRegion | null {
  const snap = snapshotFor(year, side)
  return snap ? pickFromSnapshot(rng, snap) : null
}

/** 특정 도 안에서만 뽑기 (도가 먼저 정해진 경우) */
export function pickRegionIn(rng: Rng, year: number, province: string, side?: 'south' | 'north'): PickedRegion | null {
  const snap = snapshotFor(year, side)
  if (!snap) return null
  const rows = snap.rows.filter((r) => r.province === province || province.startsWith(r.province) || r.province.startsWith(province))
  return pickFromSnapshot(rng, snap, rows)
}
