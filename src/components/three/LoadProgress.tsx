import { useProgress } from '@react-three/drei'

/** Model download progress (lazy: it pulls in drei, which belongs to the 3D chunk). */
export default function LoadProgress({ size }: { size?: string }) {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <span>
      Loading model{size ? ` (${size})` : ''} · {progress.toFixed(0)}%
    </span>
  )
}
