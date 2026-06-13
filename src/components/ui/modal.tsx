"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import gsap from "gsap"
import { playSound } from "@/lib/sounds"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Timeline | null>(null)
  const [closeInitiatedByModal, setCloseInitiatedByModal] = useState(false)

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  useEffect(() => {
    if (open) setIsMounted(true)
  }, [open])

  useLayoutEffect(() => {
    if (!isMounted) return

    const overlay = overlayRef.current
    const panel = panelRef.current
    if (!overlay || !panel) return

    tweenRef.current?.kill()
    gsap.killTweensOf([overlay, panel])

    if (open) {
      document.body.style.overflow = "hidden"

      gsap.set(overlay, { autoAlpha: 0, pointerEvents: "auto" })
      gsap.set(panel, { scale: 0.9, autoAlpha: 0, y: 20 })

      tweenRef.current = gsap
        .timeline({ onStart: () => playSound("modalOpen") })
        .to(overlay, { autoAlpha: 1, duration: 0.28, ease: "power2.out" })
        .to(
          panel,
          { scale: 1, autoAlpha: 1, y: 0, duration: 0.38, ease: "back.out(1.35)" },
          "-=0.12"
        )
    } else {
      tweenRef.current = gsap
        .timeline({
          onStart: () => {
            if (closeInitiatedByModal) {
              playSound("modalClose")
            }
          },
          onComplete: () => {
            document.body.style.overflow = ""
            setIsMounted(false)
            setCloseInitiatedByModal(false)
          },
        })
        .to(panel, { scale: 0.95, autoAlpha: 0, y: 10, duration: 0.22, ease: "power2.in" })
        .to(overlay, { autoAlpha: 0, duration: 0.2, ease: "power2.in" }, "-=0.08")
    }

    return () => {
      tweenRef.current?.kill()
    }
  }, [open, isMounted, closeInitiatedByModal])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  if (!isMounted || !portalRoot) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          setCloseInitiatedByModal(true)
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-[#FCF9F8] border-2 border-border-default rounded-[32px] shadow-[0_8px_0_#E5E2E1] w-full max-w-sm md:max-w-lg max-h-[80dvh] flex flex-col p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="flex justify-between items-center shrink-0 pb-3 border-b border-[#E5E2E1] mb-2">
            <h2 className="font-nunito font-black text-2xl text-text-primary">{title}</h2>
            <button
              type="button"
              data-sound="off"
              onClick={() => {
                setCloseInitiatedByModal(true)
                onClose()
              }}
              className="w-8 h-8 rounded-full border-2 border-[#E5E2E1] bg-white text-text-secondary hover:text-text-primary shadow-[0_2px_0_#E5E2E1] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    portalRoot
  )
}
