"use client"

import { useEffect } from "react"
import {
  APP_SOUND_EVENT,
  playSound,
  sounds,
  type SoundName,
} from "@/lib/sounds"

function isSelectedPill(el: Element): boolean {
  const cls = typeof el.className === "string" ? el.className : ""
  return (
    cls.includes("bg-[#007BFF]") ||
    cls.includes("bg-[#4ADE80]") ||
    cls.includes("bg-[#FFA726]") ||
    cls.includes("bg-[#EF5350]") ||
    cls.includes("face-btn-active") ||
    (cls.includes("text-white") && cls.includes("border-[#"))
  )
}

function isToggleRowSelected(el: Element): boolean {
  const cls = typeof el.className === "string" ? el.className : ""
  return (
    cls.includes("line-through") ||
    cls.includes("border-success-primary") ||
    cls.includes("bg-[#ECFDF5]")
  )
}

function wasToggleSelected(el: Element): boolean {
  if (el.tagName === "BUTTON") return isSelectedPill(el)
  return isToggleRowSelected(el)
}

function isToggleLike(el: Element): boolean {
  const cls = typeof el.className === "string" ? el.className : ""
  return el.tagName === "DIV" && cls.includes("cursor-pointer") && cls.includes("rounded-2xl")
}

function isToggleOrFilter(el: Element): boolean {
  if (el.closest('.aws-btn')) return false

  const cls = typeof el.className === "string" ? el.className : ""

  // 1. Checklist rows / Toggle rows (divs)
  if (el.tagName === "DIV" && cls.includes("cursor-pointer") && cls.includes("rounded-2xl")) {
    return true
  }

  // 2. Buttons acting as toggles/filters/preferences
  if (el.tagName === "BUTTON") {
    // Face buttons in avatar select
    if (cls.includes("face-btn")) return true

    // Preference option pills in Settings
    if (cls.includes("rounded-full") && el.closest('.settings-panel-preferences')) return true

    // Category pills in Search page horizontal scroll
    if (cls.includes("rounded-full") && (cls.includes("border-[#") || cls.includes("bg-[#"))) return true

    // Filters inside the filters Modal (ingredients, categories, author, difficulty)
    if (cls.includes("h-10") && cls.includes("rounded-2xl")) return true

    // Sibling of another button in a flex-wrap container (fallback for any list of selection pills)
    const parentCls = el.parentElement?.className
    if (typeof parentCls === "string" && parentCls.includes("flex-wrap")) {
      return true
    }
  }

  return false
}

function isButtonLike(el: Element): boolean {
  if (
    el.matches(
      'button:not([disabled]), [role="button"]:not([aria-disabled="true"]), .aws-btn:not([aria-disabled="true"])'
    )
  ) {
    return true
  }

  const cls = typeof el.className === "string" ? el.className : ""
  return el.tagName === "DIV" && cls.includes("cursor-pointer")
}

function isFavoriteButton(el: Element): boolean {
  return el.matches('[data-favorite-button="true"]') || !!el.closest('[data-favorite-button="true"]')
}

function isHeartFilled(el: Element): boolean {
  const heart = el.querySelector("svg.lucide-heart")
  if (!heart) return false

  const svgFill = heart.getAttribute("fill")
  if (svgFill && svgFill !== "none") return true

  const path = heart.querySelector("path")
  const pathFill = path?.getAttribute("fill")
  return !!pathFill && pathFill !== "none"
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "email",
  "password",
  "search",
  "tel",
  "url",
  "number",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
])

function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly
  }
  if (!(el instanceof HTMLInputElement)) return false
  if (el.disabled || el.readOnly) return false
  return TEXT_INPUT_TYPES.has(el.type.toLowerCase())
}

function hasTextInputInside(el: Element): boolean {
  const inputs = el.querySelectorAll("input, textarea")
  for (let i = 0; i < inputs.length; i++) {
    if (isTextInput(inputs[i])) return true
  }
  return false
}

