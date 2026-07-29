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
// startBgm()이 한 번이라도 호출됐는지 — Howl.play()의 반환값(sound id)은
// 재생 성공 여부를 알려주지 않으므로(차단 상태에서도 항상 id를 반환) 이 값으로만 재진입을 막는다.
let bgmRequested = false
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

// BGM은 사용자 제스처 이후(startBgm/setMuted)에만 생성한다. 제스처 이전에 만들면
// Howler의 HTML5 오디오 언락 풀이 아직 채워지지 않아 잠긴 Audio 노드를 받고,
// 이후 언락 시점의 node.load()가 대기 중이던 재생을 리셋해버린다.
function ensureBgm() {
  if (bgm || typeof window === 'undefined') return
  try {
    bgm = new Howl({ src: [bgmUrl], loop: true, volume: BGM_VOLUME, html5: true })
  } catch {
    bgm = null
  }
}

function ensureSfx() {
  if (sfxClick || typeof window === 'undefined') return
  try {
    sfxClick = new Howl({ src: [clickUrl], volume: SFX_VOLUME })
    sfxClickFinish = new Howl({ src: [clickFinishUrl], volume: SFX_VOLUME })
  } catch {
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
  if (muted) {
    bgm?.stop()
  } else if (bgm) {
    if (!bgm.playing()) bgm.play()
  } else {
    startBgm()
  }
  listeners.forEach((fn) => fn())
}

export function startBgm() {
  if (muted || bgmRequested) return
  bgmRequested = true
  ensureBgm()
  bgm?.play()
}

export function playClick() {
  if (muted) return
  ensureSfx()
  sfxClick?.play()
}

export function playClickFinish() {
  if (muted) return
  ensureSfx()
  sfxClickFinish?.play()
}

export function playSfx(type) {
  if (type === 'finish') playClickFinish()
  else playClick()
}
