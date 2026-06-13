"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, User, Mail, Lock, EyeOff, Eye } from "lucide-react"
import { Button3D } from "react-3d-button"
import 'react-3d-button/styles'
import { useRive, useStateMachineInput, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/react-canvas';

RuntimeLoader.setWasmUrl('/api/wasm');
import { setupAdmin, registerUser } from "@/app/actions/auth"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { dispatchSound, playSound } from "@/lib/sounds"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(useGSAP)

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

export default function RegisterForm({
  isFirstUser,
  inviteValid,
  token,
}: {
  isFirstUser: boolean
  inviteValid: boolean
  token: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eyeContainerRef = useRef<HTMLButtonElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const isTogglingPassword = useRef(false);

  const [step, setStep] = useState<'welcome' | 'register'>('welcome');
  const [isFocus, setIsFocus] = useState(false);
  const [isPassword, setIsPassword] = useState(false);
  const [eyeTrack, setEyeTrack] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    if (e.target.id === "name") {
      setName(value);
    } else if (e.target.id === "email") {
      setEmail(value);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Minden mezőbe kell írni valamit!", { id: "validation-error" });
      setFailCount(prev => prev + 1);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Kérlek adj meg egy érvényes email címet!", { id: "validation-error" });
      setFailCount(prev => prev + 1);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);

      let res;
      if (token) {
        formData.append("token", token);
        res = await registerUser(formData);
      } else {
        res = await setupAdmin(formData);
      }

      if (res?.error) {
        toast.error(res.error);
        setFailCount(prev => prev + 1);
        setLoading(false);
        return;
      }

      toast.success("Szuper! Sikeres regisztráció! Készül a konyhád... 🍳");
      dispatchSound("registrationSuccess");
      setSuccessCount(prev => prev + 1);

      setTimeout(async () => {
        await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: true,
          callbackUrl: "/onboarding",
        });
      }, 1000);

    } catch (err: any) {
      console.error("REGISTRATION ERROR:", err);
      toast.error(`Jaj, valami porszem került a gépezetbe: ${err.message || err} 🛠️`);
      setFailCount(prev => prev + 1);
      setLoading(false);
    }
  };

  // GSAP animations for steps & mascot scaling
  const isInitial = useRef(true);
  useGSAP(() => {
    if (!containerRef.current) return;

    // We no longer need to scale down the mascot manually since CSS flexbox handles it

    if (isInitial.current) {
      isInitial.current = false;
      if (step === 'welcome') {
        gsap.set(".welcome-screen", { x: 0, autoAlpha: 1 });
        gsap.set(".register-screen", { x: 100, autoAlpha: 0 });
        gsap.set(".mascot-container", { scale: 1, y: 0 });
      } else {
        gsap.set(".welcome-screen", { x: -100, autoAlpha: 0 });
        gsap.set(".register-screen", { x: 0, autoAlpha: 1 });
        gsap.set(".mascot-container", { scale: 1, y: 0 });
      }
      return;
    }

    if (step === 'register') {
      gsap.timeline()
        .to(".welcome-screen", {
          x: -50,
          autoAlpha: 0,
          duration: 0.35,
          ease: "power3.inOut"
        })
        .fromTo(".register-screen",
          { x: 50, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.35,
            ease: "power3.inOut",
            clearProps: "transform"
          },
          "-=0.25"
        )
        .to(".mascot-container", {
          scale: 1,
          duration: 0.45,
          ease: "power3.out"
        }, 0);
    } else {
      gsap.timeline()
        .to(".register-screen", {
          x: 50,
          autoAlpha: 0,
          duration: 0.35,
          ease: "power3.inOut"
        })
        .fromTo(".welcome-screen",
          { x: -50, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.35,
            ease: "power3.inOut",
            clearProps: "transform"
          },
          "-=0.25"
        )
        .to(".mascot-container", {
          scale: 1,
          duration: 0.45,
          ease: "power3.out"
        }, 0);
    }
  }, { scope: containerRef, dependencies: [step] });

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

  // 1. CLOSED REGISTRATION SCREEN (Invite required, but none or invalid token provided)
  if (!isFirstUser && !inviteValid) {
    return (
      <main ref={containerRef} className="relative w-full h-[100dvh] overflow-hidden select-none flex flex-col items-center justify-start pt-8 pb-0">

        <header className="flex-shrink-0 z-30 mb-8 w-full flex justify-center px-6">
          <img src="/Logo.svg" alt="Scoop" className="h-[50px] w-auto object-contain text-text-primary" />
        </header>

        <div className="relative z-20 w-full max-w-[400px] flex flex-col flex-shrink-0 px-6">
          <div className="flex flex-col items-center text-center px-5 py-8 bg-white border-2 border-[#E5E2E1] rounded-[16px] shadow-[0_4px_0_#E5E2E1] w-full">
            <div className="w-14 h-14 rounded-full bg-white border-2 border-border-default shadow-[0_4px_0_#E5E2E1] flex items-center justify-center text-accent-primary mb-6">
              <Lock size={28} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight leading-snug mb-3">
              A regisztráció zárt körű
            </h1>
            <p className="text-text-secondary text-sm font-medium leading-relaxed mb-6">
              A családi receptkönyvbe csak meghívó linkkel lehet bejutni. Kérj meg egy családtagot, hogy küldjön neked egy meghívót! ✉️
            </p>
            <Link href="/login" className="w-full cursor-pointer">
              <Button3D className="w-full cursor-pointer" type="primary" fullWidth rounded="full" size="xl">
                Bejelentkezés 🔑
              </Button3D>
            </Link>
          </div>
        </div>

        {/* Mascot */}
        <div className="w-full flex-1 flex justify-center items-end min-h-0 z-10 mt-4 pointer-events-none">
          <div className="mascot-container relative w-auto h-full max-h-[490px] aspect-[520/490] origin-bottom flex-shrink-0 pointer-events-auto scale-110 md:scale-100">
            <Mascot isFocus={false} isPassword={false} eyeTrack={0} />
          </div>
        </div>
      </main>
    );
  }

  // 2. OPEN REGISTRATION (First user admin OR valid invite token)
  return (
    <main ref={containerRef} className="relative w-full h-[100dvh] overflow-hidden select-none flex flex-col">
      <style>{`
        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-draw {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw-line 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: 0.6s;
        }
      `}</style>

      {/* Bunny Mascot */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center z-10 pointer-events-none" style={{ top: 'max(400px, 45dvh)' }}>
        <div className="mascot-container relative w-auto h-full max-h-[490px] aspect-[520/490] origin-bottom transform-gpu flex-shrink-0 pointer-events-auto scale-110 md:scale-100">
          <Mascot
            isFocus={step === 'welcome' ? false : (showPassword ? false : isFocus)}
            isPassword={step === 'welcome' ? false : (showPassword ? true : isPassword)}
            eyeTrack={step === 'welcome' ? 0 : eyeTrack}
            triggerSuccess={successCount}
            triggerFail={failCount}
          />
        </div>
      </div>

      {/* Screen 1: Welcome Screen */}
      <div className="welcome-screen absolute inset-0 w-full h-full flex flex-col items-center justify-center px-6 z-20 overflow-hidden invisible">
        {/* Welcome Content (Vertically Centered) */}
        <div className="w-full max-w-sm flex flex-col items-center justify-center z-20">
          {/* Top Logo */}
          <div className="flex items-center mb-16">
            <img src="/Logo.svg" alt="Scoop" className="h-[65px] w-auto object-contain text-text-primary" />
          </div>

          {/* Title Text */}
          <div className="flex flex-col items-center text-center px-4 mb-8">
            <h1 className="text-4xl font-black text-text-primary tracking-tight leading-none font-sans relative">
              Családi <span className="text-accent-primary font-black relative inline-block">
                receptkönyv
                <svg className="absolute -bottom-2.5 left-0 w-full h-2 text-accent-primary/20 pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path className="animate-draw" d="M0,5 Q50,0 100,5" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
          </div>

          {/* Start button */}
          <div className="w-full px-4 max-w-sm mx-auto flex flex-col items-center mt-2">
            <Button3D className="cursor-pointer" type="primary" fullWidth rounded="full" size="xl" onPress={() => setStep('register')}>
              {isFirstUser ? "Kezdjünk neki! 📖" : "Nyissuk meg! 📖"}
            </Button3D>
            <span className="text-xs font-medium text-text-secondary mt-3 text-center">
              {isFirstUser ? "Koppints a fiók létrehozásához • családi receptes füzet 🍳" : "Koppints a kezdéshez • családi receptes füzet 🍳"}
            </span>
          </div>
        </div>
      </div>

      {/* Screen 2: Credentials Screen */}
      <div className="register-screen absolute inset-0 w-full h-full flex flex-col items-center justify-center px-6 z-20 invisible overflow-hidden">
        <header className="absolute top-8 left-6 right-6 flex items-center gap-4 z-30">
          <Button3D
            type="secondary"
            iconOnly
            rounded="full"
            onPress={() => {
              playSound("swipe")
              setStep('welcome')
            }}
            className="cursor-pointer"
          >
            <ArrowLeft size={22} />
          </Button3D>

          <div className="flex-1 h-5 bg-bg-elevated rounded-full border-2 border-border-default shadow-[inset_0_2px_3px_rgba(0,0,0,0.08)] relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#60A5FA] to-[#007bff] rounded-full transition-all duration-500 ease-out relative"
              style={{ width: '33%' }}
            >
              <div className="absolute inset-x-0 top-[1px] h-[35%] bg-white/30 rounded-full" />
            </div>
          </div>
        </header>

        {/* Credentials Form Content (Vertically Centered) */}
        <div className="relative z-20 w-full max-w-sm flex flex-col justify-center">
          <div className="flex flex-col items-center text-center mb-6">
            <h1 className="text-2xl font-black text-text-primary mb-1 tracking-tight leading-snug">
              {isFirstUser ? "Hozzuk létre az első fiókot!" : "Csatlakozz a családodhoz!"}
            </h1>
            <p className="text-text-secondary text-sm font-medium">
              {isFirstUser ? "Ez a fiók lesz az adminisztrátor. 🍳" : "Add meg a kért adatokat a regisztrációhoz. 🍳"}
            </p>
          </div>

          <form className="flex flex-col gap-4 mb-6" onSubmit={handleSubmit}>
            <div className="relative flex items-center bg-[#FAF7F6] border-2 border-[#E5E2E1] rounded-full px-5 h-12 shadow-[0_4px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
              <User className="text-text-tertiary mr-3 transition-colors duration-200 group-focus-within:text-[#007bff]" size={22} />
              <input
                className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-base cursor-pointer"
                id="name"
                placeholder="Becenév (pl. Anya / Dani)"
                required
                type="text"
                value={name}
                onFocus={() => { setIsFocus(true); setIsPassword(false); }}
                onBlur={() => setIsFocus(false)}
                onChange={handleTextChange}
              />
            </div>

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

            <div className="relative flex items-center bg-[#FAF7F6] border-2 border-[#E5E2E1] rounded-full px-5 h-12 shadow-[0_4px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
              <Lock className="text-text-tertiary mr-3 transition-colors duration-200 group-focus-within:text-[#007bff]" size={22} />
              <input
                ref={passwordInputRef}
                className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-base cursor-pointer"
                id="password"
                placeholder="Biztonságos jelszó"
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
              {loading ? "Készülődünk... 🥣" : "Főzzünk valami finomat! 🍳"}
            </Button3D>
          </div>
        </div>
      </div>
    </main>
  );
}
