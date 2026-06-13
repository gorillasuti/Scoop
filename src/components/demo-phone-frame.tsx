"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/**
 * On desktop viewports (>500px), wraps the app in a phone-sized container
 * (430×932px) centered on a dark background. On mobile, renders normally.
 * Uses an iframe to force mobile Tailwind breakpoints perfectly.
 */

function CopyableCredential({ label, value }: { label: string, value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="flex items-center justify-between w-full p-2.5 bg-white border-2 border-border-default rounded-xl shadow-[0_2px_0_#E5E2E1] active:translate-y-[2px] active:shadow-[0_0_0_transparent] transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{label.split(' ')[0]}</span>
        <span className="font-sans font-bold text-[15px] text-text-primary">{value}</span>
      </div>
      <div className="relative w-5 h-5 flex items-center justify-center text-text-secondary">
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Check size={16} className="text-green-600" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Copy size={16} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}
export function DemoPhoneFrame({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (!IS_DEMO) return;

    setMounted(true);
    setIsIframe(window !== window.parent);
    setCurrentUrl(window.location.pathname + window.location.search);

    const mq = window.matchMedia("(min-width: 501px)");
    setIsDesktop(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // During SSR, or on mobile, or inside the iframe: render the app normally
  if (!IS_DEMO || !mounted || !isDesktop || isIframe) {
    return <>{children}</>;
  }

  // On desktop parent window: render the wrapper and host the app in an iframe
  return (
    <div className="demo-frame-bg">
      {/* Background decorations */}
      <div className="demo-frame-side demo-frame-side--left">
        <a
          href="https://github.com/gorillasuti/Scoop"
          target="_blank"
          rel="noopener noreferrer"
          className="demo-frame-github"
        >
          ⭐ Star on GitHub
        </a>
        <p className="demo-frame-subtitle">
          Self-hosted family recipe vault
        </p>
      </div>

      {/* Phone frame */}
      <div className="demo-frame-phone">
        <div className="demo-frame-notch" />
        <div className="w-full h-full" style={{ paddingTop: '38px', backgroundColor: '#FCF9F8' }}>
          <iframe 
            src={currentUrl} 
            className="w-full h-full border-none"
            title="Scoop Demo App"
            allow="display-capture; clipboard-write; clipboard-read"
          />
        </div>
      </div>

      <div className="demo-frame-side demo-frame-side--right">
        <div className="demo-frame-info">
          <p className="demo-frame-label">Demo Credentials</p>
          <CopyableCredential label="📧 Email" value="demo@scoop.app" />
          <CopyableCredential label="🔑 Pass" value="demo1234" />
        </div>
        <p className="demo-frame-reset-note">
          🔄 Data resets every 5 hours
        </p>
      </div>
    </div>
  );
}
