export const SOUND_FILES = {
  switchOn: "/sounds/switch-on.mp3",
  modalOpen: "/sounds/pop_open.mp3",
  modalClose: "/sounds/pop_close.mp3",
  radio: "/sounds/radio_select.mp3",
  registrationSuccess: "/sounds/success_chime.mp3",
  toggleOn: "/sounds/toggle_on.mp3",
  toggleOff: "/sounds/toggle_off.mp3",
  favoriteOn: "/sounds/item_deselect.mp3",
  favoriteOff: "/sounds/success_blip.mp3",
  inputPress: "/sounds/pop-down.mp3",
  inputFocusOn: "/sounds/pop-up-on.mp3",
  inputFocusOff: "/sounds/pop-up-off.mp3",
  swipe: "/sounds/u_nharq4usid-swipe-255512.mp3",
  delete: "/sounds/freesound_community-crumple-03-40747.mp3",
} as const

export type SoundName = keyof typeof SOUND_FILES

const SOUND_VOLUMES: Partial<Record<SoundName, number>> = {
  inputPress: 0.25,
  inputFocusOn: 0.25,
  inputFocusOff: 0.25,
  modalOpen: 0.15,
  modalClose: 0.15,
  favoriteOn: 0.15,
  favoriteOff: 0.15,
  swipe: 0.4,
  delete: 0.5,
}

export const APP_SOUND_EVENT = "scoop:sound"

class SoundEngine {
  private cache = new Map<SoundName, HTMLAudioElement>()
  private audioCtx: AudioContext | null = null
  private audioBuffers = new Map<SoundName, AudioBuffer>()
  private audioBuffersByUrl = new Map<string, AudioBuffer>()
  private enabled = false
  private unlocked = false
  private lastPlayedAudio: HTMLAudioElement | null = null
  private lastPlayedTime = 0
  private lastPlayedName: SoundName | null = null

  preload() {
    if (typeof window === "undefined") return

    // Initialize haptics
    haptics.init()

    // Load enabled state from localStorage on client side init
    const stored = localStorage.getItem("scoop_sounds_enabled")
    if (stored !== null) {
      this.enabled = stored === "true"
    } else {
      this.enabled = false
    }

    // Try to initialize AudioContext
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    } catch (e) {
      console.warn("Web Audio API not supported, using fallback HTML5 Audio:", e)
    }

