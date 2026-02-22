'use client'

import { useEffect, useRef } from 'react'

export default function VantaFog() {
  const vantaRef = useRef<HTMLDivElement>(null)
  const vantaEffect = useRef<any>(null)

  useEffect(() => {
    // Dynamically import to avoid SSR issues
    const loadVanta = async () => {
      const THREE = await import('three')
      const VANTA = (await import('vanta/dist/vanta.fog.min')).default

      if (vantaRef.current && !vantaEffect.current) {
        vantaEffect.current = VANTA({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          highlightColor: 0x78d4ff,   // bright sky-blue highlight
          midtoneColor: 0x1e5baa,    // rich medium blue midtone
          lowlightColor: 0x0a1f5c,   // deep dark navy
          baseColor: 0x0d2b7a,       // dark indigo base — high contrast with highlight
          speed: 2.0,
          zoom: 0.7,
          blurFactor: 0.5,
        })
      }
    }

    loadVanta()

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy()
        vantaEffect.current = null
      }
    }
  }, [])

  return (
    <div
      ref={vantaRef}
      className="absolute inset-0 w-full h-full z-0"
      aria-hidden="true"
    />
  )
}
