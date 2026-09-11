import React, { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";

export interface CurtainOpeningProps {
  /** Callback fired after curtains are fully open */
  onOpen?: () => void;
  /** localStorage key; if set, curtain only shows once per device */
  showOnceKey?: string;
  /** z-index of the curtain overlay */
  zIndex?: number;
  /** Curtain color (default red) */
  curtainColor?: string;
}

/**
 * Theatrical red curtain opening animation.
 * Press Enter or click anywhere to open the curtains and reveal the login page.
 */
export const CurtainOpening: React.FC<CurtainOpeningProps> = ({
  onOpen,
  showOnceKey,
  zIndex = 50,
  curtainColor = "#660000",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const [showWelcomeContent, setShowWelcomeContent] = useState(true);

  const triggerConfettiSideCannons = useCallback(() => {
    if (typeof window === "undefined") return;

    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;

      const base = {
        spread: 55,
        startVelocity: 60,
        // Render above the curtain overlay (which uses zIndex)
        zIndex: zIndex + 1,
        colors,
      } as const;

      confetti({
        ...base,
        particleCount: 2,
        angle: 60,
        origin: { x: 0, y: 0.5 },
      });

      confetti({
        ...base,
        particleCount: 2,
        angle: 120,
        origin: { x: 1, y: 0.5 },
      });

      requestAnimationFrame(frame);
    };

    frame();
  }, [zIndex]);

  const triggerCountdownConfetti = useCallback(() => {
    if (typeof window === "undefined") return;

    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      zIndex: 200,
      colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
    } as const;

    const shoot = () => {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
      });

      confetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
      });
    };

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
  }, []);

  const triggerFireworksConfetti = useCallback(() => {
    if (typeof window === "undefined") return;

    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      // Render behind the curtain overlay (which uses zIndex)
      zIndex: Math.max(0, zIndex - 1),
    };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return window.clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, [zIndex]);

  // Inject keyframe CSS once
  useEffect(() => {
    const id = "curtain-opening-keyframes";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes curtain-brightness {
        from { filter: brightness(180%); }
        to { filter: brightness(100%); }
      }

      @keyframes left-curtain-open {
        from { transform: translateX(0) rotate(0deg) scaleX(1) scaleY(1); }
        to { transform: translateX(-100%) rotate(20deg) scaleX(0) scaleY(2); }
      }

      @keyframes right-curtain-open {
        from { transform: translateX(0) rotate(0deg) scaleX(1) scaleY(1); }
        to { transform: translateX(100%) rotate(-20deg) scaleX(0) scaleY(2); }
      }

      @keyframes curtain-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      @keyframes starter-fade {
        from { opacity: 1; color: #333; }
        to { opacity: 0; color: #fff; }
      }

      @keyframes welcome-slide-up {
        0% { transform: translateY(20%); opacity: 1; }
        100% { transform: translateY(-80%); opacity: 0; }
      }

      @keyframes overlay-slide-up {
        0% { transform: translateY(0%); opacity: 1; }
        100% { transform: translateY(-120%); opacity: 0; }
      }

      @keyframes countdown-pulse {
        0% {
          transform: scale(0.6);
          opacity: 0;
          text-shadow: 0 0 0 rgba(0,0,0,0.0);
        }
        35% {
          transform: scale(1.05);
          opacity: 1;
          text-shadow: 0 0 20px rgba(0,0,0,0.9), 0 0 35px rgba(249,115,22,0.9);
        }
        100% {
          transform: scale(1.6);
          opacity: 0;
          text-shadow: 0 0 40px rgba(0,0,0,1), 0 0 65px rgba(249,115,22,1);
        }
      }

      @keyframes countdown-burst {
        0% {
          transform: scale(0.3);
          opacity: 0.4;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1.8);
          opacity: 0;
        }
      }

      .launch-button {
        --primary: #d85d27;
        --neutral-1: #1f1f1f;
        --neutral-2: #141414;
        --radius: 999px;
        cursor: pointer;
        border-radius: var(--radius);
        border: none;
        box-shadow: 0 0.5px 0.5px 1px rgba(0,0,0,0.4), 0 14px 28px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.3s ease;
        min-width: 290px;
        padding: 26px 46px;
        height: 88px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 22px;
        font-weight: 600;
        color: #ffffff;
        background: radial-gradient(circle at top, #3b0f0f, var(--neutral-1));
      }

      .launch-button:hover {
        transform: scale(1.03);
        box-shadow: 0 0 1px 2px rgba(255,255,255,0.18), 0 18px 36px rgba(0,0,0,0.7);
      }

      .launch-button:active {
        transform: scale(0.99);
        box-shadow: 0 0 1px 1px rgba(255,255,255,0.16), 0 10px 20px rgba(0,0,0,0.5);
      }

      .launch-button::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: var(--radius);
        border: 2px solid transparent;
        background:
          linear-gradient(var(--neutral-1), var(--neutral-2)) padding-box,
          linear-gradient(180deg, rgba(255,255,255,0.15), rgba(0,0,0,0.6)) border-box;
        z-index: 0;
        transition: all 0.4s ease;
      }

      .launch-button:hover::after {
        transform: scale(1.03, 1.08);
      }

      .launch-button::before {
        content: "";
        inset: 7px 8px 8px 8px;
        position: absolute;
        background: radial-gradient(circle at top, rgba(255,255,255,0.1), transparent 55%), linear-gradient(to top, var(--neutral-1), var(--neutral-2));
        border-radius: 999px;
        filter: blur(0.4px);
        z-index: 1;
      }

      .launch-outline {
        position: absolute;
        border-radius: inherit;
        overflow: hidden;
        z-index: 1;
        opacity: 0.6;
        transition: opacity 0.4s ease;
        inset: -2px -3.5px;
      }

      .launch-outline::before {
        content: "";
        position: absolute;
        inset: -100%;
        background: conic-gradient(from 180deg, transparent 55%, rgba(255,255,255,0.35) 75%, transparent 95%);
        animation: launch-spin 2.2s linear infinite;
        animation-play-state: running;
      }

      @keyframes launch-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .launch-button:hover .launch-outline {
        opacity: 1;
      }

      .launch-state {
        padding-left: 32px;
        z-index: 2;
        display: flex;
        position: relative;
        align-items: center;
        gap: 8px;
      }

      .launch-state p {
        display: flex;
        align-items: center;
        justify-content: center;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .launch-state .launch-icon {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        margin: auto;
        transform: scale(1.5);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      }

      .launch-state .launch-icon svg {
        overflow: visible;
      }

      .launch-state p span {
        display: block;
        opacity: 0;
        animation: launch-slide-down 0.8s ease forwards calc(var(--i) * 0.035s);
      }

      .launch-button:hover .launch-state p span {
        opacity: 1;
        animation: launch-wave 0.55s ease forwards calc(var(--i) * 0.025s);
      }

      @keyframes launch-wave {
        30% { opacity: 1; transform: translateY(4px); }
        55% { opacity: 1; transform: translateY(-3px); color: var(--primary); }
        100% { opacity: 1; transform: translateY(0); }
      }

      @keyframes launch-slide-down {
        0% {
          opacity: 0;
          transform: translateY(-18px) translateX(5px) rotate(-90deg);
          color: var(--primary);
          filter: blur(4px);
        }
        30% {
          opacity: 1;
          transform: translateY(4px) translateX(0) rotate(0);
          filter: blur(0);
        }
        55% {
          opacity: 1;
          transform: translateY(-3px) translateX(0) rotate(0);
        }
        100% {
          opacity: 1;
          transform: translateY(0) translateX(0) rotate(0);
        }
      }

      .launch-state .launch-icon::before {
        content: "";
        position: absolute;
        top: 50%;
        height: 2px;
        width: 0;
        left: -6px;
        background: linear-gradient(to right, transparent, rgba(255,255,255,0.7));
        opacity: 0;
      }

      .launch-button:active .launch-state .launch-icon::before,
      .launch-button:focus-visible .launch-state .launch-icon::before {
        animation: launch-contrail 0.8s linear forwards;
      }

      @keyframes launch-contrail {
        0% { width: 0; opacity: 1; }
        12% { width: 18px; }
        60% { opacity: 0.8; width: 90px; }
        100% { opacity: 0; width: 170px; }
      }

      .launch-button:active .launch-state .launch-icon svg,
      .launch-button:focus-visible .launch-state .launch-icon svg {
        animation: launch-takeoff 0.8s linear forwards;
      }

      @keyframes launch-takeoff {
        0% { opacity: 1; }
        60% { opacity: 1; transform: translateX(70px) rotate(90deg) scale(2.1); }
        100% { opacity: 0; transform: translateX(160px) rotate(90deg) scale(0); }
      }

      .launch-state .launch-icon svg {
        animation: launch-land 0.6s ease forwards;
      }

      @keyframes launch-land {
        0% {
          transform: translateX(-60px) translateY(26px) rotate(-50deg) scale(2.1);
          opacity: 0;
          filter: blur(3px);
        }
        100% {
          transform: translateX(0) translateY(0) rotate(0);
          opacity: 1;
          filter: blur(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        @keyframes left-curtain-open { from { opacity: 1; } to { opacity: 0; } }
        @keyframes right-curtain-open { from { opacity: 1; } to { opacity: 0; } }
        @keyframes curtain-brightness { from, to { filter: none; } }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Skip if already shown
  useEffect(() => {
    if (!showOnceKey || typeof window === "undefined") return;
    if (window.localStorage.getItem(showOnceKey)) {
      setVisible(false);
      setIsOpen(true);
    }
  }, [showOnceKey]);

  const openCurtains = useCallback(() => {
    if (isOpen) return;
    setIsOpen(true);
    triggerConfettiSideCannons();
    // Start fireworks while curtains are opening, behind the curtain overlay
    triggerFireworksConfetti();

    if (showOnceKey && typeof window !== "undefined") {
      window.localStorage.setItem(showOnceKey, "1");
    }

    // Hide overlay after curtain animation completes (~4s)
    setTimeout(() => {
      setVisible(false);
      if (onOpen) onOpen();
    }, 4000);
  }, [isOpen, onOpen, showOnceKey, triggerConfettiSideCannons, triggerFireworksConfetti]);

  // Handle Launch button / Enter: play welcome slide-up, then 5-1 countdown with gold confetti bursts, then slide overlay and open curtains
  const handleLaunch = useCallback(() => {
    if (hasLaunched || isOpen) return;
    setHasLaunched(true);

    // After welcome text/logo slide up (~0.9s), hide them and start countdown + confetti burst
    setTimeout(() => {
      setShowWelcomeContent(false);
      setCountdown(5);
      triggerCountdownConfetti();
    }, 900);

    setTimeout(() => {
      setCountdown(4);
      triggerCountdownConfetti();
    }, 2300);

    // Mid-countdown burst at "3"
    setTimeout(() => {
      setCountdown(3);
      triggerCountdownConfetti();
    }, 3700);

    setTimeout(() => {
      setCountdown(2);
      triggerCountdownConfetti();
    }, 5100);

    setTimeout(() => {
      setCountdown(1);
      triggerCountdownConfetti();
    }, 6500);

    // Finish countdown, then slide the blurred overlay up
    setTimeout(() => {
      setCountdown(null);
      setOverlayExiting(true);
    }, 7900);

    // After overlay slides away (~0.8s), start opening curtains
    setTimeout(() => {
      openCurtains();
    }, 8700);
  }, [hasLaunched, isOpen, openCurtains, triggerCountdownConfetti]);

  // Listen for Enter key to trigger the same as clicking Launch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        handleLaunch();
      }
    };

    if (visible && !isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, isOpen, handleLaunch]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${isOpen ? "bg-black/30" : "bg-black/60"}`}
      style={{ zIndex, cursor: isOpen ? "default" : "pointer" }}
    >
      {/* Curtain container */}
      <div className="absolute inset-0">
        {/* Left curtain */}
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: "50%",
            transformOrigin: "top right",
            filter: isOpen ? "brightness(100%)" : "brightness(180%)",
            animation: isOpen
              ? "curtain-brightness 2s ease-in-out forwards, left-curtain-open 4s ease-in-out forwards"
              : undefined,
          }}
        >
          <CurtainPanel color={curtainColor} side="left" />
        </div>

        {/* Right curtain */}
        <div
          className="absolute top-0 right-0 h-full"
          style={{
            width: "50%",
            transformOrigin: "top left",
            filter: isOpen ? "brightness(100%)" : "brightness(180%)",
            animation: isOpen
              ? "curtain-brightness 2s ease-in-out forwards, right-curtain-open 4s ease-in-out forwards"
              : undefined,
          }}
        >
          <CurtainPanel color={curtainColor} side="right" />
        </div>
      </div>

      {/* Full-screen blurred welcome overlay above curtains */}
      {!isOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="w-full h-full bg-black/70 backdrop-blur-xl relative"
            style={{
              animation: overlayExiting ? "overlay-slide-up 0.8s ease-in forwards" : undefined,
            }}
          >
            {/* Welcome text + logo + button that move up first */}
            {showWelcomeContent && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="flex flex-col items-center justify-center text-center space-y-8"
                  style={{
                    animation: hasLaunched ? "welcome-slide-up 0.9s ease-in forwards" : undefined,
                  }}
                >
                  <div className="text-white text-4xl md:text-5xl font-semibold tracking-wide">
                    Welcome to
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={`${import.meta.env.BASE_URL}EKAMLogo.png`}
                      alt="Ekam Logo"
                      className="h-28 md:h-36 object-contain"
                    />
                  </div>
                  {!hasLaunched && (
                    <button
                      type="button"
                      onClick={handleLaunch}
                      className="mt-6 launch-button"
                    >
                      <div className="launch-outline" />
                      <div className="launch-state">
                        <div className="launch-icon">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            width="1em"
                            height="1em"
                          >
                            <g style={{ filter: "url(#launch-shadow)" }}>
                              <path
                                d="M5 13c0-5.088 2.903-9.436 7-11.182C16.097 3.564 19 7.912 19 13c0 .823-.076 1.626-.22 2.403l1.94 1.832a.5.5 0 0 1 .095.603l-2.495 4.575a.5.5 0 0 1-.793.114l-2.234-2.234a1 1 0 0 0-.707-.293H9.414a1 1 0 0 0-.707.293l-2.234 2.234a.5.5 0 0 1-.793-.114l-2.495-4.575a.5.5 0 0 1 .095-.603l1.94-1.832C5.077 14.626 5 13.823 5 13zm1.476 6.696l.817-.817A3 3 0 0 1 9.414 18h5.172a3 3 0 0 1 2.121.879l.817.817.982-1.8-1.1-1.04a2 2 0 0 1-.593-1.82c.124-.664.187-1.345.187-2.036 0-3.87-1.995-7.3-5-8.96C8.995 5.7 7 9.13 7 13c0 .691.063 1.372.187 2.037a2 2 0 0 1-.593 1.82l-1.1 1.039.982 1.8zM12 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
                                fill="currentColor"
                              />
                            </g>
                            <defs>
                              <filter id="launch-shadow">
                                <feDropShadow floodOpacity="0.5" stdDeviation="0.6" dy={1} dx={0} />
                              </filter>
                            </defs>
                          </svg>
                        </div>
                        <p>
                          <span style={{ "--i": 0 } as React.CSSProperties}>L</span>
                          <span style={{ "--i": 1 } as React.CSSProperties}>a</span>
                          <span style={{ "--i": 2 } as React.CSSProperties}>u</span>
                          <span style={{ "--i": 3 } as React.CSSProperties}>n</span>
                          <span style={{ "--i": 4 } as React.CSSProperties}>c</span>
                          <span style={{ "--i": 5 } as React.CSSProperties}>h</span>
                        </p>
                      </div>
                    </button>
                  )}
                  {/* Copyright text on launch page */}
                  <div className="mt-10 text-center">
                    <p className="text-white/80 text-lg md:text-xl font-medium">
                      © 2025 Ekam Global Network Pvt. Ltd. All rights reserved.
                    </p>
                    <p className="text-white text-base md:text-lg mt-1 font-semibold">
                      Developed by Rovixai India Pvt. Ltd.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Centered countdown shown after welcome content moves away */}
            {countdown !== null && (
              <>
                <div
                  key={countdown}
                  className="absolute inset-0 flex items-center justify-center z-20"
                >
                  <div className="relative flex items-center justify-center">
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: "11rem",
                        height: "11rem",
                        maxWidth: "16rem",
                        maxHeight: "16rem",
                        background:
                          "radial-gradient(circle at center, rgba(249,115,22,0.95) 0%, rgba(249,115,22,0.35) 35%, transparent 70%)",
                        boxShadow:
                          "0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(249,115,22,0.9)",
                        animation: "countdown-burst 1.2s ease-out forwards",
                      }}
                    />
                    <div
                      className="relative font-extrabold"
                      style={{
                        fontSize: "4rem",
                        color: "#ffb15c",
                        textShadow:
                          "0 0 16px rgba(0,0,0,0.9), 0 0 32px rgba(249,115,22,0.9)",
                        animation: "countdown-pulse 1.2s ease-out forwards",
                      }}
                    >
                      {countdown}
                    </div>
                  </div>
                </div>
                {/* Company footer also visible during countdown, behind the animation */}
                <div className="absolute inset-x-0 bottom-16 text-center z-10">
                  <p className="text-white/80 text-lg md:text-xl font-medium">
                    © 2025 Ekam Global Network Pvt. Ltd. All rights reserved.
                  </p>
                  <p className="text-white text-base md:text-lg mt-1 font-semibold">
                    Developed by Rovixai India Pvt. Ltd.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Curtain Panel SVG
   - Realistic draped curtain with folds and shadows
───────────────────────────────────────────────────────────────────────────── */

interface CurtainPanelProps {
  color: string;
  side: "left" | "right";
}

const CurtainPanel: React.FC<CurtainPanelProps> = ({ color, side }) => {
  const uniqueId = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 100 200"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        {/* Main curtain gradient with folds */}
        <linearGradient
          id={`curtain-main-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor={adjustBrightness(color, side === "left" ? 0.6 : 1.2)} />
          <stop offset="15%" stopColor={adjustBrightness(color, side === "left" ? 1.0 : 0.8)} />
          <stop offset="30%" stopColor={adjustBrightness(color, 0.7)} />
          <stop offset="45%" stopColor={adjustBrightness(color, 1.1)} />
          <stop offset="60%" stopColor={adjustBrightness(color, 0.75)} />
          <stop offset="75%" stopColor={adjustBrightness(color, 1.0)} />
          <stop offset="90%" stopColor={adjustBrightness(color, side === "left" ? 0.8 : 0.6)} />
          <stop offset="100%" stopColor={adjustBrightness(color, side === "left" ? 1.2 : 0.5)} />
        </linearGradient>

        {/* Vertical shading for depth */}
        <linearGradient
          id={`curtain-vertical-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
          <stop offset="5%" stopColor="rgba(0,0,0,0)" />
          <stop offset="95%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
        </linearGradient>

        {/* Satin sheen overlay */}
        <linearGradient
          id={`curtain-sheen-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="20%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0)" />
          <stop offset="85%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Main curtain body */}
      <rect x="0" y="0" width="100" height="200" fill={`url(#curtain-main-${uniqueId})`} />

      {/* Vertical shading */}
      <rect x="0" y="0" width="100" height="200" fill={`url(#curtain-vertical-${uniqueId})`} />

      {/* Satin sheen */}
      <rect x="0" y="0" width="100" height="200" fill={`url(#curtain-sheen-${uniqueId})`} />

      {/* Fold lines for texture */}
      {[15, 30, 45, 60, 75, 90].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1="0"
          x2={x}
          y2="200"
          stroke={i % 2 === 0 ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.08)"}
          strokeWidth="0.5"
        />
      ))}

      {/* Top valance shadow */}
      <rect x="0" y="0" width="100" height="8" fill="rgba(0,0,0,0.4)" />

      {/* Bottom hem highlight */}
      <rect x="0" y="196" width="100" height="4" fill="rgba(255,255,255,0.1)" />
    </svg>
  );
};

/**
 * Adjust color brightness
 */
function adjustBrightness(hex: string, factor: number): string {
  // Parse hex color
  let r = 0, g = 0, b = 0;

  if (hex.startsWith("#")) {
    const h = hex.slice(1);
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length === 6) {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    }
  }

  // Adjust brightness
  r = Math.min(255, Math.max(0, Math.round(r * factor)));
  g = Math.min(255, Math.max(0, Math.round(g * factor)));
  b = Math.min(255, Math.max(0, Math.round(b * factor)));

  return `rgb(${r},${g},${b})`;
}

export default CurtainOpening;
