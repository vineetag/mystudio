'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLoadingScreen } from '@/hooks/useLoadingScreen'

// ── Shared helpers ────────────────────────────────────────────────────────────

function useMessages(messages: string[]) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setVisible(false), 2500)
    return () => clearInterval(interval)
  }, [messages.length])

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => {
        setIdx(i => (i + 1) % messages.length)
        setVisible(true)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [visible, messages.length])

  return { message: messages[idx], idx, visible }
}

const outer =
  'w-full min-h-[320px] sm:min-h-[380px] flex flex-col items-center justify-center rounded-2xl px-4 py-8 sm:px-8 sm:py-10 overflow-hidden'
const central = 'max-w-[280px] sm:max-w-[340px] mx-auto w-full flex flex-col items-center gap-4'

const PILL_BG = ['#ede9fe', '#fce7f3', '#fef9c3', '#dcfce7', '#dbeafe']
const PILL_TEXT = ['#7c3aed', '#be185d', '#b45309', '#166534', '#1d4ed8']

// ── Variant 0 — Magic Book ────────────────────────────────────────────────────

export function MagicBook() {
  const { message, visible } = useMessages([
    'Our storyteller is choosing the best words just for you!',
    'Adding a little magic and adventure to every page…',
    'Sprinkling in some surprise twists!',
    'Almost done — get ready for an amazing tale! 🎉',
  ])

  const orbitPositions: Array<[string, string]> = [
    ['4px', '50%'],
    ['50%', 'calc(100% - 4px)'],
    ['calc(100% - 4px)', '50%'],
    ['50%', '4px'],
  ]

  return (
    <div className={`${outer} bg-gradient-to-br from-[#fef9ee] to-[#fff0f8] border border-[#f0d6f5]`}>
      <div className={central}>
        {/* Illustration */}
        <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
          {(['✨', '⭐', '💫', '🌟'] as const).map((emoji, i) => (
            <span
              key={emoji}
              className="absolute text-lg select-none"
              style={{
                top: orbitPositions[i][0],
                left: orbitPositions[i][1],
                transform: 'translate(-50%, -50%)',
                animation: 'zt-shimmer 1.6s ease-in-out infinite',
                animationDelay: `${i * 0.4}s`,
              }}
            >
              {emoji}
            </span>
          ))}

          <div style={{ animation: 'zt-float 2.4s ease-in-out infinite', perspective: 400 }}>
            <div
              style={{
                width: 72,
                height: 88,
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                borderRadius: '4px 10px 10px 4px',
                position: 'relative',
                boxShadow: '4px 6px 20px rgba(124,58,237,0.35)',
                animation: 'zt-pageTurn 3.5s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 10,
                  background: '#6d28d9',
                  borderRadius: '4px 0 0 4px',
                }}
              />
              {[18, 32, 46, 60].map((t, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 6,
                    top: t,
                    height: 2,
                    background: 'rgba(255,255,255,0.55)',
                    borderRadius: 2,
                    animation: 'zt-shimmer 2s ease-in-out infinite',
                    animationDelay: `${i * 0.35}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bounce dots */}
        <div className="flex gap-2">
          {(['#7c3aed', '#ec4899', '#f59e0b'] as const).map((c, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: c,
                animation: 'zt-bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        <p
          className="text-center text-sm sm:text-base font-semibold text-purple-700 leading-snug"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: '2.5rem' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Variant 1 — Space Rocket ──────────────────────────────────────────────────

export function SpaceRocket() {
  const { message, visible } = useMessages([
    'Blasting off into story space!',
    'Fueling up with imagination rockets 🚀',
    'Flying past the Dragon Nebula right now!',
    '3… 2… 1… Story landing in 3 seconds! 🎉',
  ])

  const stars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        top: (i * 37.3) % 100,
        left: (i * 53.7) % 100,
        size: (i % 3) + 1,
        delay: (i * 0.13) % 2,
        duration: 1 + (i % 3) * 0.5,
      })),
    [],
  )

  return (
    <div className={`${outer} bg-[#1a1040]`}>
      <div className={central}>
        {/* Star field + rocket */}
        <div className="relative w-full" style={{ height: 160 }}>
          {stars.map(s => (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                top: `${s.top}%`,
                left: `${s.left}%`,
                width: s.size,
                height: s.size,
                borderRadius: '50%',
                background: 'white',
                animation: `zt-twinkle ${s.duration}s ease-in-out infinite`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}

          {/* Drifting clouds */}
          {[
            { top: 12, delay: '0s', scale: 1 },
            { top: 65, delay: '4s', scale: 0.7 },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${c.top}%`,
                right: -60,
                opacity: 0.18,
                transform: `scale(${c.scale})`,
                animation: 'zt-drift 9s linear infinite',
                animationDelay: c.delay,
              }}
            >
              <div style={{ position: 'relative', width: 80, height: 32 }}>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 10,
                    width: 60,
                    height: 20,
                    borderRadius: 10,
                    background: 'white',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 22,
                    width: 36,
                    height: 22,
                    borderRadius: '50%',
                    background: 'white',
                  }}
                />
              </div>
            </div>
          ))}

          {/* Rocket */}
          <div
            className="absolute left-1/2"
            style={{
              top: '5%',
              transform: 'translateX(-50%) rotate(-10deg)',
              animation: 'zt-float 2s ease-in-out infinite',
            }}
          >
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Nose cone */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '16px solid transparent',
                  borderRight: '16px solid transparent',
                  borderBottom: '28px solid #c084fc',
                }}
              />
              {/* Body */}
              <div
                style={{
                  width: 32,
                  height: 44,
                  background: 'linear-gradient(180deg, #e879f9, #a855f7)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#dbeafe',
                    border: '2px solid #93c5fd',
                  }}
                />
              </div>
              {/* Fins */}
              <div style={{ display: 'flex', width: 48, marginTop: -1 }}>
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderRight: '10px solid #7c3aed',
                    borderTop: '18px solid transparent',
                  }}
                />
                <div style={{ flex: 1, height: 18, background: '#a855f7' }} />
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '10px solid #7c3aed',
                    borderTop: '18px solid transparent',
                  }}
                />
              </div>
              {/* Flames */}
              <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                {[
                  { w: 8, h: 20, c: '#fbbf24', d: '0s' },
                  { w: 10, h: 26, c: '#f97316', d: '0.15s' },
                  { w: 8, h: 18, c: '#fbbf24', d: '0.3s' },
                ].map((f, i) => (
                  <div
                    key={i}
                    style={{
                      width: f.w,
                      height: f.h,
                      background: f.c,
                      borderRadius: '0 0 50% 50%',
                      animation: 'zt-flamePulse 0.4s ease-in-out infinite',
                      animationDelay: f.d,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #a855f7, #ec4899)',
              borderRadius: 999,
              animation: 'zt-barGrow 4s ease-in-out infinite',
            }}
          />
        </div>

        <p
          className="text-center text-sm sm:text-base font-semibold text-purple-200 leading-snug"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: '2.5rem' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Variant 2 — Magic Potion ──────────────────────────────────────────────────

export function MagicPotion() {
  const { message, visible } = useMessages([
    'Tossing in dragons, rainbows, and a pinch of silly…',
    'Stirring the imagination pot extra fast!',
    'Adding a surprise twist near the end… 👀',
    'Your story potion is almost ready — stand back!',
  ])

  return (
    <div className={`${outer} bg-gradient-to-br from-[#fef3c7] to-[#ecfdf5] border border-[#a7f3d0]`}>
      <div className={central}>
        {/* Ingredient emojis */}
        <div className="flex gap-4">
          {(['🐉', '🌈', '⚡', '🦄'] as const).map((e, i) => (
            <span
              key={e}
              className="text-xl select-none"
              style={{
                display: 'inline-block',
                animation: 'zt-float 2s ease-in-out infinite',
                animationDelay: `${i * 0.35}s`,
              }}
            >
              {e}
            </span>
          ))}
        </div>

        {/* Cauldron */}
        <div style={{ position: 'relative', animation: 'zt-wobble 1.8s ease-in-out infinite' }}>
          {/* Rising bubbles — positioned relative to cauldron top */}
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: 68,
                left: `${22 + i * 18}%`,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#34d399',
                opacity: 0.8,
                animation: 'zt-bubble 2s ease-out infinite',
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}

          {/* Cauldron shape */}
          <div style={{ position: 'relative', width: 100, height: 82 }}>
            {/* Rim */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 14,
                background: '#374151',
                borderRadius: '50% 50% 0 0 / 70% 70% 0 0',
              }}
            />
            {/* Inner liquid glow */}
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 8,
                right: 8,
                height: 10,
                background: '#6ee7b7',
                borderRadius: '50%',
                boxShadow: '0 0 14px 5px rgba(52,211,153,0.45)',
                animation: 'zt-shimmer 1.4s ease-in-out infinite',
              }}
            />
            {/* Body */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 0,
                right: 0,
                bottom: 16,
                background: '#1f2937',
                borderRadius: '0 0 50% 50% / 0 0 70% 70%',
              }}
            />
            {/* Legs */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                width: 14,
                height: 16,
                background: '#374151',
                borderRadius: '0 0 4px 4px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 16,
                width: 14,
                height: 16,
                background: '#374151',
                borderRadius: '0 0 4px 4px',
              }}
            />
          </div>
        </div>

        {/* Pill tags */}
        <div className="flex gap-2 flex-wrap justify-center">
          {[
            { label: '✨ Magic', bg: '#ede9fe', color: '#7c3aed', d: '0s' },
            { label: '💖 Adventure', bg: '#fce7f3', color: '#be185d', d: '0.3s' },
            { label: '🎉 Giggles', bg: '#fef9c3', color: '#b45309', d: '0.6s' },
          ].map(p => (
            <span
              key={p.label}
              style={{
                background: p.bg,
                color: p.color,
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                display: 'inline-block',
                animation: 'zt-float 2.2s ease-in-out infinite',
                animationDelay: p.d,
              }}
            >
              {p.label}
            </span>
          ))}
        </div>

        <p
          className="text-center text-sm sm:text-base font-semibold text-emerald-700 leading-snug"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: '2.5rem' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Variant 3 — Story Typewriter (magic wand) ─────────────────────────────────

const TYPEWRITER_WORDS = [
  ['Dragons', 'Brave', 'Kingdom', 'Magic', 'Friends'],
  ['Castles', 'Heroes', 'Treasure', 'Quest', 'Laughter'],
  ['Fairies', 'Adventure', 'Stars', 'Wishes', 'Journey'],
  ['Unicorns', 'Wisdom', 'Mystery', 'Joy', 'Wonder'],
]

export function StoryTypewriter() {
  const { message, idx, visible } = useMessages([
    'Every great story starts with one magical word!',
    'The wand is picking the perfect characters just for you…',
    'Weaving in twists, giggles, and a happy ending!',
    'Final sentence forming… almost there! 🎊',
  ])

  const wordSet = TYPEWRITER_WORDS[idx % 4]

  return (
    <div className={`${outer} bg-gradient-to-br from-[#eff6ff] to-[#fdf4ff] border border-[#ddd6fe]`}>
      <div className={central}>
        {/* Wand + paper */}
        <div className="flex items-center justify-center gap-8">
          {/* Magic wand */}
          <div
            style={{
              position: 'relative',
              transform: 'rotate(20deg)',
              animation: 'zt-sway 2.5s ease-in-out infinite',
            }}
          >
            <div
              style={{
                width: 8,
                height: 72,
                background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
                borderRadius: 4,
                position: 'relative',
              }}
            >
              {/* Tip star */}
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ⭐
              </div>
            </div>

            {/* Spark dots */}
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60 * Math.PI) / 180
              const r = 28
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: -4,
                    left: '50%',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: ['#f59e0b', '#ec4899', '#a855f7', '#34d399', '#60a5fa', '#fb923c'][i],
                    transform: `translate(${Math.cos(angle) * r - 3}px, ${Math.sin(angle) * r - 3}px)`,
                    animation: 'zt-sparkle 1.8s ease-in-out infinite',
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              )
            })}
          </div>

          {/* Paper */}
          <div
            style={{
              width: 64,
              height: 80,
              background: 'white',
              borderRadius: 6,
              boxShadow: '2px 4px 12px rgba(0,0,0,0.1)',
              padding: '10px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              overflow: 'hidden',
            }}
          >
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: 3,
                  background: '#ddd6fe',
                  borderRadius: 2,
                  width: 0,
                  animation: 'zt-barGrow 3s ease-in-out infinite',
                  animationDelay: `${i * 0.55}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Word bubbles */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {wordSet.map((word, i) => (
            <span
              key={`${word}-${idx}`}
              style={{
                background: PILL_BG[i],
                color: PILL_TEXT[i],
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                animation: 'zt-pop 0.4s ease-out both',
                animationDelay: `${i * 0.08}s`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        <p
          className="text-center text-sm sm:text-base font-semibold text-indigo-700 leading-snug"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: '2.5rem' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Variant 4 — Wise Owl Writer ───────────────────────────────────────────────

const OWL_WORDS = [
  ['Enchanted', 'Brave', 'Moonlit', 'Secret', 'Quest'],
  ['Forest', 'Wizard', 'Treasure', 'Ancient', 'Map'],
  ['Dragon', 'Crystal', 'Whispering', 'Cave', 'Lantern'],
  ['Kingdom', 'Clever', 'Riddle', 'Moonbeam', 'Hero'],
]

export function WiseOwlWriter() {
  const { message, idx, visible } = useMessages([
    'Dipping the quill into a fresh pot of imagination!',
    'Hoot hoot — a plot twist just landed on the page!',
    'Choosing the most magical words from the word forest…',
    "Almost done! Professor Hoot never writes a boring ending 🦉",
  ])

  const wordSet = OWL_WORDS[idx % 4]

  return (
    <div className={`${outer} bg-[#fffbeb] border border-[#fde68a]`}>
      <div className={central}>
        <p className="text-sm sm:text-base font-bold text-amber-800">Professor Hoot is writing…</p>

        {/* Owl + notebook */}
        <div className="flex items-end gap-5 justify-center">
          {/* Owl */}
          <div style={{ animation: 'zt-sway 2.8s ease-in-out infinite', transformOrigin: 'bottom center' }}>
            {/* Ear tufts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 8 }}>
              {[0, 1].map(i => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 14,
                    background: '#92400e',
                    borderRadius: '4px 4px 0 0',
                    transform: i === 0 ? 'rotate(-12deg)' : 'rotate(12deg)',
                  }}
                />
              ))}
            </div>
            {/* Head */}
            <div
              style={{
                width: 56,
                height: 52,
                background: '#b45309',
                borderRadius: '50%',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 12 }}>
                {[0, 1].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 16,
                      height: 16,
                      background: '#fef3c7',
                      borderRadius: '50%',
                      position: 'relative',
                      animation: 'zt-blink 4s ease-in-out infinite',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        width: 8,
                        height: 8,
                        background: '#1c1917',
                        borderRadius: '50%',
                      }}
                    />
                  </div>
                ))}
              </div>
              {/* Beak */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 9,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '7px solid #d97706',
                }}
              />
            </div>
            {/* Body */}
            <div
              style={{
                width: 64,
                height: 52,
                background: '#78350f',
                borderRadius: '50% 50% 45% 45%',
                position: 'relative',
                marginTop: -4,
                marginLeft: -4,
              }}
            >
              {/* Belly */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 32,
                  height: 28,
                  background: '#fef3c7',
                  borderRadius: '50%',
                }}
              />
              {/* Left wing */}
              <div
                style={{
                  position: 'absolute',
                  left: -11,
                  top: 5,
                  width: 13,
                  height: 32,
                  background: '#92400e',
                  borderRadius: '50% 0 50% 50%',
                  animation: 'zt-sway 1.2s ease-in-out infinite',
                  transformOrigin: 'top right',
                }}
              />
              {/* Right wing */}
              <div
                style={{
                  position: 'absolute',
                  right: -11,
                  top: 5,
                  width: 13,
                  height: 32,
                  background: '#92400e',
                  borderRadius: '0 50% 50% 50%',
                  animation: 'zt-sway 1.2s ease-in-out infinite',
                  animationDelay: '0.6s',
                  transformOrigin: 'top left',
                }}
              />
            </div>
          </div>

          {/* Notebook with quill */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: -22,
                right: -10,
                fontSize: 22,
                animation: 'zt-write 1.5s ease-in-out infinite',
                transformOrigin: 'bottom center',
              }}
            >
              🪶
            </div>
            <div
              style={{
                width: 58,
                height: 76,
                background: '#1e3a5f',
                borderRadius: '4px 6px 6px 4px',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  background: '#1a3150',
                  borderRadius: '4px 0 0 4px',
                }}
              />
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: 2,
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: 2,
                    width: 0,
                    animation: 'zt-barGrow 3s ease-in-out infinite',
                    animationDelay: `${i * 0.6}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Word bubbles */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {wordSet.map((word, i) => (
            <span
              key={`${word}-${idx}`}
              style={{
                background: PILL_BG[i],
                color: PILL_TEXT[i],
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                animation: 'zt-pop 0.4s ease-out both',
                animationDelay: `${i * 0.08}s`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        <p
          className="text-center text-sm sm:text-base font-semibold text-amber-800 leading-snug"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: '2.5rem' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Variant 5 — Zippy the Narrator ───────────────────────────────────────────

const ZIPPY_WORDS = [
  ['Chapter 1', 'Heroes', 'Danger', 'Friendship', 'Happy ending'],
  ['The journey', 'Rivals', 'Secrets', 'Laughter', 'Chapter 2'],
  ['The forest', 'Lost map', 'New friend', 'Chapter 3', 'Big reveal'],
  ['The finale', 'Courage', 'Home', 'Victory', 'Chapter 4'],
]

const ZIPPY_REACTIONS = ['Ooh, a twist!', 'So exciting!', 'Wait for it…', 'Epic!', 'Plot twist!']

export function ZippyNarrator() {
  const { message, idx, visible } = useMessages([
    'Taking a deep breath before the very first sentence…',
    "Zippy just added a sneaky plot twist — you'll love it!",
    'Building up to the exciting part right now!',
    'Last paragraph! Zippy saved the best bit for the ending 🎉',
  ])

  const wordSet = ZIPPY_WORDS[idx % 4]

  const [reactionIdx, setReactionIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setReactionIdx(i => (i + 1) % ZIPPY_REACTIONS.length), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={`${outer} bg-[#f0f9ff] border border-[#bae6fd]`}>
      <div className={central}>
        <p className="text-sm sm:text-base font-bold text-sky-700">Zippy is narrating your story!</p>

        {/* Zippy + scroll — paddingTop gives speech bubble room above */}
        <div className="flex items-end gap-4 justify-center" style={{ paddingTop: 42 }}>
          {/* Zippy character */}
          <div
            style={{
              position: 'relative',
              animation: 'zt-float 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          >
            {/* Speech bubble */}
            <div
              style={{
                position: 'absolute',
                top: -34,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: 8,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: '#0369a1',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #bae6fd',
              }}
            >
              {ZIPPY_REACTIONS[reactionIdx]}
              <div
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid white',
                }}
              />
            </div>

            {/* Head */}
            <div
              style={{
                width: 48,
                height: 48,
                background: '#38bdf8',
                borderRadius: '50%',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(56,189,248,0.35)',
              }}
            >
              {/* Hair spikes */}
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: -5,
                    left: 4 + i * 8,
                    width: 6,
                    height: 10,
                    background: '#f59e0b',
                    borderRadius: '50% 50% 0 0',
                    transform: `rotate(${(i - 2) * 15}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                />
              ))}
              {/* Eyes */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 16 }}>
                {[0, 1].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      background: 'white',
                      borderRadius: '50%',
                      position: 'relative',
                      animation: 'zt-blink 3.5s ease-in-out infinite',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: 3,
                        width: 4,
                        height: 4,
                        background: '#1e3a5f',
                        borderRadius: '50%',
                      }}
                    />
                  </div>
                ))}
              </div>
              {/* Smile */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 18,
                  height: 7,
                  borderBottom: '3px solid #1e3a5f',
                  borderRadius: '0 0 50% 50%',
                }}
              />
            </div>

            {/* Body */}
            <div
              style={{
                width: 52,
                height: 44,
                background: '#0ea5e9',
                borderRadius: '50% 50% 40% 40%',
                position: 'relative',
                marginTop: -4,
                marginLeft: -2,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ⭐
              </div>
              {/* Left arm */}
              <div
                style={{
                  position: 'absolute',
                  left: -10,
                  top: 4,
                  width: 12,
                  height: 28,
                  background: '#38bdf8',
                  borderRadius: '50%',
                  animation: 'zt-sway 0.8s ease-in-out infinite',
                  transformOrigin: 'top center',
                }}
              />
              {/* Right arm */}
              <div
                style={{
                  position: 'absolute',
                  right: -10,
                  top: 4,
                  width: 12,
                  height: 28,
                  background: '#38bdf8',
                  borderRadius: '50%',
                  animation: 'zt-sway 0.8s ease-in-out infinite',
                  animationDelay: '0.4s',
                  transformOrigin: 'top center',
                }}
              />
              {/* Legs */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'center',
                  position: 'absolute',
                  bottom: -13,
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                {[0, 1].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 12,
                      height: 15,
                      background: '#0284c7',
                      borderRadius: '0 0 50% 50%',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scroll */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 62,
                height: 10,
                background: '#fef3c7',
                borderRadius: 5,
                border: '2px solid #fde68a',
              }}
            />
            <div
              style={{
                width: 62,
                height: 68,
                background: '#fffbeb',
                border: '2px solid #fde68a',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                overflow: 'hidden',
              }}
            >
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: 2,
                    background: '#92400e',
                    opacity: 0.35,
                    borderRadius: 2,
                    width: 0,
                    animation: 'zt-barGrow 3s ease-in-out infinite',
                    animationDelay: `${i * 0.55}s`,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                width: 62,
                height: 10,
                background: '#fef3c7',
                borderRadius: 5,
                border: '2px solid #fde68a',
              }}
            />

            {/* Ink dots */}
            <div
              style={{
                position: 'absolute',
                right: -20,
                top: '30%',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              {(['#a855f7', '#ec4899', '#34d399'] as const).map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: c,
                    animation: 'zt-shimmer 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.4}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Word bubbles */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {wordSet.map((word, i) => (
            <span
              key={`${word}-${idx}`}
              style={{
                background: PILL_BG[i % PILL_BG.length],
                color: PILL_TEXT[i % PILL_TEXT.length],
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                animation: 'zt-pop 0.4s ease-out both',
                animationDelay: `${i * 0.08}s`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        <p
          className="text-center text-sm sm:text-base font-semibold text-sky-700 leading-snug"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: '2.5rem' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Variant 6 — Story Garden ──────────────────────────────────────────────────

const GARDEN_WORDS = [
  ['Growing fast', 'New buds', 'In full bloom', 'Ready soon'],
  ['Taking root', 'First leaf', 'Sunshine added', 'Almost there'],
  ['Blooming words', 'Plot petals', 'Story seeds', 'Watered well'],
  ['Full garden', 'Last petal', 'Harvest time', 'Read soon'],
]

const FLOWER_COLORS = ['#f9a8d4', '#93c5fd', '#fca5a5', '#c4b5fd', '#5eead4']
const GARDEN_PILL_BG = ['#dcfce7', '#d1fae5', '#ccfbf1', '#bbf7d0']
const GARDEN_PILL_TEXT = ['#166534', '#065f46', '#134e4a', '#14532d']

function GardenFlower({ color, flowerIdx }: { color: string; flowerIdx: number }) {
  const angles = [0, 60, 120, 180, 240, 300]
  return (
    <div style={{ position: 'relative', width: 36, height: 62 }}>
      {/* Flower head */}
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        {angles.map((angle, pi) => (
          <div
            key={pi}
            style={{
              position: 'absolute',
              top: 'calc(50% - 14px)',
              left: 'calc(50% - 5px)',
              transformOrigin: 'bottom center',
              transform: `rotate(${angle}deg)`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 14,
                background: color,
                borderRadius: '50% 50% 30% 30%',
                animation: 'zt-petal 2.5s ease-out both',
                animationDelay: `${flowerIdx * 0.25 + pi * 0.08}s`,
              }}
            />
          </div>
        ))}
        {/* Center */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#fbbf24',
            zIndex: 1,
          }}
        />
      </div>
      {/* Stem */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 4,
          height: 30,
          background: '#4ade80',
          borderRadius: '0 0 2px 2px',
          animation: 'zt-sway 2s ease-in-out infinite',
          animationDelay: `${flowerIdx * 0.2}s`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -9,
            top: 7,
            width: 10,
            height: 7,
            background: '#4ade80',
            borderRadius: '50% 0 50% 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -9,
            top: 16,
            width: 10,
            height: 7,
            background: '#4ade80',
            borderRadius: '0 50% 0 50%',
          }}
        />
      </div>
    </div>
  )
}

export function StoryGarden() {
  const { message, idx, visible } = useMessages([
    'Planting seeds of adventure in rich story soil…',
    'Watering every sentence with a sprinkle of wonder!',
    'Your story flowers are opening — almost in full bloom!',
    'The garden is ready — come pick your story! 🌸',
  ])

  const wordSet = GARDEN_WORDS[idx % 4]

  return (
    <div className={`${outer} bg-[#f0fdf4] border border-[#86efac]`}>
      <div className={central}>
        <p className="text-sm sm:text-base font-bold text-green-700">Your story is blooming!</p>

        {/* Garden */}
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Sun */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 44,
              height: 44,
              zIndex: 1,
            }}
          >
            {/* Sun rays — behind the circle */}
            {[0, 45, 90, 135].map((a, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 44,
                  height: 3,
                  background: '#fde68a',
                  borderRadius: 2,
                  transform: `translate(-50%, -50%) rotate(${a}deg)`,
                }}
              />
            ))}
            {/* Yellow circle on top of rays */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 26,
                height: 26,
                background: '#fbbf24',
                borderRadius: '50%',
                boxShadow: '0 0 12px rgba(251,191,36,0.5)',
              }}
            />
          </div>

          {/* Flowers row */}
          <div className="flex justify-center gap-2 mb-0">
            {FLOWER_COLORS.map((color, fi) => (
              <GardenFlower key={fi} color={color} flowerIdx={fi} />
            ))}
          </div>

          {/* Soil */}
          <div
            style={{
              height: 18,
              background: 'linear-gradient(180deg, #a16207, #78350f)',
              borderRadius: '0 0 8px 8px',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: `${10 + i * 20}%`,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: ['#fbbf24', '#f9a8d4', '#93c5fd', '#c4b5fd', '#5eead4'][i],
                  animation: 'zt-seedBounce 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.25}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Word tags */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {wordSet.map((word, i) => (
            <span
              key={`${word}-${idx}`}
              style={{
                background: GARDEN_PILL_BG[i],
                color: GARDEN_PILL_TEXT[i],
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                animation: 'zt-pop 0.4s ease-out both',
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        <p
          className="text-center text-sm sm:text-base font-semibold text-green-700 leading-snug"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', minHeight: '2.5rem' }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

const VARIANTS = [
  MagicBook,       // 0
  SpaceRocket,     // 1
  MagicPotion,     // 2
  StoryTypewriter, // 3
  WiseOwlWriter,   // 4
  ZippyNarrator,   // 5
  StoryGarden,     // 6
]

export default function LoadingScreen() {
  const index = useLoadingScreen()
  const Variant = VARIANTS[index]
  return <Variant />
}
