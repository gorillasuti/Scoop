"use client"
import { useState, useEffect, useRef } from "react"
import { Mail, Lock, EyeOff, Eye } from "lucide-react"
import { Button3D } from "react-3d-button"
import 'react-3d-button/styles'
import { useRive, useStateMachineInput, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/react-canvas'

RuntimeLoader.setWasmUrl('/api/wasm');
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(useGSAP)

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const STATE_MACHINE_NAME = 'State Machine 1';

function Mascot({
  isFocus,
  isPassword,
  eyeTrack,
  triggerSuccess,
  triggerFail,
}: {
  isFocus: boolean
  isPassword: boolean
  eyeTrack: number
  triggerSuccess?: number
  triggerFail?: number
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { rive, RiveComponent } = useRive({
    src: '/Rive/8314-15930-animated-login-bunny-character.riv',
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.BottomCenter,
    }),
  });

  const isFocusInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'isFocus');
  const isPasswordInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'IsPassword');
  const eyeTrackInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'eye_track');
  const successTriggerInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'login_success');
  const failTriggerInput = useStateMachineInput(rive, STATE_MACHINE_NAME, 'login_fail');

  useEffect(() => {
    if (isFocusInput) isFocusInput.value = isFocus;
  }, [isFocus, isFocusInput]);

  useEffect(() => {
    if (isPasswordInput) isPasswordInput.value = isPassword;
  }, [isPassword, isPasswordInput]);

  useEffect(() => {
    if (eyeTrackInput) eyeTrackInput.value = eyeTrack;
  }, [eyeTrack, eyeTrackInput]);

  useEffect(() => {
    if (successTriggerInput && triggerSuccess && triggerSuccess > 0) {
      successTriggerInput.fire();
    }
  }, [triggerSuccess, successTriggerInput]);

  useEffect(() => {
    if (failTriggerInput && triggerFail && triggerFail > 0) {
      failTriggerInput.fire();
    }
  }, [triggerFail, failTriggerInput]);

  if (!mounted) return <div className="w-full h-full" />;

  return <RiveComponent className="w-full h-full" />;
}

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackUrlRef = useRef("/");
  const eyeContainerRef = useRef<HTMLButtonElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const isTogglingPassword = useRef(false);

  const [isFocus, setIsFocus] = useState(false);
  const [isPassword, setIsPassword] = useState(false);
  const [eyeTrack, setEyeTrack] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const [email, setEmail] = useState(IS_DEMO ? "demo@scoop.app" : "");
  const [password, setPassword] = useState(IS_DEMO ? "demo1234" : "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("callbackUrl");
    callbackUrlRef.current = next && next.startsWith("/") ? next : "/";
  }, []);

  useEffect(() => {
    if (isTogglingPassword.current && passwordInputRef.current) {
      passwordInputRef.current.focus();
      isTogglingPassword.current = false;
    }
  }, [showPassword]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const length = value.length;
    const trackValue = Math.min((length / 30) * 100, 100);
    setEyeTrack(trackValue);
    setEmail(value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      toast.error("Minden mező kitöltése kötelező!", { id: "validation-error" });
      setFailCount(prev => prev + 1);
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Hibás email cím vagy jelszó!");
        setFailCount(prev => prev + 1);
        setLoading(false);
        return;
      }

      toast.success("Sikeres bejelentkezés! Üdv újra! 🍳");
      setSuccessCount(prev => prev + 1);
      setTimeout(() => {
        window.location.href = callbackUrlRef.current;
      }, 1000);
    } catch {
      toast.error("Hiba történt a bejelentkezés során.");
      setFailCount(prev => prev + 1);
      setLoading(false);
    }
  };

  // GSAP animation for mascot container
  useGSAP(() => {
    gsap.set(".mascot-container", { scale: 1, y: 0 });
  }, { scope: containerRef });

  // Eye toggle animation
  const isInitialEye = useRef(true);
  useGSAP(() => {
    if (!eyeContainerRef.current) return;

    if (isInitialEye.current) {
      isInitialEye.current = false;
      if (showPassword) {
        gsap.set(".eye-icon", { scale: 1, opacity: 1, rotate: 0 });
        gsap.set(".eye-off-icon", { scale: 0, opacity: 0, rotate: -45 });
      } else {
        gsap.set(".eye-icon", { scale: 0, opacity: 0, rotate: 45 });
        gsap.set(".eye-off-icon", { scale: 1, opacity: 1, rotate: 0 });
      }
      return;
    }

    const timeline = gsap.timeline({ defaults: { ease: "back.out(1.6)", duration: 0.3 } });
    if (showPassword) {
      timeline.to(".eye-off-icon", { scale: 0, opacity: 0, rotate: -45 })
        .fromTo(".eye-icon", { scale: 0, opacity: 0, rotate: 45 }, { scale: 1, opacity: 1, rotate: 0 }, "-=0.15");
    } else {
      timeline.to(".eye-icon", { scale: 0, opacity: 0, rotate: 45 })
        .fromTo(".eye-off-icon", { scale: 0, opacity: 0, rotate: -45 }, { scale: 1, opacity: 1, rotate: 0 }, "-=0.15");
    }
  }, { scope: eyeContainerRef, dependencies: [showPassword] });

  return (
    <main ref={containerRef} className="relative w-full h-[100dvh] overflow-hidden select-none flex flex-col items-center justify-start pt-8 pb-0">

      <header className="flex-shrink-0 z-30 mb-8 w-full flex justify-center px-6">
        <img src="/Logo.svg" alt="Scoop" className="h-[50px] w-auto object-contain text-text-primary" />
      </header>

      <div className="relative z-20 w-full max-w-[400px] flex flex-col flex-shrink-0 px-6">
        <div className="flex flex-col items-center text-center mb-6">
          <h1 className="text-2xl font-black text-text-primary mb-1 tracking-tight leading-snug">
            Üdv újra az éléskamrában!
          </h1>
          <p className="text-text-secondary text-sm font-medium">
            {IS_DEMO ? "Kattints a Belépés gombra a demo kipróbálásához! 🚀" : "Jelentkezz be a receptkönyv megnyitásához. 🍳"}
          </p>
        </div>

        {IS_DEMO && (
          <div className="demo-login-badge mb-4">
            🧪 Demo mód - adatok 5 óránként törlődnek
          </div>
        )}

        <form className="flex flex-col gap-4 mb-6" onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="relative flex items-center bg-[#FAF7F6] border-2 border-[#E5E2E1] rounded-full px-5 h-12 shadow-[0_4px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
            <Mail className="text-text-tertiary mr-3 transition-colors duration-200 group-focus-within:text-[#007bff]" size={22} />
            <input
              className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-base cursor-pointer"
              id="email"
              placeholder="Email címed"
              required
              type="email"
              value={email}
              onFocus={() => { setIsFocus(true); setIsPassword(false); }}
              onBlur={() => setIsFocus(false)}
              onChange={handleTextChange}
            />
          </div>

          {/* Password Input */}
          <div className="relative flex items-center bg-[#FAF7F6] border-2 border-[#E5E2E1] rounded-full px-5 h-12 shadow-[0_4px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
            <Lock className="text-text-tertiary mr-3 transition-colors duration-200 group-focus-within:text-[#007bff]" size={22} />
            <input
              ref={passwordInputRef}
              className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-base cursor-pointer"
              id="password"
              placeholder="Jelszó"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onFocus={() => { setIsFocus(true); setIsPassword(true); }}
              onBlur={() => {
                if (isTogglingPassword.current) return;
                setIsFocus(false);
                setIsPassword(false);
              }}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              ref={eyeContainerRef}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => {
                isTogglingPassword.current = true;
                setShowPassword(!showPassword);
              }}
              aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megmutatása"}
              className="relative text-text-tertiary hover:text-text-primary transition-colors ml-3 focus:outline-none cursor-pointer w-8 h-8 flex items-center justify-center overflow-hidden"
              type="button"
            >
              <Eye className="eye-icon absolute opacity-0 scale-0" size={22} />
              <EyeOff className="eye-off-icon absolute opacity-100 scale-100" size={22} />
            </button>
          </div>
        </form>

        <div className="w-full mb-4 mt-2">
          <Button3D
            className="w-full cursor-pointer"
            type="primary"
            fullWidth
            rounded="full"
            size="xl"
            disabled={loading}
            onPress={() => handleSubmit()}
          >
            {loading ? "Belépés folyamatban... 🥣" : "Lépjünk be! 🔑"}
          </Button3D>
        </div>
      </div>

      {/* Mascot */}
      <div className="w-full flex-1 flex justify-center items-end min-h-0 z-10 mt-4 pointer-events-none">
        <div className="mascot-container relative w-auto h-full max-h-[490px] aspect-[520/490] origin-bottom flex-shrink-0 pointer-events-auto scale-110 md:scale-100">
          <Mascot
            isFocus={showPassword ? false : isFocus}
            isPassword={showPassword ? true : isPassword}
            eyeTrack={eyeTrack}
            triggerSuccess={successCount}
            triggerFail={failCount}
          />
        </div>
      </div>
    </main>
  );
}
