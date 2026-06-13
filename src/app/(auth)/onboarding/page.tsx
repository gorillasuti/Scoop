"use client"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { ArrowLeft, Check, Copy, ChefHat, Salad, Soup, Utensils, Drumstick, Fish, Apple, Coffee, CakeSlice, Leaf, Clock, TreePine, Egg, Bell, Download, Volume2, Flame } from "lucide-react"
import { Button3D } from "react-3d-button"
import 'react-3d-button/styles'
import { AnimatedUnderline } from "@/components/animate-ui/animated-underline"
import { completeOnboarding, createInvite } from "@/app/actions/auth"
import { toast } from "sonner"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { useRive, useStateMachineInput, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/react-canvas';
import { sounds, playSound } from "@/lib/sounds"
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

RuntimeLoader.setWasmUrl('/api/wasm');

gsap.registerPlugin(useGSAP)

const STATE_MACHINE_NAME = 'State Machine 1';

function Mascot({ isFocus, isPassword, eyeTrack }: { isFocus: boolean, isPassword: boolean, eyeTrack: number }) {
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

  useEffect(() => {
    if (isFocusInput) isFocusInput.value = isFocus;
  }, [isFocus, isFocusInput]);

  useEffect(() => {
    if (isPasswordInput) isPasswordInput.value = isPassword;
  }, [isPassword, isPasswordInput]);

  useEffect(() => {
    if (eyeTrackInput) eyeTrackInput.value = eyeTrack;
  }, [eyeTrack, eyeTrackInput]);

  if (!mounted) return <div className="w-full h-full" />;

  return <RiveComponent className="w-full h-full" />;
}



const AVATARS = [
  { id: 'Face1-female', path: '/Avatar/Faces/Face1-female.svg', charPath: '/Avatar/Active characters/Character-female1.svg', name: 'Pimasz' },
  { id: 'Face2-female', path: '/Avatar/Faces/Face2-female.svg', charPath: '/Avatar/Active characters/Character-female2.svg', name: 'Boldog' },
  { id: 'Face3-female', path: '/Avatar/Faces/Face3-female.svg', charPath: '/Avatar/Active characters/Character-female3.svg', name: 'Nyugodt' },
  { id: 'Face4-female', path: '/Avatar/Faces/Face4-female.svg', charPath: '/Avatar/Active characters/Character-female4.svg', name: 'Meglepett' },
  { id: 'Face1', path: '/Avatar/Faces/Face1.svg', charPath: '/Avatar/Active characters/Character-Face1.svg', name: 'Nyugodt' },
  { id: 'Face2', path: '/Avatar/Faces/Face2.svg', charPath: '/Avatar/Active characters/Character-Face2.svg', name: 'Gyanakvó' },
  { id: 'Face4', path: '/Avatar/Faces/Face4.svg', charPath: '/Avatar/Active characters/Character-Face4.svg', name: 'Ravasz' },
  { id: 'Face5', path: '/Avatar/Faces/Face5.svg', charPath: '/Avatar/Active characters/Character-Face5.svg', name: 'Fáradt' },
  { id: 'Face8', path: '/Avatar/Faces/Face8.svg', charPath: '/Avatar/Active characters/Character-Face8.svg', name: 'Vigyorgó' },
]

export default function OnboardingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: session, update: updateSession } = useSession();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [familyName, setFamilyName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [eyeTrack, setEyeTrack] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    sounds.preload();
    sounds.setEnabled(false); // Start sound disabled for onboarding flow
    setSoundEnabled(false);
  }, []);

  const lastToggleRef = useRef(0);

  const handleSoundToggle = () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 400) return;
    lastToggleRef.current = now;

    const nextState = !soundEnabled;
    sounds.setEnabled(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playSound("toggleOn");
    }
  };

  const [inviteLink, setInviteLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const lastClickRef = useRef(0);

  const handleInstallClick = async () => {
    const now = Date.now();
    if (now - lastClickRef.current < 500) return;
    lastClickRef.current = now;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("Köszi, hogy telepítetted a Receptkönyvet! 🎉", { id: "install-toast" });
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        toast.info(
          "iOS-en való mentéshez: koppints a Megosztás gombra a Safari alján, majd a 'Továbbiak megtekintése' és utolsó lépésként pedig a 'Főképernyőhöz adás' opciót!",
          { id: "install-toast", duration: 8000 }
        );
      } else {
        toast.info(
          "A telepítéshez használd a böngésző menüjét és válaszd a 'Telepítés' vagy 'Főképernyőhöz adás' lehetőséget!",
          { id: "install-toast", duration: 8000 }
        );
      }
    }
  };

  const handleNotificationClick = async () => {
    const now = Date.now();
    if (now - lastClickRef.current < 500) return;
    lastClickRef.current = now;

    if (!('Notification' in window)) {
      toast.error("Ez a böngésző nem támogatja az értesítéseket.", { id: "notification-toast" });
      return;
    }

    if (Notification.permission === 'granted') {
      toast.success("Az értesítések már be vannak kapcsolva! 🔔", { id: "notification-toast" });
      window.dispatchEvent(new CustomEvent("trigger-push-subscribe"));
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success("Értesítések bekapcsolva! 🔔", { id: "notification-toast" });
        window.dispatchEvent(new CustomEvent("trigger-push-subscribe"));
      } else if (permission === 'denied') {
        toast.error("Az értesítések le vannak tiltva a böngésződben.", { id: "notification-toast" });
      } else {
        toast.info("Értesítések engedélyezése elhalasztva.", { id: "notification-toast" });
      }
    } catch {
      toast.error("Hiba történt az értesítések engedélyezésekor.", { id: "notification-toast" });
    }
  };

  const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const isAdmin = (session?.user as any)?.role === "ADMIN" && !IS_DEMO;
  const userFamilyName = (session?.user as any)?.familyName;
  const firstName = (session?.user as any)?.name?.split(' ')[0] || "Szakács";

  const needsFamilyCreation = isAdmin && !userFamilyName;

  const togglePreference = (pref: string) => {
    setPreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const handleFamilyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFamilyName(value);
    const length = value.length;
    const trackValue = Math.min((length / 30) * 100, 100);
    setEyeTrack(trackValue);
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await createInvite({ maxUses: 20, expiresInDays: 30, familyName: familyName.trim() });
      if (res.error) {
        toast.error(res.error);
      } else if (res.inviteToken) {
        const link = `${window.location.origin}/register?token=${res.inviteToken}`;
        setInviteLink(link);
        toast.success("Meghívó link sikeresen elkészült!");
      }
    } catch {
      toast.error("Hiba történt a link generálása közben.");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      toast.success("Link másolva a vágólapra!", { id: "copy-link" });
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Nem sikerült másolni a linket.", { id: "copy-error" });
    }
  };

  const progressPercent = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  // Mascot scale intro animation and step transitions
  const isInitial = useRef(true);
  const previousStep = useRef(1);

  useGSAP(() => {
    if (!containerRef.current) return;

    const screens = [".onboard-step-1", ".onboard-step-2", ".onboard-step-3", ".onboard-step-4"];
    const currentIndex = step - 1;

    // Scale mascot container to 0.55 on mount (no floating animation)
    if (isInitial.current) {
      isInitial.current = false;
      gsap.fromTo(".mascot-container",
        { scale: 0, opacity: 0 },
        { scale: 0.55, opacity: 1, duration: 0.6, ease: "back.out(1.5)" }
      );

      screens.forEach((screen, index) => {
        if (index === currentIndex) {
          gsap.set(screen, { x: 0, autoAlpha: 1 });
        } else {
          gsap.set(screen, { x: 100, autoAlpha: 0 });
        }
      });
      previousStep.current = step;
      return;
    }

    const tl = gsap.timeline();
    const goingForward = step > previousStep.current;
    previousStep.current = step;

    // Dynamic scale calculation based on remaining screen height
    // Subtracting 540px guarantees space for the top content plus a nice gap above the character
    const availableHeight = window.innerHeight - 540;
    const dynamicScale = Math.min(0.75, Math.max(0.35, availableHeight / 490));
    const targetScale = step === 1
      ? 0.55
      : step === 2
        ? Math.min(0.55, Math.max(0.25, (window.innerHeight - 580) / 490))
        : dynamicScale;

    gsap.to(".mascot-container", {
      scale: targetScale,
      duration: 0.45,
      ease: "power3.out"
    });

    screens.forEach((screen, index) => {
      if (index !== currentIndex) {
        const dir = index < currentIndex ? -50 : 50;
        tl.to(screen, {
          x: dir,
          autoAlpha: 0,
          duration: 0.35,
          ease: "power3.inOut"
        }, 0);
      }
    });

    const fromDir = goingForward ? 50 : -50;
    tl.fromTo(screens[currentIndex],
      { x: fromDir, autoAlpha: 0 },
      {
        x: 0,
        autoAlpha: 1,
        duration: 0.35,
        ease: "power3.inOut",
        clearProps: "transform"
      },
      "-=0.25"
    );

  }, { scope: containerRef, dependencies: [step] });

  const finishOnboarding = async () => {
    if (needsFamilyCreation && !familyName.trim()) {
      toast.error("Kérlek add meg a család nevét!", { id: "validation-error" });
      return;
    }

    setLoading(true);

    // Play success sound
    playSound("registrationSuccess");

    // Show Confetti
    setShowConfetti(true);

    // Create a 2.5s delay promise to let the confetti play
    const delayPromise = new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      // Start completeOnboarding API request in parallel
      const resPromise = completeOnboarding({
        familyName: needsFamilyCreation ? familyName.trim() : undefined,
        avatar,
        preferences,
      });

      // Wait for both the minimum timer and the API request to complete
      const [res] = await Promise.all([resPromise, delayPromise]);

      if (res?.error) {
        toast.error(res.error);
        setLoading(false);
        setShowConfetti(false);
        return;
      }

      // Update session after the wait to prevent premature middleware redirects
      await updateSession({ onboardingComplete: true });

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          opacity: 0,
          scale: 0.95,
          y: 20,
          duration: 0.8,
          ease: "power3.inOut",
          onComplete: () => {
            window.location.href = "/";
          }
        });
      } else {
        window.location.href = "/";
      }

    } catch (err: any) {
      console.error("ONBOARDING ERROR:", err);
      toast.error(`Hiba történt: ${err.message || 'Ismeretlen hiba'}`, { duration: 5000 });
      setLoading(false);
      setShowConfetti(false);
    }
  };

  return (
    <main ref={containerRef} className="relative w-full h-[100dvh] overflow-hidden select-none flex flex-col justify-between">
      <style>{`
        .face-button img {
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .face-button:hover img {
          transform: scale(1.15) translateY(-4px) rotate(4deg);
        }
      `}</style>

      <div className="absolute bottom-0 left-0 w-full flex justify-center z-10">
        <div className="mascot-container relative w-[520px] h-[490px] origin-bottom transform-gpu flex-shrink-0">
          {step === 1 ? (
            <Mascot isFocus={isFocus} isPassword={false} eyeTrack={eyeTrack} />
          ) : (
            <img
              src={AVATARS.find((a) => a.id === avatar)?.charPath || `/Avatar/Active characters/Character-${avatar}.svg`}
              alt="Mascot"
              className="w-full h-full object-contain mascot-svg-img"
            />
          )}
        </div>
      </div>

      <div className="onboard-step-1 absolute inset-0 w-full h-full flex flex-col items-center justify-center px-6 z-20 invisible overflow-hidden">
        <header className="absolute top-8 left-6 right-6 flex items-center gap-4 z-30">
          <Button3D type="secondary" iconOnly rounded="full" disabled><ArrowLeft size={22} /></Button3D>
          <div className="flex-1 h-5 bg-bg-elevated rounded-full border-2 border-border-default shadow-[inset_0_2px_3px_rgba(0,0,0,0.08)] relative overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#60A5FA] to-[#007bff] rounded-full transition-all duration-500 ease-out relative" style={{ width: `${progressPercent}%` }}><div className="absolute inset-x-0 top-[1px] h-[35%] bg-white/30 rounded-full" /></div>
          </div>
        </header>

        <div className="relative z-20 w-full max-w-sm flex flex-col justify-center">
          {needsFamilyCreation ? (
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex flex-col items-center text-center">
                <h1
                  className="text-[clamp(1.5rem,6vw,2.5rem)] font-black text-text-primary tracking-tight leading-tight"
                  style={{ marginBottom: "clamp(2rem, 8vw, 3.5rem)" }}
                >
                  Szia, {firstName}!<br />
                  Üdvözlünk a <AnimatedUnderline isActive={true} underlineColor="#007BFF">családi receptkönyvben!</AnimatedUnderline> 🍳
                </h1>
                <p className="text-text-secondary text-sm font-medium">
                  Hozzunk létre egy új családi profil, ahol összegyűjthetjük a legjobb scoopet!
                </p>
              </div>
              <div className="relative flex items-center bg-[#FAF7F6] border-2 border-[#E5E2E1] rounded-full px-5 h-12 shadow-[0_4px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group mb-6">
                <input
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-base cursor-pointer text-center"
                  placeholder="Pl. Mézgacsalád"
                  value={familyName}
                  onFocus={() => setIsFocus(true)}
                  onBlur={() => setIsFocus(false)}
                  onChange={handleFamilyNameChange}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex flex-col items-center text-center">
                <h1
                  className="text-[clamp(1.5rem,6vw,2.5rem)] font-black text-text-primary tracking-tight leading-tight"
                  style={{ marginBottom: "clamp(2rem, 8vw, 3.5rem)" }}
                >
                  Szia, {firstName}!<br />
                  Üdvözlünk a {userFamilyName ? `${userFamilyName} ` : "családi "}<AnimatedUnderline isActive={true} underlineColor="#007BFF">receptkönyvben!</AnimatedUnderline> 🍳
                </h1>
                <p className="text-text-secondary text-sm font-medium">
                  Csatlakozz a családodhoz a saját profiloddal.
                </p>
              </div>
            </div>
          )}

          {/* Next Button */}
          <div className="w-full mb-4 mt-2">
            <Button3D
              className="w-full cursor-pointer"
              type="primary"
              fullWidth
              rounded="full"
              size="xl"
              disabled={needsFamilyCreation && !familyName.trim()}
              onPress={() => setStep(2)}
            >
              Tovább
            </Button3D>
          </div>
        </div>
      </div>

      {/* Step 2: Avatar Selection */}
      <div className="onboard-step-2 absolute inset-0 w-full h-full flex flex-col items-center justify-start pt-[clamp(4rem,10dvh,6rem)] px-6 z-20 invisible overflow-hidden">
        {/* Header */}
        <header className="absolute top-8 left-6 right-6 flex items-center gap-4 z-30">
          <Button3D
            type="secondary"
            iconOnly
            rounded="full"
            onPress={() => {
              playSound("swipe")
              setStep(1)
            }}
            className="cursor-pointer"
          >
            <ArrowLeft size={22} />
          </Button3D>

          <div className="flex-1 h-5 bg-bg-elevated rounded-full border-2 border-border-default shadow-[inset_0_2px_3px_rgba(0,0,0,0.08)] relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#60A5FA] to-[#007bff] rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-x-0 top-[1px] h-[35%] bg-white/30 rounded-full" />
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="relative z-20 w-full max-w-sm flex flex-col justify-center">
          <div className="flex flex-col gap-[clamp(6px,1.2vh,16px)] mb-[clamp(6px,1.5vh,20px)]">
            <div className="flex flex-col items-center text-center mb-0">
              <h1 className="text-2xl font-black text-text-primary mb-1 tracking-tight leading-snug">Válassz avatart!</h1>
              <p className="text-text-secondary text-sm font-medium">Ez jelenik meg a receptjeid mellett.</p>
            </div>

            {/* Grid of Faces */}
            <div className="grid grid-cols-3 gap-[clamp(4px,1vh,10px)] max-w-[clamp(170px,26vh,260px)] mx-auto w-full px-2 mt-[clamp(4px,1vh,8px)]">
              {AVATARS.map((av) => {
                const isSelected = avatar === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => {
                      setAvatar(av.id);
                      // Buzz/wiggle animation reaction on the mascot
                      gsap.fromTo(".mascot-svg-img",
                        { scale: 0.9, rotate: -6 },
                        { scale: 1, rotate: 0, duration: 0.4, ease: "elastic.out(1.2, 0.4)" }
                      );
                    }}
                    className={`face-button relative aspect-square rounded-2xl flex items-center justify-center p-[clamp(5px,1vh,12px)] transition-all duration-200 cursor-pointer border-2
                      ${isSelected
                        ? 'border-[#007BFF] shadow-[0_4px_0_#0056b3] bg-white translate-y-[-2px]'
                        : 'border-[#E5E2E1] shadow-[0_4px_0_#E5E2E1] bg-[#FAF7F6] hover:bg-white'}`}
                  >
                    <img
                      src={av.path}
                      alt={av.name}
                      className={`object-contain pointer-events-none transition-all duration-200 ${
                        av.id.includes("-female") ? "w-[92%] h-[92%]" : "w-[80%] h-[80%]"
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Next Button */}
          <div className="w-full mb-4 mt-2">
            <Button3D
              className="w-full cursor-pointer"
              type="primary"
              fullWidth
              rounded="full"
              size="xl"
              onPress={() => setStep(3)}
            >
              Tovább
            </Button3D>
          </div>
        </div>
      </div>

      {/* Step 3: Preferences */}
      <div className="onboard-step-3 absolute inset-0 w-full h-full flex flex-col items-center justify-start pt-[clamp(4rem,10dvh,6rem)] px-6 z-20 invisible overflow-hidden">
        {/* Header */}
        <header className="absolute top-8 left-6 right-6 flex items-center gap-4 z-30">
          <Button3D
            type="secondary"
            iconOnly
            rounded="full"
            onPress={() => {
              playSound("swipe")
              setStep(2)
            }}
            className="cursor-pointer"
          >
            <ArrowLeft size={22} />
          </Button3D>

          <div className="flex-1 h-5 bg-bg-elevated rounded-full border-2 border-border-default shadow-[inset_0_2px_3px_rgba(0,0,0,0.08)] relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#60A5FA] to-[#007bff] rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-x-0 top-[1px] h-[35%] bg-white/30 rounded-full" />
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="relative z-20 w-full max-w-sm flex flex-col justify-center">
          {isAdmin ? (
            <div className="flex flex-col gap-[clamp(8px,2vh,24px)] mb-4">
              <div className="flex flex-col items-center text-center mb-0">
                <h1 className="text-[clamp(1.5rem,6vw,2.5rem)] font-black text-text-primary mb-2 tracking-tight leading-tight">Hívd meg a <AnimatedUnderline isActive={true} underlineColor="#007BFF">többieket!</AnimatedUnderline></h1>
                <p className="text-text-secondary text-sm font-medium">A konyha csak meghívóval látogatható.</p>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border-2 border-[#E5E2E1] shadow-[0_4px_0_#E5E2E1] mb-2 text-center min-h-[140px]">
                {!inviteLink ? (
                  <Button3D
                    type="secondary"
                    fullWidth
                    rounded="full"
                    onPress={handleGenerateInvite}
                    disabled={generatingInvite}
                  >
                    {generatingInvite ? "Generálás..." : "Link generálása 🔗"}
                  </Button3D>
                ) : (
                  <div className="flex flex-col items-center w-full gap-4 pt-2">
                    <p className="text-text-secondary text-sm font-medium">Küldd el ezt a linket a családtagoknak:</p>
                    <div className="relative flex items-center bg-[#FAF7F6] border-2 border-[#E5E2E1] rounded-full pl-5 pr-2 h-14 w-full shadow-[0_4px_0_#E5E2E1] transition-all duration-200 hover:border-[#007BFF]/40 mb-1">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="bg-transparent border-none outline-none flex-1 text-text-primary text-sm font-bold truncate pr-3"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <div className="shrink-0 mb-1">
                        <Button3D
                          type={isCopied ? "secondary" : "primary"}
                          iconOnly
                          rounded="full"
                          onPress={copyToClipboard}
                        >
                          <div className="relative w-5 h-5 flex items-center justify-center">
                            <Check
                              size={20}
                              className={`absolute text-[#007BFF] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isCopied ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'}`}
                            />
                            <Copy
                              size={20}
                              className={`absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${!isCopied ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`}
                            />
                          </div>
                        </Button3D>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[clamp(8px,2vh,24px)] mb-4">
              <div className="flex flex-col items-center text-center mb-0">
                <h1 className="text-2xl font-black text-text-primary mb-1 tracking-tight leading-snug">Mik a kedvenceid?</h1>
                <p className="text-text-secondary text-sm font-medium">Testreszabjuk neked a receptkönyvet.</p>
              </div>
              <div className="flex flex-wrap justify-stretch gap-2">
                {[
                  { id: 'breakfast', label: 'Reggeli', icon: <Coffee size={16} /> },
                  { id: 'soups', label: 'Levesek', icon: <Soup size={16} /> },
                  { id: 'mains', label: 'Főételek', icon: <ChefHat size={16} /> },
                  { id: 'pasta', label: 'Tészták', icon: <Flame size={16} /> },
                  { id: 'onepot', label: 'Egytálételek', icon: <Utensils size={16} /> },
                  { id: 'desserts', label: 'Desszertek', icon: <CakeSlice size={16} /> },
                  { id: 'salads', label: 'Saláták', icon: <Salad size={16} /> },
                  { id: 'baking', label: 'Sütés', icon: <Egg size={16} /> },
                  { id: 'poultry', label: 'Szárnyasok', icon: <Drumstick size={16} /> },
                  { id: 'pork_beef', label: 'Sertés & Marha', icon: <Drumstick size={16} /> },
                  { id: 'vegetarian', label: 'Vegetáriánus', icon: <Leaf size={16} /> },
                  { id: 'quick', label: 'Gyors', icon: <Clock size={16} /> },
                  { id: 'healthy', label: 'Egészséges', icon: <Apple size={16} /> },
                ].map(pref => {
                  const isSelected = preferences.includes(pref.id);
                  return (
                    <button
                      key={pref.id}
                      onClick={() => togglePreference(pref.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 transition-all duration-200 cursor-pointer font-bold text-[13px] select-none
                        ${isSelected
                          ? 'border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px]'
                          : 'border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] hover:text-text-primary'}`}
                    >
                      {pref.icon}
                      {pref.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Finish Button */}
          <div className="w-full mb-4 mt-2">
            <Button3D
              className="w-full cursor-pointer"
              type="primary"
              fullWidth
              rounded="full"
              size="xl"
              onPress={() => setStep(4)}
            >
              Tovább
            </Button3D>
          </div>
        </div>
      </div>

      {/* Step 4: Notifications & Homescreen */}
      <div className="onboard-step-4 absolute inset-0 w-full h-full flex flex-col items-center justify-start pt-[clamp(4rem,10dvh,6rem)] px-6 z-20 invisible overflow-hidden">
        {/* Header */}
        <header className="absolute top-8 left-6 right-6 flex items-center gap-4 z-30">
          <Button3D
            type="secondary"
            iconOnly
            rounded="full"
            onPress={() => {
              playSound("swipe")
              setStep(3)
            }}
            className="cursor-pointer"
          >
            <ArrowLeft size={22} />
          </Button3D>

          <div className="flex-1 h-5 bg-bg-elevated rounded-full border-2 border-border-default shadow-[inset_0_2px_3px_rgba(0,0,0,0.08)] relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#60A5FA] to-[#007bff] rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-x-0 top-[1px] h-[35%] bg-white/30 rounded-full" />
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="relative z-20 w-full max-w-sm flex flex-col justify-center">
          <div className="flex flex-col gap-[clamp(8px,2vh,24px)] mb-4">
            <div className="flex flex-col items-center text-center mb-0">
              <h1 className="text-2xl font-black text-text-primary mb-1 tracking-tight leading-snug">Még egy utolsó dolog</h1>
              <p className="text-text-secondary text-sm font-medium">Hogy semmiről se maradj le a konyhában.</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-[#E5E2E1] shadow-[0_4px_0_#E5E2E1]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white border-2 border-border-default shadow-[0_3px_0_#E5E2E1] flex items-center justify-center text-accent-primary">
                    <Bell size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-text-primary text-[15px]">Értesítések</span>
                    <span className="text-text-tertiary text-[13px]">Új scoop & meghívók</span>
                  </div>
                </div>
                <Button3D
                  type="primary"
                  size="sm"
                  rounded="full"
                  className="px-4 font-bold text-[12px] h-9"
                  onPress={handleNotificationClick}
                >
                  Bekapcsol
                </Button3D>
              </div>

              {/* Sound Settings Row */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-[#E5E2E1] shadow-[0_4px_0_#E5E2E1]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white border-2 border-border-default shadow-[0_3px_0_#E5E2E1] flex items-center justify-center text-accent-primary">
                    <Volume2 size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-text-primary text-[15px]">Hanghatások</span>
                    <span className="text-text-tertiary text-[13px]">Effectek & visszajelzések</span>
                  </div>
                </div>
                <Button3D
                  type={soundEnabled ? "primary" : "secondary"}
                  size="sm"
                  rounded="full"
                  className="px-4 font-bold text-[12px] h-9"
                  onPress={handleSoundToggle}
                  containerProps={{
                    "data-sound": "off",
                    style: soundEnabled ? undefined : {
                      "--button-secondary-color": "#ffffff",
                      "--button-secondary-color-dark": "#E5E2E1",
                      "--button-secondary-color-hover": "#FCF9F8",
                      "--button-secondary-color-light": "#1C1B1B",
                    }
                  } as any}
                >
                  {soundEnabled ? "Bekapcsolva" : "Kikapcsolva"}
                </Button3D>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-[#E5E2E1] shadow-[0_4px_0_#E5E2E1]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white border-2 border-border-default shadow-[0_3px_0_#E5E2E1] flex items-center justify-center text-accent-primary">
                    <Download size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-text-primary text-[15px]">Mentés appként</span>
                    <span className="text-text-tertiary text-[13px]">Gyorsabb elérés</span>
                  </div>
                </div>
                <Button3D
                  type="primary"
                  size="sm"
                  rounded="full"
                  className="px-4 font-bold text-[12px] h-9"
                  onPress={handleInstallClick}
                >
                  Hozzáadás
                </Button3D>
              </div>
            </div>
          </div>

          {/* Finish Button with anchored Lottie Confetti */}
          <div className="relative w-full mb-4 mt-6">
            {showConfetti && (
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 w-[480px] h-[480px] overflow-visible">
                <DotLottieReact
                  src="/Rive/Flex Confetti.lottie"
                  autoplay
                  loop={false}
                  className="w-full h-full"
                />
              </div>
            )}
            <Button3D
              className="w-full cursor-pointer"
              type="primary"
              fullWidth
              rounded="full"
              size="xl"
              disabled={loading}
              onPress={finishOnboarding}
              containerProps={{ "data-sound": "off" } as any}
            >
              {loading ? "Készülődünk... 🥣" : "Kész! Irány a konyha 🥣"}
            </Button3D>
          </div>
        </div>
      </div>
    </main>
  );
}
