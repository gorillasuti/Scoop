"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { BellButton } from "@/components/layout/bell-button"
import gsap from "gsap"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { playSound } from "@/lib/sounds"
import { toast } from "sonner"

import SlidingPuzzle from "@/components/games/sliding-puzzle"
import ConnectFour from "@/components/games/connect-four"
import TicTacToe from "@/components/games/tic-tac-toe"

const AVATARS_MAPPING: Record<string, string> = {
  'Face1-female': '/Avatar/Active characters/Character-female1.svg',
  'Face2-female': '/Avatar/Active characters/Character-female2.svg',
  'Face3-female': '/Avatar/Active characters/Character-female3.svg',
  'Face4-female': '/Avatar/Active characters/Character-female4.svg',
  'Face1': '/Avatar/Active characters/Character-Face1.svg',
  'Face2': '/Avatar/Active characters/Character-Face2.svg',
  'Face4': '/Avatar/Active characters/Character-Face4.svg',
  'Face5': '/Avatar/Active characters/Character-Face5.svg',
  'Face8': '/Avatar/Active characters/Character-Face8.svg',
}

export function AppHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const [avatarClicks, setAvatarClicks] = useState(0)
  const [showEasterEgg, setShowEasterEgg] = useState(false)
  const [stage, setStage] = useState<'welcome' | 'games' | 'puzzle15' | 'connect4' | 'tictactoe'>('welcome')

  useEffect(() => {
    // Sync body and document element background to krémfehér #FCF9F8 for in-app UI
    document.documentElement.style.backgroundColor = "#FCF9F8"
    document.body.style.background = "#FCF9F8"
    return () => {
      document.documentElement.style.backgroundColor = ""
      document.body.style.background = ""
    }
  }, [])

  // Lock body scroll when Easter Egg is active
  useEffect(() => {
    if (showEasterEgg) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [showEasterEgg])

  const firstName = session?.user?.name?.split(" ")[0] || "Szakács"
  const avatar = session?.user?.image || "Face1"
  const charPath = AVATARS_MAPPING[avatar] || `/Avatar/Active characters/Character-${avatar}.svg`
  const familyName = (session?.user as any)?.familyName || ""

  const welcomeText = `Szia, ${firstName}! Én vagyok a${familyName ? `(z) ${familyName}` : ""} konyha titkos főzősegédje! 🧑‍🍳 Megnyitottad a titkos játékszobámat! 🎮`

  const handleAvatarClick = () => {
    const nextClicks = avatarClicks + 1
    if (nextClicks >= 3) {
      setAvatarClicks(0)
      setStage('welcome')
      setShowEasterEgg(true)
      playSound("registrationSuccess")
    } else {
      setAvatarClicks(nextClicks)
      playSound("radio")
    }
  }

  // Effect to animate overlay children on display
  useEffect(() => {
    if (showEasterEgg) {
      // Create a timeline for entering elements
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      // 1. Fade the main app elements out with a slight drop
      tl.to("main, .app-header-container, nav", {
        opacity: 0,
        scale: 0.92,
        y: -15,
        duration: 0.6,
        ease: "power2.inOut"
      }, 0)

      // 2. Fade in the easter egg overlay container
      tl.fromTo(".easter-egg-overlay",
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        0.1
      )

      // 3. Scale and spring the speech bubble in from above
      tl.fromTo(".easter-egg-bubble",
        { scale: 0.4, y: -40, opacity: 0, rotate: -3 },
        { scale: 1, y: 0, opacity: 1, rotate: 0, duration: 0.75, ease: "elastic.out(1.1, 0.6)" },
        "-=0.2"
      )

      // 4. Slide the character up from the bottom with a springy slide
      tl.fromTo(".easter-egg-char",
        { y: 340, scale: 0.8, opacity: 0, height: "38dvh" },
        { y: 0, scale: 1, opacity: 1, height: "38dvh", duration: 0.85, ease: "back.out(1.4)" },
        0.1
      )

      // 5. Scale/Pop the action buttons in at the bottom
      tl.fromTo(".easter-egg-buttons",
        { scale: 0.8, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" },
        "-=0.4"
      )
    }
  }, [showEasterEgg])

  const handleSwitchStage = (nextStage: 'welcome' | 'games' | 'puzzle15' | 'connect4' | 'tictactoe') => {
    playSound("radio")

    const tl = gsap.timeline()

    // We are going to a game stage ('puzzle15' | 'connect4' | 'tictactoe')
    if (nextStage === 'puzzle15' || nextStage === 'connect4' || nextStage === 'tictactoe') {
      // 1. Hide the games list grid cards
      tl.to(".easter-egg-games-grid > div", {
        opacity: 0,
        scale: 0.85,
        y: 15,
        duration: 0.4,
        stagger: 0.05,
        ease: "power3.in"
      }, 0)

      // 2. Hide mascot character completely to make space for the game board
      tl.to(".easter-egg-char", {
        height: "0dvh",
        opacity: 0,
        duration: 0.4,
        ease: "power2.inOut"
      }, 0)

      // 3. Keep bubble compact
      tl.to(".easter-egg-bubble", {
        scale: 0.95,
        y: -10,
        duration: 0.55,
        ease: "power4.inOut"
      }, 0)

      // 4. Change stage and fade game in
      tl.call(() => setStage(nextStage), [], 0.2)

      tl.fromTo(".easter-egg-game-container",
        { opacity: 0, scale: 0.9, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: "back.out(1.2)" },
        0.25
      )
    }
    // We are going to the 'games' selector stage
    else if (nextStage === 'games') {
      const comingFromGame = stage === 'puzzle15' || stage === 'connect4' || stage === 'tictactoe'

      if (comingFromGame) {
        // 1. Hide active game board
        tl.to(".easter-egg-game-container", {
          opacity: 0,
          scale: 0.9,
          y: 15,
          duration: 0.4,
          ease: "power3.in"
        }, 0)
      } else {
        // Coming from welcome, scale down bubble
        tl.to(".easter-egg-bubble", {
          scale: 0.95,
          y: -10,
          duration: 0.55,
          ease: "power4.inOut"
        }, 0)
      }

      // 2. Animate mascot to the games screen size (24dvh)
      tl.to(".easter-egg-char", {
        height: "24dvh",
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out"
      }, 0)

      // 3. Switch stage to games and stagger games cards in
      tl.call(() => setStage('games'), [], 0.2)

      tl.fromTo(".easter-egg-games-grid > div",
        { opacity: 0, scale: 0.85, y: 15 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "back.out(1.2)"
        },
        0.25
      )
    }
    // We are going to the 'welcome' stage
    else if (nextStage === 'welcome') {
      // 1. Hide games list cards
      tl.to(".easter-egg-games-grid > div", {
        opacity: 0,
        scale: 0.85,
        y: 15,
        duration: 0.4,
        stagger: 0.05,
        ease: "power3.in"
      }, 0)

      // 2. Restore avatar character to full size
      tl.to(".easter-egg-char", {
        height: "38dvh",
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out"
      }, 0)

      // 3. Restore bubble
      tl.to(".easter-egg-bubble", {
        scale: 1,
        y: 0,
        duration: 0.55,
        ease: "back.out(1.2)"
      }, 0.1)

      tl.call(() => setStage('welcome'), [], 0.2)
    }
  }

  const handleLeaveEasterEgg = () => {
    playSound("swipe")
    const tl = gsap.timeline()

    // Stagger out the easter egg elements
    tl.to(".easter-egg-bubble", {
      scale: 0.8,
      opacity: 0,
      y: -20,
      duration: 0.35,
      ease: "power3.in"
    }, 0)

    tl.to(".easter-egg-char", {
      y: 340,
      scale: 0.8,
      opacity: 0,
      duration: 0.45,
      ease: "power3.in"
    }, 0.05)

    tl.to(".easter-egg-buttons", {
      scale: 0.8,
      opacity: 0,
      y: 10,
      duration: 0.3,
      ease: "power3.in"
    }, 0)

    if (stage === 'games') {
      tl.to(".easter-egg-games-grid > div", {
        scale: 0.85,
        opacity: 0,
        y: 15,
        duration: 0.35,
        stagger: 0.04,
        ease: "power3.in"
      }, 0)
    }

    tl.to(".easter-egg-overlay", {
      opacity: 0,
      duration: 0.45,
      ease: "power2.inOut",
      onComplete: () => {
        setShowEasterEgg(false)
        setStage('welcome')

        // Restore the main app elements
        gsap.fromTo("main, .app-header-container, nav",
          { opacity: 0, scale: 0.95, y: 15 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
            clearProps: "all"
          }
        )
      }
    }, 0.2)
  }

  let subtitle = "Jó étvágyat,"
  let title = `Szia, ${firstName}!`

  if (pathname === "/profil") {
    subtitle = "Beállítások"
    title = "Profil"
  } else if (pathname === "/kereses") {
    subtitle = "Receptek"
    title = "Keresés"
  } else if (pathname === "/uj-recept") {
    subtitle = "Megosztás"
    title = "Új recept"
  } else if (pathname === "/kedvencek") {
    subtitle = "Mentett"
    title = "Kedvencek"
  } else if (pathname?.startsWith("/recept/")) {
    subtitle = "Recept"
    title = "Részletek"
  }

  return (
    <>
      <header className="app-header-container max-w-5xl mx-auto w-full px-4 md:px-8 pt-6 flex items-center justify-between mb-6">
        <div>
          <p className="text-text-tertiary font-bold text-sm mb-0.5">{subtitle}</p>
          <h1 className="font-nunito font-black text-[28px] leading-none text-text-primary">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <BellButton />
          <div
            onClick={handleAvatarClick}
            className="w-12 h-12 flex-shrink-0 p-1.75 rounded-full border-2 border-border-default bg-[#E9F0FD] overflow-hidden shadow-[0_3px_0_#E5E2E1] flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none"
          >
            <img
              src={`/Avatar/Faces/${avatar}.svg`}
              alt="Avatar"
              className="w-full h-full object-contain object-bottom"
            />
          </div>
        </div>
      </header>

      {showEasterEgg && (
        <div className="easter-egg-overlay fixed inset-0 z-[9999] bg-[#FCF9F8] flex flex-col items-center justify-between p-6 pb-8 select-none overflow-hidden font-nunito">
          {/* Animated Background Aura */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,107,53,0.08)_0%,transparent_70%)] pointer-events-none" />

          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-5 relative mt-4">
            {/* Cartoonish Speech Bubble */}
            <div className="easter-egg-bubble relative bg-white border-4 border-text-primary rounded-[32px] p-5 shadow-[0_6px_0_#1C1B1B] w-full z-10">
              {/* Bubble text */}
              <div className="easter-egg-bubble-text text-text-primary text-sm sm:text-base font-black text-center leading-relaxed flex items-center justify-center">
                {stage === 'welcome'
                  ? welcomeText
                  : stage === 'games'
                    ? "Válassz egy játékot, amit szívesen játszanál! Készülj fel a kihívásra! 🏆"
                    : stage === 'puzzle15'
                      ? "Csúsztasd a helyére az összes számot a legkevesebb lépéssel! 🧩"
                      : stage === 'connect4'
                        ? "Kösd össze 4 azonos színű korongodat a győzelemért! 🔴🟡"
                        : "Győzd le a verhetetlen robotot egy klasszikus Tic-Tac-Toe ban! ❌⭕"
                }
              </div>

              {/* Speech bubble tail pointer */}
              {stage === 'welcome' && (
                <>
                  <div
                    className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-[16px] border-x-transparent border-t-[16px]"
                    style={{ borderTopColor: "var(--text-primary, #1C1B1B)" }}
                  />
                  <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-[14px] border-x-transparent border-t-[14px] border-t-white" />
                </>
              )}
            </div>

            {/* Games Grid Container */}
            <div
              className="easter-egg-games-grid w-full z-10 flex flex-col gap-3"
              style={{ display: stage === 'games' ? 'flex' : 'none' }}
            >
              {[
                {
                  id: 'puzzle15',
                  title: 'Csúszólapka kirakó',
                  desc: 'Told helyre a számokat, vagy ha feladnád bízd a gépre! 🧩',
                  color: '#FFB347',
                  icon: (
                    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-5 h-5 font-black text-[9px] text-white">
                      <div className="bg-white/20 rounded flex items-center justify-center">1</div>
                      <div className="bg-white/20 rounded flex items-center justify-center">2</div>
                      <div className="bg-white/20 rounded flex items-center justify-center">3</div>
                      <div className="bg-white/20 rounded flex items-center justify-center">4</div>
                    </div>
                  )
                },
                {
                  id: 'connect4',
                  title: 'Connect 4',
                  desc: 'Köss össze négy korongot a gép ellen vagy kettesben! 🔴🟡',
                  color: '#60A5FA',
                  icon: (
                    <div className="flex gap-0.5 items-center justify-center w-5 h-5">
                      <div className="w-2 h-2 rounded-full bg-[#EF4444] border border-white/40 shadow-sm" />
                      <div className="w-2 h-2 rounded-full bg-[#FBBF24] border border-white/40 shadow-sm" />
                    </div>
                  )
                },
                {
                  id: 'tictactoe',
                  title: 'Tic-Tac-Toe',
                  desc: 'Győzd le a robotot a klasszikus Tic-Tac-Toe ban! ❌⭕',
                  color: '#8B5CF6',
                  icon: (
                    <div className="flex gap-0.5 items-center justify-center font-black text-[10px] text-white">
                      <span className="text-[#FFEDED]">X</span>
                      <span className="text-[#E0F2FE]">O</span>
                    </div>
                  )
                }
              ].map((game) => (
                <div
                  key={game.id}
                  onClick={() => {
                    handleSwitchStage(game.id as any)
                  }}
                  className="flex items-center gap-4 p-3 bg-white border-2 border-text-primary rounded-2xl cursor-pointer hover:bg-bg-card transition-all active:scale-[0.98] shadow-[0_4px_0_#1C1B1B] hover:translate-y-[-2px] hover:shadow-[0_6px_0_#1C1B1B] active:translate-y-[1px] active:shadow-[0_2px_0_#1C1B1B]"
                >
                  <div
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center border-2 border-text-primary shadow-[0_3px_0_#1C1B1B] overflow-hidden"
                    style={{ backgroundColor: game.color }}
                  >
                    {game.icon}
                  </div>
                  <div className="flex-1 min-w-0 font-nunito">
                    <h4 className="text-xs font-black text-text-primary">{game.title}</h4>
                    <p className="text-[10px] text-text-secondary font-medium truncate">{game.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Game Container */}
            {(stage === 'puzzle15' || stage === 'connect4' || stage === 'tictactoe') && (
              <div className="easter-egg-game-container w-full z-10 flex flex-col items-center">
                {stage === 'puzzle15' && <SlidingPuzzle initialSize={4} />}
                {stage === 'connect4' && <ConnectFour />}
                {stage === 'tictactoe' && <TicTacToe />}
              </div>
            )}

            {/* Full Body Character */}
            <div className="easter-egg-char relative h-[38dvh] w-full flex items-end justify-center select-none pointer-events-none">
              <img
                src={charPath}
                alt="Character Mascot"
                className="h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)]"
              />
            </div>
          </div>

          {/* Footer Buttons Pinned at the Bottom */}
          <div className="easter-egg-buttons w-full max-w-sm flex gap-4 mt-6 z-20">
            <Button3D
              type="secondary"
              rounded="full"
              containerProps={{
                style: {
                  flex: 1,
                  height: "46px",
                  "--button-secondary-color": stage === 'welcome' ? "#FFF5F5" : "#FFFFFF",
                  "--button-secondary-color-dark": stage === 'welcome' ? "#FED7D7" : "#E5E2E1",
                  "--button-secondary-color-hover": stage === 'welcome' ? "#FFF8F8" : "#FCF9F8",
                  "--button-secondary-color-light": stage === 'welcome' ? "#EF4444" : "#1C1B1B",
                } as React.CSSProperties
              }}
              onPress={stage === 'welcome' ? handleLeaveEasterEgg : (stage === 'games' ? () => handleSwitchStage('welcome') : () => handleSwitchStage('games'))}
            >
              <span className={`font-nunito font-black text-xs ${stage === 'welcome' ? 'text-[#EF4444]' : 'text-text-primary'}`}>
                {stage === 'welcome' ? "Bezárás" : "Vissza"}
              </span>
            </Button3D>

            <Button3D
              type={stage === 'welcome' ? "primary" : "secondary"}
              rounded="full"
              containerProps={{
                style: {
                  flex: 1.5,
                  height: "46px",
                  "--button-primary-color": "#FF6B35",
                  "--button-primary-color-dark": "#E85A28",
                  "--button-primary-color-hover": "#FF7B48",
                  "--button-primary-color-light": "#FFFFFF",
                  "--button-secondary-color": "#FFF5F5",
                  "--button-secondary-color-dark": "#FED7D7",
                  "--button-secondary-color-hover": "#FFF8F8",
                  "--button-secondary-color-light": "#EF4444",
                } as React.CSSProperties
              }}
              onPress={stage === 'welcome' ? () => handleSwitchStage('games') : handleLeaveEasterEgg}
            >
              <span className={`font-nunito font-black text-xs ${stage === 'welcome' ? 'text-white' : 'text-[#EF4444]'}`}>
                {stage === 'welcome' ? "Játékok 🎮" : "Bezárás"}
              </span>
            </Button3D>
          </div>
        </div>
      )}
    </>
  )
}
