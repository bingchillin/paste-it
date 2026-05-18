'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { useWorkpasteStore } from '@/store/useWorkpasteStore';

const LS_KEY = 'workpaste_tutorial_done';
const HOLE_PAD = 10;
const CARD_W = 288;
const CARD_H_EST = 228;
const GAP = 18;

// ── Steps ─────────────────────────────────────────────────────────────────────

interface Step {
  id: string;
  target: string | null;
  emoji: string;
  title: string;
  body: string;
  ring?: boolean; // show spotlight glow ring — default true; set false for large targets
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    target: null,
    emoji: '👋',
    title: 'Welcome to Workpaste',
    body: 'Your visual board for saving links, notes, and bookmarks — organized the way you think.',
  },
  {
    id: 'collections',
    target: '[data-tutorial="collections"]',
    emoji: '🗂️',
    title: 'Collections',
    body: 'Everything lives inside color-coded collections. Create as many as you need and keep things tidy.',
  },
  {
    id: 'add-collection',
    target: '[data-tutorial="add-collection"]',
    emoji: '✨',
    title: 'Create a collection',
    body: 'Tap here to create your first collection. Give it a name and a color.',
  },
  {
    id: 'board',
    target: '[data-tutorial="board"]',
    ring: false,
    emoji: '🗺️',
    title: 'An infinite board',
    body: 'Drag to pan, scroll or pinch to zoom. Move collections anywhere — build a layout that fits your brain.',
  },
  {
    id: 'search',
    target: '[data-tutorial="search"]',
    emoji: '🔍',
    title: 'Find it instantly',
    body: 'Search across every collection and card in real time. No hunting, no scrolling.',
  },
];

const SIDEBAR_TARGETS = [
  '[data-tutorial="collections"]',
  '[data-tutorial="add-collection"]',
  '[data-tutorial="search"]',
];

// ── Geometry helpers ───────────────────────────────────────────────────────────

type HoleRect = { x: number; y: number; w: number; h: number };
type CardPos  = { left: number; top: number };

function getTargetRect(selector: string): HoleRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r  = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Clamp so the hole never bleeds outside the viewport
  const x  = Math.max(0, r.left  - HOLE_PAD);
  const y  = Math.max(0, r.top   - HOLE_PAD);
  const x2 = Math.min(vw, r.right  + HOLE_PAD);
  const y2 = Math.min(vh, r.bottom + HOLE_PAD);
  return { x, y, w: x2 - x, h: y2 - y };
}

// Always returns absolute pixel coords — no translate() so Framer layout can interpolate
function getCardPos(hole: HoleRect | null, isMobile: boolean): CardPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!hole || isMobile) {
    return {
      left: (vw - CARD_W) / 2,
      top:  (vh - CARD_H_EST) / 2,
    };
  }

  const midX    = hole.x + hole.w / 2;
  const clampY  = (y: number) => Math.max(16, Math.min(vh - CARD_H_EST - 16, y));
  const centerY = clampY(hole.y + hole.h / 2 - CARD_H_EST / 2);

  if (midX < vw / 2) {
    // Hole on left half → card to the right
    return { left: Math.min(vw - CARD_W - 16, hole.x + hole.w + GAP), top: centerY };
  }
  // Hole on right half → card to the left
  return { left: Math.max(16, hole.x - CARD_W - GAP), top: centerY };
}

// ── Confetti ──────────────────────────────────────────────────────────────────

const COLORS = ['#a78bfa', '#818cf8', '#34d399', '#fb7185', '#fbbf24', '#60a5fa'];

function Confetti({ onDone }: { onDone: () => void }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 55 }, (_, i) => {
        const angle = (i / 55) * 360 + (Math.random() - 0.5) * 26;
        const dist  = 100 + Math.random() * 200;
        return {
          id:    i,
          color: COLORS[i % COLORS.length],
          size:  Math.random() * 9 + 4,
          round: Math.random() > 0.45,
          dx:    Math.cos((angle * Math.PI) / 180) * dist,
          dy:    Math.sin((angle * Math.PI) / 180) * dist,
          delay: Math.random() * 0.18,
          dur:   1.3 + Math.random() * 0.5,
        };
      }),
    [],
  );

  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', zIndex: 200, pointerEvents: 'none' }}>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0, rotate: 420 }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : 3,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

