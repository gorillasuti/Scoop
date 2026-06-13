"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useRef } from "react"
import { HomeIcon } from "@/components/animated-icons/home"
import { SearchIcon } from "@/components/animated-icons/search"
import { PlusIcon } from "@/components/animated-icons/plus"
import { HeartIcon } from "@/components/animated-icons/heart"
import { SettingsIcon } from "@/components/animated-icons/settings"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"

const navItems = [
  { href: "/", icon: HomeIcon, label: "Főoldal", size: 24 },
  { href: "/kereses", icon: SearchIcon, label: "Keresés", size: 24 },
  { href: "/uj-recept", icon: PlusIcon, label: "Új recept", size: 28, isAction: true },
  { href: "/kedvencek", icon: HeartIcon, label: "Kedvencek", size: 24 },
  { href: "/profil", icon: SettingsIcon, label: "Beállítások", size: 24 },
]

function NavItem({ item, isActive }: { item: typeof navItems[0], isActive: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconRef = useRef<any>(null)
  const router = useRouter()

  const handleMouseEnter = () => {
    iconRef.current?.startAnimation?.()
  }

  const handleMouseLeave = () => {
    iconRef.current?.stopAnimation?.()
  }

  const IconComponent = item.icon

  if (item.isAction) {
    return (
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => router.push(item.href)}
        className="flex-1 flex justify-center cursor-pointer transition-transform hover:scale-[1.02]"
      >
        {/* We use a relative container matching the standard button height (h-12) to prevent stretching the nav */}
        <div className="relative w-14 h-12 flex justify-center">
          {/* Absolute positioning pulls it out of document flow, fixing the whitespace bug */}
          <div className="absolute -top-4 w-[56px] h-[56px]">
            <Button3D
              type="primary"
              iconOnly
              rounded="full"
              containerProps={{ style: { width: '56px', height: '56px' } }}
              className="w-full h-full p-0 flex items-center justify-center"
            >
              <IconComponent ref={iconRef} size={28} className="pointer-events-none" />
            </Button3D>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => router.push(item.href)}
      className="flex-1 flex justify-center px-0 cursor-pointer transition-all duration-200"
    >
      <Button3D
        type={isActive ? "primary" : "secondary"}
        iconOnly
        rounded="xl"
        className={`w-full h-12 p-0 flex items-center justify-center ${isActive ? "" : "bg-[#F4F6F9] text-text-secondary hover:text-text-primary"}`}
      >
        <IconComponent ref={iconRef} size={item.size} className="pointer-events-none" />
      </Button3D>
    </div>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fromQuery = searchParams ? searchParams.get("from") : null

  let activeHref = pathname
  if (pathname?.startsWith("/recept/")) {
    activeHref = fromQuery || "/"
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background bar to hide scrolled content under/around the bottom nav */}
      <div className="absolute inset-x-0 bottom-0 h-[100px] bg-[#FCF9F8] pointer-events-none" />

      <div className="relative px-4 pb-6 pt-2 pointer-events-none">
        <nav className="mx-auto max-w-md w-full bg-white border-2 border-border-default rounded-[24px] shadow-[0_6px_0_#E5E2E1] pointer-events-auto flex items-center justify-between px-4 py-2">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} isActive={activeHref === item.href} />
          ))}
        </nav>
      </div>
    </div>
  )
}
