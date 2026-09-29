import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** 강한 ease-out. 진입 애니메이션 기본값 */
export const EASE_OUT = 'expo.out'

export { gsap, ScrollTrigger }
