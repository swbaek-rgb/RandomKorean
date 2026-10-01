import { useEffect, useRef } from 'react'

interface Props {
  src: string
  /** 점 격자 가로 칸 수. 세로는 3:4 */
  dots?: number
  ink?: string
  paper?: string
  alt?: string
  /** 원본 아래쪽을 잘라내는 비율 (워터마크 제거용) */
  trimBottom?: number
  /** 대비 S자 곡선 강도. 클수록 점이 검거나 희게 갈린다 */
  contrast?: number
  /** 확대 배율. 1보다 크면 위쪽 가운데(얼굴)로 당겨 자른다 */
  zoom?: number
  /** 가로 늘리기 배율. 생성 모델이 얼굴을 길게 그리는 경향을 보정 (1.2 = 가로 20% 확장) */
  stretchX?: number
}

/**
 * 3:4 초상을 1비트 디더링(Floyd–Steinberg)으로 바꿔 그린다.
 * 회색조 → 2~98% 백분위 자동 레벨 → 오차 확산 → 잉크/종이 두 색. 난수가 없어 같은 입력은 항상 같은 결과.
 */
// 사이트는 다크 팔레트지만 초상은 밝은 종이 위 어두운 잉크로 고정한다 (styles.css 의 --portrait-ink / --portrait-paper 와 같은 값)
export function Portrait({ src, dots = 120, ink = '#2b2622', paper = '#efe9dc', alt = '초상', trimBottom: trimBottomProp = 0, contrast = 7, zoom: zoomProp = 1, stretchX: stretchXProp = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const w = dots
      const h = Math.round((dots * 4) / 3)
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const octx = off.getContext('2d')!
      // 보정(가로 늘림·확대·워터마크 잘라내기)은 첫 생성분(폭 665px, pollinations)에만 적용한다.
      // Gemini 로 다시 만든 초상(폭 864px 이상)은 3:4 원본 그대로 쓴다
      const legacy = img.width < 800
      const trimBottom = legacy ? trimBottomProp : 0
      const stretchX = legacy ? stretchXProp : 1
      const zoom = legacy ? zoomProp : 1
      // 가운데 3:4 크롭 (얼굴 사진은 위쪽에 여유를 조금 둔다)
      const usableH = img.height * (1 - trimBottom)
      const srcRatio = img.width / usableH
      const dstRatio = w / h
      let sw = img.width, sh = usableH, sx = 0, sy = 0
      // 비율은 유지하고, 3:4를 벗어나는 부분만 가운데 기준으로 잘라낸다
      if (srcRatio > dstRatio) { sw = usableH * dstRatio; sx = (img.width - sw) / 2 } else { sh = img.width / dstRatio; sy = (usableH - sh) / 2 }
      if (stretchX !== 1) {
        // 원본에서 더 좁은 폭을 잘라 같은 칸에 그리면 가로로 늘어난다
        const nw = sw / stretchX
        sx += (sw - nw) / 2
        sw = nw
      }
      if (zoom > 1) {
        // 얼굴이 위쪽 가운데에 오는 초상 구도를 가정: 가로는 가운데, 세로는 위에서 12% 지점부터
        const nw = sw / zoom, nh = sh / zoom
        sx += (sw - nw) / 2
        sy += (sh - nh) * 0.12
        sw = nw; sh = nh
      }
      // 살짝 흐리게 그려 고주파 노이즈를 줄인 뒤 디더링한다
      octx.filter = 'blur(0.6px)'
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
      octx.filter = 'none'
      const data = octx.getImageData(0, 0, w, h).data
      const gray = new Float32Array(w * h)
      for (let i = 0; i < w * h; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
      // 자동 레벨: 2~98% 백분위를 0~255 로
      const sorted = Array.from(gray).sort((a, b) => a - b)
      const lo = sorted[Math.floor(sorted.length * 0.02)], hi = sorted[Math.floor(sorted.length * 0.98)]
      const span = Math.max(1, hi - lo)
      for (let i = 0; i < gray.length; i++) {
        let v = ((gray[i] - lo) / span) * 255
        v = Math.max(0, Math.min(255, v))
        // S자 대비 곡선: 중간 회색을 밀어내 점이 뭉치거나 비게 만든다 (참고 이미지의 거친 인상)
        const t = v / 255 - 0.5
        gray[i] = 255 / (1 + Math.exp(-contrast * t))
      }
      // Floyd–Steinberg 오차 확산
      const out = new Uint8Array(w * h)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x
          const old = gray[i]
          const bit = old < 128 ? 0 : 255
          out[i] = bit
          const err = old - bit
          if (x + 1 < w) gray[i + 1] += (err * 7) / 16
          if (y + 1 < h) {
            if (x > 0) gray[i + w - 1] += (err * 3) / 16
            gray[i + w] += (err * 5) / 16
            if (x + 1 < w) gray[i + w + 1] += (err * 1) / 16
          }
        }
      }
      const inkRGB = hex(ink), paperRGB = hex(paper)
      const px = octx.createImageData(w, h)
      for (let i = 0; i < w * h; i++) {
        const c = out[i] ? paperRGB : inkRGB
        px.data[i * 4] = c[0]; px.data[i * 4 + 1] = c[1]; px.data[i * 4 + 2] = c[2]; px.data[i * 4 + 3] = 255
      }
      octx.putImageData(px, 0, 0)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(off, 0, 0)
    }
    img.src = src
    return () => { cancelled = true }
  }, [src, dots, ink, paper, trimBottomProp, contrast, zoomProp, stretchXProp])
  return <canvas ref={ref} className="portrait-canvas" role="img" aria-label={alt} />
}

function hex(c: string): [number, number, number] {
  const m = c.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}
