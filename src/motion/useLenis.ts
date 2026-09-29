import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { prefersReduced } from './reduced'

/** 유일한 스무스 스크롤 엔진. 상세 화면에서만 켜고, 감소 모션이면 켜지 않는다. */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled || prefersReduced()) return
    const lenis = new Lenis({ autoRaf: false, lerp: 0.11 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    const onFonts = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(onFonts)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [enabled])
}