function getInteractiveElement(target: Element): Element | null {
  if (target.closest("input, textarea, select, label")) return null

  const button = target.closest(
    'button:not([disabled]), [role="button"]:not([aria-disabled="true"]), .aws-btn:not([aria-disabled="true"])'
  )
  if (button) return button

  if (target.closest("a[href]")) return null

  const toggleRow = target.closest("div.cursor-pointer.rounded-2xl")
  if (toggleRow && isToggleLike(toggleRow)) {
    if (hasTextInputInside(toggleRow)) return null
    return toggleRow
  }

  const clickable = target.closest("div.cursor-pointer")
  if (clickable && isButtonLike(clickable)) {
    if (hasTextInputInside(clickable)) return null
    return clickable
  }

  return null
}

function handleInteractiveClick(target: Element) {
  if (target.closest('[data-sound="off"]')) return

  const interactive = getInteractiveElement(target)
  if (!interactive) return

  if (isFavoriteButton(interactive)) {
    playSound(isHeartFilled(interactive) ? "favoriteOff" : "favoriteOn")
    return
  }

  if (isToggleOrFilter(interactive)) {
    playSound(wasToggleSelected(interactive) ? "toggleOff" : "toggleOn")
    return
  }

  if (isButtonLike(interactive)) {
    playSound("switchOn")
  }
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    sounds.preload()

    const unlockAudio = () => {
      sounds.unlock().then((success) => {
        if (success) {
          document.removeEventListener("touchstart", unlockAudio, true)
          document.removeEventListener("touchend", unlockAudio, true)
          document.removeEventListener("click", unlockAudio, true)
        }
      })
    }

    document.addEventListener("touchstart", unlockAudio, true)
    document.addEventListener("touchend", unlockAudio, true)
    document.addEventListener("click", unlockAudio, true)

    let pressedInput: HTMLInputElement | HTMLTextAreaElement | null = null
    let focusOffTimeoutId: any = null


    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-sound="off"]')) return

      const input = target.closest("input, textarea")
      if (isTextInput(input)) {
        pressedInput = input
      } else {
        pressedInput = null
      }
    }

    const onPointerUp = () => {
      pressedInput = null
    }

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-sound="off"]')) return
      if (!isTextInput(target)) return

      // Cancel any pending inputFocusOff sound since we are focusing a new input
      if (focusOffTimeoutId) {
        clearTimeout(focusOffTimeoutId)
        focusOffTimeoutId = null
      }

      playSound("inputFocusOn")
    }

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!isTextInput(target)) return

      if (pressedInput) return

      const related = event.relatedTarget instanceof Element ? event.relatedTarget : null
      if (isTextInput(related)) return

      // Cancel any existing timeout just in case
      if (focusOffTimeoutId) {
        clearTimeout(focusOffTimeoutId)
      }

      // Defer playing the focus-off sound to see if a focus-in event follows
      focusOffTimeoutId = setTimeout(() => {
        playSound("inputFocusOff")
        focusOffTimeoutId = null
      }, 50)
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      const target = event.target
      if (!(target instanceof Element)) return
      handleInteractiveClick(target)
    }

    const onAppSound = (event: Event) => {
      const sound = (event as CustomEvent<SoundName>).detail
      if (sound) playSound(sound)
    }

    const onPopState = () => {
      playSound("swipe")
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("pointerup", onPointerUp, true)
    document.addEventListener("focusin", onFocusIn, true)
    document.addEventListener("focusout", onFocusOut, true)
    document.addEventListener("click", onClick, true)
    window.addEventListener(APP_SOUND_EVENT, onAppSound)
    window.addEventListener("popstate", onPopState)

    return () => {
      if (focusOffTimeoutId) {
        clearTimeout(focusOffTimeoutId)
      }
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointerup", onPointerUp, true)
      document.removeEventListener("focusin", onFocusIn, true)
      document.removeEventListener("focusout", onFocusOut, true)
      document.removeEventListener("click", onClick, true)
      window.removeEventListener(APP_SOUND_EVENT, onAppSound)
      window.removeEventListener("popstate", onPopState)

      document.removeEventListener("touchstart", unlockAudio, true)
      document.removeEventListener("touchend", unlockAudio, true)
      document.removeEventListener("click", unlockAudio, true)
    }
  }, [])

  return <>{children}</>
}
