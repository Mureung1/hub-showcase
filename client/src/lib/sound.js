import { Howl } from 'howler'
import bgmUrl from '../assets/audio/Main.mp3'
import clickUrl from '../assets/audio/Click.wav'
import clickFinishUrl from '../assets/audio/Click_Finish.wav'

// 사운드 매니저 — Howler.js 인스턴스를 모듈 스코프에서 1회만 생성해 재사용한다.
// docs/design/SKILL.md §12: 볼륨 gain 0.15~0.25, 사용자가 끌 수 있는 토글 필수.
const BGM_VOLUME = 0.18
const SFX_VOLUME = 0.25
const MUTE_STORAGE_KEY = 'letterco.sound.muted'

let bgm = null
let sfxClick = null
let sfxClickFinish = null
let bgmStarted = false
let muted = readStoredMuted()
const listeners = new Set()

function readStoredMuted() {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeStoredMuted(next) {
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0')
  } catch {
    // Safari 프라이빗 모드 등 — 저장 실패는 무시
  }
}

function ensureLoaded() {
  if (bgm || typeof window === 'undefined') return
  try {
    bgm = new Howl({ src: [bgmUrl], loop: true, volume: BGM_VOLUME, html5: true })
    sfxClick = new Howl({ src: [clickUrl], volume: SFX_VOLUME })
    sfxClickFinish = new Howl({ src: [clickFinishUrl], volume: SFX_VOLUME })
  } catch {
    bgm = null
    sfxClick = null
    sfxClickFinish = null
  }
}

export function isMuted() {
  return muted
}

export function subscribeMuted(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setMuted(next) {
  muted = next
  writeStoredMuted(next)
  ensureLoaded()
  if (muted) {
    bgm?.stop()
  } else {
    startBgm()
  }
  listeners.forEach((fn) => fn())
}

export function startBgm() {
  if (muted) return
  ensureLoaded()
  if (!bgm || bgmStarted) return
  bgm.once('playerror', () => {
    // 브라우저 자동재생 정책으로 막힌 경우 — 조용히 무시, 다음 사용자 상호작용에서 재시도
  })
  const id = bgm.play()
  if (id !== undefined) bgmStarted = true
}

function playSound(howl) {
  if (muted) return
  ensureLoaded()
  howl?.play()
}

export function playClick() {
  playSound(sfxClick)
}

export function playClickFinish() {
  playSound(sfxClickFinish)
}

export function playSfx(type) {
  if (type === 'finish') playClickFinish()
  else playClick()
}
