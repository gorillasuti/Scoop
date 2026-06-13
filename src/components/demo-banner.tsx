"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DISMISS_KEY = "scoop-demo-banner-dismissed";

/**
 * Compact demo notice banner shown inside the app (at the top of the (app) layout).
 * Dismissible for the current session.
 */
export function DemoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!IS_DEMO) return;
    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  if (!IS_DEMO || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <div className="demo-banner">
      <span className="demo-banner-text">
        🧪 Demo mód - az adatok 5 óránként törlődnek
      </span>
      <button
        onClick={dismiss}
        className="demo-banner-close"
        aria-label="Banner bezárása"
      >
        <X size={14} />
      </button>
    </div>
  );
}