    for (const [name, src] of Object.entries(SOUND_FILES) as [SoundName, string][]) {
      if (this.audioCtx) {
        // Fetch and pre-decode arrayBuffer for high performance Web Audio API playback
        fetch(src)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP error ${res.status}`)
            return res.arrayBuffer()
          })
          .then((arrayBuffer) => {
            if (this.audioCtx) {
              return this.audioCtx.decodeAudioData(arrayBuffer)
            }
            throw new Error("AudioContext was destroyed")
          })
          .then((audioBuffer) => {
            this.audioBuffers.set(name, audioBuffer)
          })
          .catch((err) => {
            console.warn(`Failed to preload Web Audio buffer for "${name}", fallback to HTML5 Audio:`, err)
            const audio = new Audio(src)
            audio.preload = "auto"
            this.cache.set(name, audio)
          })
      } else {
        const audio = new Audio(src)
        audio.preload = "auto"
        this.cache.set(name, audio)
      }
    }
  }

  unlock(): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(false)
    if (this.unlocked) return Promise.resolve(true)

    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        return this.audioCtx.resume()
          .then(() => {
            this.unlocked = true
            return true
          })
          .catch((err) => {
            console.warn("AudioContext resume failed:", err)
            return false
          })
      } else {
        this.unlocked = true
        return Promise.resolve(true)
      }
    }

    // HTML5 fallback unlock
    const audio = new Audio(SOUND_FILES.switchOn)
    audio.volume = 0.001
    const p = audio.play()
    if (p) {
      return p.then(() => {
        this.unlocked = true
        audio.pause()
        return true
      }).catch((err) => {
        console.warn("Audio unlock failed, will retry:", err)
        this.unlocked = false
        return false
      })
    }
    return Promise.resolve(false)
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (typeof window !== "undefined") {
      localStorage.setItem("scoop_sounds_enabled", enabled ? "true" : "false")
    }
  }

  isEnabled() {
    if (typeof window === "undefined") return this.enabled
    const stored = localStorage.getItem("scoop_sounds_enabled")
    return stored !== null ? stored === "true" : this.enabled
  }

  play(name: SoundName) {
    if (typeof window === "undefined") return

    const hapticType = SOUND_HAPTICS[name]
    if (hapticType) {
      haptics.trigger(hapticType)
    }

    if (!this.enabled) return

    const now = Date.now()

    // Prevent double-triggering the exact same sound within a very short window (e.g. click double events)
    if (name === this.lastPlayedName && now - this.lastPlayedTime < 100) {
      return
    }

    const isPriority = name === "delete" || name === "swipe"

    // Prevent double-triggering the same priority sound within a short window (e.g. click + popstate)
    if (isPriority && name === this.lastPlayedName && now - this.lastPlayedTime < 250) {
      return
    }

    // If a priority sound was played very recently, skip playing normal sounds
    if (!isPriority && this.lastPlayedName && (this.lastPlayedName === "delete" || this.lastPlayedName === "swipe")) {
      if (now - this.lastPlayedTime < 150) {
        return
      }
    }

    this.lastPlayedTime = now
    this.lastPlayedName = name

    // 1. Try playing using Web Audio API (mixes natively with background apps)
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch((e) => console.warn("Could not resume AudioContext on play:", e))
      }

      const buffer = this.audioBuffers.get(name)
      if (buffer) {
        try {
          const source = this.audioCtx.createBufferSource()
          source.buffer = buffer

          const gainNode = this.audioCtx.createGain()
          const volume = SOUND_VOLUMES[name] ?? 0.7
          gainNode.gain.value = volume

          source.connect(gainNode)
          gainNode.connect(this.audioCtx.destination)

          source.start(0)
          return
        } catch (err) {
          console.warn(`Web Audio API playback failed for "${name}", attempting HTML5 fallback:`, err)
        }
      }
    }

    // 2. Fallback to HTML5 Audio element
    let audio = this.cache.get(name)
    if (!audio) {
      audio = new Audio(SOUND_FILES[name])
      this.cache.set(name, audio)
    }

    const volume = SOUND_VOLUMES[name] ?? 0.7
    audio.volume = volume

    // If a normal sound was played very recently and we want to play a priority sound,
    // stop/mute the normal sound immediately.
    if (isPriority && this.lastPlayedAudio && this.lastPlayedName !== "delete" && this.lastPlayedName !== "swipe") {
      if (now - this.lastPlayedTime < 150) {
        try {
          this.lastPlayedAudio.pause()
          this.lastPlayedAudio.currentTime = 0
        } catch {
          // Ignore state/pausing errors
        }
      }
    }

    try {
      audio.currentTime = 0
    } catch {}

    const playback = audio.play()
    if (playback) {
      playback.catch((err) => {
        console.warn(`Fallback HTML5 playback blocked for sound "${name}":`, err)
      })
    }

    this.lastPlayedAudio = audio
  }

  playUrl(url: string, volume: number = 0.25) {
    if (typeof window === "undefined" || !this.enabled) return

    // 1. Try playing using Web Audio API (mixes natively with background apps)
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch((e) => console.warn("Could not resume AudioContext on playUrl:", e))
      }

      const buffer = this.audioBuffersByUrl.get(url)
      if (buffer) {
        try {
          const source = this.audioCtx.createBufferSource()
          source.buffer = buffer

          const gainNode = this.audioCtx.createGain()
          gainNode.gain.value = volume

          source.connect(gainNode)
          gainNode.connect(this.audioCtx.destination)

          source.start(0)
          return
        } catch (err) {
          console.warn(`Web Audio API playback failed for URL "${url}":`, err)
        }
      } else {
        // Fetch and play on the fly, cache it
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP error ${res.status}`)
            return res.arrayBuffer()
          })
          .then((arrayBuffer) => {
            if (this.audioCtx) {
              return this.audioCtx.decodeAudioData(arrayBuffer)
            }
            throw new Error("AudioContext was destroyed")
          })
          .then((audioBuffer) => {
            this.audioBuffersByUrl.set(url, audioBuffer)
            if (this.audioCtx) {
              const source = this.audioCtx.createBufferSource()
              source.buffer = audioBuffer
              const gainNode = this.audioCtx.createGain()
              gainNode.gain.value = volume
              source.connect(gainNode)
              gainNode.connect(this.audioCtx.destination)
              source.start(0)
            }
          })
          .catch((err) => {
            console.warn(`Web Audio API fetch/decode failed for URL "${url}":`, err)
            // Fallback to HTML5 audio
            const audio = new Audio(url)
            audio.volume = volume
            audio.play().catch(() => {})
          })
        return
      }
    }

    // 2. Fallback to HTML5 Audio element
    const audio = new Audio(url)
    audio.volume = volume
    audio.play().catch(() => {})
  }
}

export const sounds = new SoundEngine()

export function playSound(name: SoundName) {
  sounds.play(name)
}

export function playAmbientSound(url: string, volume: number = 0.25) {
  sounds.playUrl(url, volume)
}

export function dispatchSound(name: SoundName) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(APP_SOUND_EVENT, { detail: name }))
}

const SOUND_HAPTICS: Partial<Record<SoundName, "light" | "medium" | "heavy" | "success" | "warning">> = {
  toggleOn: "light",
  toggleOff: "light",
  delete: "heavy",
  registrationSuccess: "success",
  modalOpen: "light",
  modalClose: "light",
  favoriteOn: "medium",
  favoriteOff: "medium",
  swipe: "light",
  inputPress: "light",
  inputFocusOn: "light",
  inputFocusOff: "light",
  radio: "light"
}

class HapticsEngine {
  private enabled = true

  init() {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("scoop_haptics_enabled")
    if (stored !== null) {
      this.enabled = stored === "true"
    } else {
      this.enabled = true // default to true
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (typeof window !== "undefined") {
      localStorage.setItem("scoop_haptics_enabled", enabled ? "true" : "false")
    }
  }

  isEnabled() {
    if (typeof window === "undefined") return this.enabled
    const stored = localStorage.getItem("scoop_haptics_enabled")
    return stored !== null ? stored === "true" : this.enabled
  }

  vibrate(pattern: number | number[]) {
    if (!this.enabled || typeof window === "undefined" || !("vibrate" in navigator)) return
    try {
      navigator.vibrate(pattern)
    } catch (e) {
      console.warn("Haptic feedback failed:", e)
    }
  }

  trigger(type: "light" | "medium" | "heavy" | "success" | "warning") {
    switch (type) {
      case "light":
        this.vibrate(10)
        break
      case "medium":
        this.vibrate(20)
        break
      case "heavy":
        this.vibrate(50)
        break
      case "success":
        this.vibrate([15, 30, 15])
        break
      case "warning":
        this.vibrate([50, 50, 50])
        break
    }
  }
}

export const haptics = new HapticsEngine()
