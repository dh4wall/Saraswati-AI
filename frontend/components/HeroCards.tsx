'use client'

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { DraggableCardBody } from "./ui/draggable-card"

export default function HeroCards() {
  const items = [
    { title: "Knowledge Graph", image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=3540&auto=format&fit=crop" },
    { title: "Academic Research", image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=2667&auto=format&fit=crop" },
    { title: "AI Analysis", image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=3165&auto=format&fit=crop" },
    { title: "Data Visualization", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=3540&auto=format&fit=crop" },
    { title: "Machine Learning", image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=3540&auto=format&fit=crop" },
    { title: "Peer Review", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=3473&auto=format&fit=crop" },
  ]

  const [scatterItems, setScatterItems] = useState<any[]>([])

  useEffect(() => {
    const randomized = items.map((item) => {
      // Randomize an initial cluster spread
      const angle = Math.random() * Math.PI * 2
      const radiusX = 150 + Math.random() * 200
      const radiusY = 50 + Math.random() * 100
      
      return {
        ...item,
        left: `calc(50% + ${Math.cos(angle) * radiusX}px)`,
        top: `calc(50% + ${Math.sin(angle) * radiusY}px)`,
        r: (Math.random() - 0.5) * 40,
        floatDelay: Math.random() * 2,
        floatDuration: 3 + Math.random() * 2
      }
    })
    setScatterItems(randomized)
  }, [])

  const containerRef = React.useRef<HTMLDivElement>(null)

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div 
        ref={containerRef} 
        className="absolute inset-0 bg-white/30 backdrop-blur-md overflow-hidden z-10 pointer-events-none" 
      />
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/20 blur-[100px] rounded-full pointer-events-none z-0" />
      
      {scatterItems.map((item) => (
        <motion.div
          key={item.title}
          className="absolute -ml-[128px] -mt-[180px] z-20"
          style={{ left: item.left, top: item.top }}
          initial={{ rotate: item.r }}
          animate={{ y: [-15, 15] }}
          transition={{
            repeat: Infinity,
            repeatType: "mirror",
            duration: item.floatDuration,
            delay: item.floatDelay,
            ease: "easeInOut",
          }}
        >
          <DraggableCardBody containerRef={containerRef}>
            <img
              src={item.image}
              alt={item.title}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="pointer-events-none relative z-10 h-64 w-64 rounded-xl object-cover shadow-md select-none"
            />
            <h3 className="mt-5 text-center text-base font-black text-[color:var(--color-deep-indigo)] uppercase tracking-wider">{item.title}</h3>
          </DraggableCardBody>
        </motion.div>
      ))}

      <div className="absolute z-10 pointer-events-none text-center bg-white/50 backdrop-blur-lg px-8 py-4 rounded-3xl shadow-xl border border-white top-[70%] lg:top-[80%]">
        <h3 className="text-3xl font-black text-[color:var(--color-deep-indigo)] drop-shadow-sm">Interact</h3>
        <p className="text-slate-500 font-bold drop-shadow-sm uppercase tracking-widest text-sm mt-1">Drag to explore</p>
      </div>
    </div>
  )
}
