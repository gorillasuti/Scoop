"use client"

import { useState, useEffect } from "react"
import { useRive, useStateMachineInput, Layout, Fit, Alignment, RuntimeLoader } from "@rive-app/react-canvas"

// Set Wasm URL
if (typeof window !== "undefined") {
  RuntimeLoader.setWasmUrl("/api/wasm")
}

const STATE_MACHINE_NAME = "State Machine 1"

interface MascotProps {
  isFocus: boolean
  isPassword: boolean
  eyeTrack: number
  triggerSuccess?: number
  triggerFail?: number
  className?: string
}

export function Mascot({
  isFocus,
  isPassword,
  eyeTrack,
  triggerSuccess,
  triggerFail,
  className = "w-full h-full",
}: MascotProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { rive, RiveComponent } = useRive({
    src: "/Rive/8314-15930-animated-login-bunny-character.riv",
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.BottomCenter,
    }),
  })

  const isFocusInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "isFocus")
  const isPasswordInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "IsPassword")
  const eyeTrackInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "eye_track")
  const successTriggerInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "login_success")
  const failTriggerInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "login_fail")

  useEffect(() => {
    if (isFocusInput) isFocusInput.value = isFocus
  }, [isFocus, isFocusInput])

  useEffect(() => {
    if (isPasswordInput) isPasswordInput.value = isPassword
  }, [isPassword, isPasswordInput])

  useEffect(() => {
    if (eyeTrackInput) eyeTrackInput.value = eyeTrack
  }, [eyeTrack, eyeTrackInput])

  useEffect(() => {
    if (successTriggerInput && triggerSuccess && triggerSuccess > 0) {
      successTriggerInput.fire()
    }
  }, [triggerSuccess, successTriggerInput])

  useEffect(() => {
    if (failTriggerInput && triggerFail && triggerFail > 0) {
      failTriggerInput.fire()
    }
  }, [triggerFail, failTriggerInput])

  if (!mounted) return <div className="w-full h-full" />

  return <RiveComponent className={className} />
}
