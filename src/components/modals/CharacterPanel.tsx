import { useState } from 'react'
import { useStore } from '@/store/useStore'

const CLIPS: { id: string; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'wave', label: 'Wave' },
  { id: 'pocket', label: 'Pocket' },
  { id: 'eat', label: 'Dorayaki' },
  { id: 'hover', label: 'Take-copter' },
  { id: 'power', label: 'Tail pull' },
]
const FACES = ['neutral', 'laugh', 'pout', 'scream', 'love', 'dizzy', 'angry']

/** Controls for the interactive character preview (the same events the click zones fire). */
export function CharacterPanel({ dark }: { dark: boolean }) {
  const send = useStore((s) => s.sendCharCmd)
  const [clip, setClip] = useState('idle')
  const [face, setFace] = useState('neutral')
  const chip = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-[12px] transition-colors ${active ? 'bg-ink text-paper' : dark ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-card/90 text-ink-2 hover:text-ink border border-line'}`
  return (
    <div className="absolute left-4 top-[6.25rem] z-10 flex max-w-[15rem] flex-col gap-2.5 md:top-16" data-lenis-prevent>
      <div>
        <p className={`mb-1.5 font-mono text-[10px] uppercase tracking-wider ${dark ? 'text-white/60' : 'text-muted'}`}>Animation</p>
        <div className="flex flex-wrap gap-1">
          {CLIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={chip(clip === c.id)}
              onClick={() => {
                setClip(c.id)
                send('clip', c.id)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className={`mb-1.5 font-mono text-[10px] uppercase tracking-wider ${dark ? 'text-white/60' : 'text-muted'}`}>Expression</p>
        <div className="flex flex-wrap gap-1">
          {FACES.map((f) => (
            <button
              key={f}
              type="button"
              className={chip(face === f)}
              onClick={() => {
                setFace(f)
                send('expression', f)
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <p className={`text-[11px] leading-snug ${dark ? 'text-white/60' : 'text-muted'}`}>
        Click the head, belly, pocket or red tail. The eyes follow your cursor.
      </p>
    </div>
  )
}