// ── Emoji ─────────────────────────────────────────────────────────────────────

function WaveEmoji() {
  return (
    <motion.span
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, 15, -8, 14, -4, 10, 0] }}
      transition={{
        duration: 1.3,
        delay: 0.25,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 2.2,
      }}
      style={{ display: 'inline-block', transformOrigin: '70% 70%' }}
    >
      👋
    </motion.span>
  );
}

function BounceEmoji({ emoji }: { emoji: string }) {
  return (
    <motion.span
      initial={{ scale: 0.35, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.04 }}
      style={{ display: 'inline-block' }}
    >
      {emoji}
    </motion.span>
  );
}

// ── Step body (same markup for card and sheet) ────────────────────────────────

function StepBody({
  step, stepIdx, total, onNext, onSkip, onGoToStep, isLast,
}: {
  step: Step;
  stepIdx: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  onGoToStep: (i: number) => void;
  isLast: boolean;
}) {
  return (
    <>
      <div className="mb-3 text-3xl leading-none">
        {step.emoji === '👋' ? <WaveEmoji /> : <BounceEmoji emoji={step.emoji} />}
      </div>

      <p className="mb-1.5 text-base font-semibold leading-snug">{step.title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>

      {/* Progress dots — clickable to jump to any step */}
      <div className="mt-4 flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onGoToStep(i)}
            aria-label={`Go to step ${i + 1}`}
            className="cursor-pointer rounded-full border-0 p-0 transition-all duration-300 hover:opacity-80"
            style={{
              width: i === stepIdx ? 16 : 6,
              height: 6,
              backgroundColor:
                i === stepIdx
                  ? 'var(--primary)'
                  : 'color-mix(in srgb, var(--muted-foreground) 35%, transparent)',
            }}
          />
        ))}
      </div>

      {/* CTA row */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onNext}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.97]"
          style={{ transition: 'opacity 0.15s, transform 0.1s' }}
        >
          {isLast ? 'Get started' : 'Next'}
          {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onSkip}
          className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Tutorial() {
  const tutorialOpen    = useWorkpasteStore((s) => s.tutorialOpen);
  const setTutorialOpen = useWorkpasteStore((s) => s.setTutorialOpen);
  const sidebarOpen     = useWorkpasteStore((s) => s.sidebarOpen);
  const setSidebarOpen  = useWorkpasteStore((s) => s.setSidebarOpen);
  const collections     = useWorkpasteStore((s) => s.collections);

  const [step, setStep]               = useState(0);
  const [holeRect, setHoleRect]       = useState<HoleRect | null>(null);
  const [cardPos, setCardPos]         = useState<CardPos>({ left: 0, top: 0 });
  const [isMobile, setIsMobile]       = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mounted, setMounted]         = useState(false);

  // Hydration guard + auto-open for new users
  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem(LS_KEY)) return;
    const nonArchived = collections.filter((c) => !c.archived).length;
    if (nonArchived > 0) return;
    const t = setTimeout(() => setTutorialOpen(true), 900);
    return () => clearTimeout(t);
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset state when tutorial opens
  useEffect(() => {
    if (tutorialOpen) {
      setStep(0);
      setHoleRect(null);
    }
  }, [tutorialOpen]);

  // Compute spotlight hole for the current step
  useEffect(() => {
    if (!tutorialOpen) return;
    const target = STEPS[step].target;
    if (!target) { setHoleRect(null); return; }

    const needsOpen = SIDEBAR_TARGETS.includes(target);
    if (needsOpen && !sidebarOpen) setSidebarOpen(true);

    // Minimal delay when sidebar already open; full delay when we just opened it
    const delay = needsOpen && !sidebarOpen ? 340 : 10;
    const t = setTimeout(() => setHoleRect(getTargetRect(target)), delay);
    return () => clearTimeout(t);
  }, [step, tutorialOpen, sidebarOpen, setSidebarOpen]);

  // Sync card position whenever hole or mobile state changes —
  // this fires alongside the step change so position and content update together
  useEffect(() => {
    if (!tutorialOpen || typeof window === 'undefined') return;
    setCardPos(getCardPos(holeRect, isMobile));
  }, [holeRect, isMobile, tutorialOpen]);

  const dismiss = useCallback(
    (confetti = false) => {
      if (confetti) setShowConfetti(true);
      setTutorialOpen(false);
      localStorage.setItem(LS_KEY, '1');
      setTimeout(() => { setStep(0); setHoleRect(null); }, 350);
    },
    [setTutorialOpen],
  );

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss(true);
    }
  };

  if (!mounted) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      <AnimatePresence>
        {tutorialOpen && (
          <motion.div
            key="tutorial-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            style={{ position: 'fixed', inset: 0, zIndex: 110 }}
          >
            {/* ── SVG spotlight ─────────────────────────────────────────────── */}
            <svg
              width="100%"
              height="100%"
              style={{ position: 'absolute', inset: 0, display: 'block' }}
            >
              <defs>
                <mask id="tutorial-spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <AnimatePresence>
                    {holeRect && (
                      <motion.rect
                        key="hole"
                        initial={{
                          x: holeRect.x + holeRect.w / 2,
                          y: holeRect.y + holeRect.h / 2,
                          width: 0,
                          height: 0,
                          opacity: 0,
                        }}
                        animate={{
                          x: holeRect.x,
                          y: holeRect.y,
                          width: holeRect.w,
                          height: holeRect.h,
                          opacity: 1,
                        }}
                        exit={{
                          x: holeRect.x + holeRect.w / 2,
                          y: holeRect.y + holeRect.h / 2,
                          width: 0,
                          height: 0,
                          opacity: 0,
                        }}
                        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                        rx={14}
                        fill="black"
                      />
                    )}
                  </AnimatePresence>
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.68)"
                mask="url(#tutorial-spotlight-mask)"
              />
            </svg>

            {/* ── Spotlight glow ring (skip for large full-panel targets) ──────── */}
            <AnimatePresence>
              {holeRect && currentStep.ring !== false && (
                <motion.div
                  key={`ring-${step}`}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                  style={{
                    position: 'absolute',
                    left: holeRect.x - 3,
                    top: holeRect.y - 3,
                    width: holeRect.w + 6,
                    height: holeRect.h + 6,
                    borderRadius: 17,
                    border: '2px solid color-mix(in srgb, var(--primary) 55%, transparent)',
                    boxShadow: '0 0 0 5px color-mix(in srgb, var(--primary) 12%, transparent)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>

            {/* ── Desktop floating card ─────────────────────────────────────── */}
            {!isMobile && (
              // Outer wrapper carries the layout position — no other animations
              // so layout spring doesn't fight with scale/opacity animations
              <motion.div
                layout
                style={{
                  position: 'absolute',
                  width: CARD_W,
                  left: cardPos.left,
                  top: cardPos.top,
                  zIndex: 10,
                }}
                transition={{ layout: { type: 'spring', stiffness: 260, damping: 28 } }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Inner wrapper handles entrance / exit scale + opacity */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.91 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                >
                  <div
                    className="relative rounded-2xl border border-border bg-card p-5"
                    style={{
                      boxShadow:
                        '0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
                    }}
                  >
                    <button
                      onClick={() => dismiss()}
                      className="absolute right-3 top-3 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    {/* Content swaps per step */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16 }}
                      >
                        <StepBody
                          step={currentStep}
                          stepIdx={step}
                          total={STEPS.length}
                          onNext={handleNext}
                          onSkip={() => dismiss()}
                          onGoToStep={setStep}
                          isLast={isLast}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ── Mobile bottom sheet ────────────────────────────────────────── */}
            {isMobile && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}
              >
                <div
                  className="relative rounded-t-3xl border-t border-border bg-card px-5 pb-10 pt-5"
                  style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
                >
                  {/* Handle */}
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

                  <button
                    onClick={() => dismiss()}
                    className="absolute right-4 top-4 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                    >
                      <StepBody
                        step={currentStep}
                        stepIdx={step}
                        total={STEPS.length}
                        onNext={handleNext}
                        onSkip={() => dismiss()}
                        onGoToStep={setStep}
                        isLast={isLast}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
    </>
  );
}
