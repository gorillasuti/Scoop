"use client"
import { SessionProvider } from "next-auth/react"
import { useEffect } from "react"
import { SoundProvider } from "@/components/sound-provider"
import { NotificationListener } from "@/components/notification-listener"

export function Providers({ children, vapidPublicKey }: { children: React.ReactNode; vapidPublicKey: string }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }, []);

  return (
    <SessionProvider>
      <SoundProvider>
        <NotificationListener vapidPublicKey={vapidPublicKey} />
        {children}
      </SoundProvider>
    </SessionProvider>
  )
}
