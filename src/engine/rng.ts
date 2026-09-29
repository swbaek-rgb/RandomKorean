// 시드 기반 난수 (mulberry32). 같은 시드는 항상 같은 삶을 만든다.
export class Rng {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0
    let t = this.s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  /** 가중치 배열에서 인덱스 하나를 뽑는다. */
  weightedIndex(weights: readonly number[]): number {
    let total = 0
    for (const w of weights) total += w
    let r = this.next() * total
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r < 0) return i
    }
    return weights.length - 1
  }
  weighted<T>(items: readonly { v: T; w: number }[]): T {
    return items[this.weightedIndex(items.map((i) => i.w))].v
  }
  /** 평균 lambda 의 포아송 난수 */
  poisson(lambda: number): number {
    const L = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= this.next()
    } while (p > L)
    return k - 1
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}

/** 마지막 추적 추첨의 확률. tpick/tweighted 가 갱신한다 */
export let lastPickProb = 1
export function resetPickProb() {
  lastPickProb = 1
}
export function tpick<T>(rng: Rng, arr: readonly T[]): T {
  lastPickProb = 1 / arr.length
  return rng.pick(arr)
}
export function tweighted<T>(rng: Rng, items: readonly { v: T; w: number }[]): T {
  const ws = items.map((i) => i.w)
  const total = ws.reduce((a, b) => a + b, 0)
  const i = rng.weightedIndex(ws)
  lastPickProb = total > 0 ? ws[i] / total : 1
  return items[i].v
}
