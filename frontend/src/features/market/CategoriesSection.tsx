import { motion } from 'framer-motion'
import { Landmark, Layers, Dog, Gamepad2, Brain } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface Category {
  id: string
  name: string
  subtitle: string
  icon: LucideIcon
  gradientFrom: string
  gradientTo: string
  glowColor: string
}

const categories: Category[] = [
  {
    id: 'defi',
    name: 'DeFi',
    subtitle: 'View all',
    icon: Landmark,
    gradientFrom: '#667eea',
    gradientTo: '#764ba2',
    glowColor: 'rgba(102, 126, 234, 0.3)',
  },
  {
    id: 'layer1',
    name: 'Layer 1',
    subtitle: 'View all',
    icon: Layers,
    gradientFrom: '#06b6d4',
    gradientTo: '#0891b2',
    glowColor: 'rgba(6, 182, 212, 0.3)',
  },
  {
    id: 'meme',
    name: 'Meme',
    subtitle: 'View all',
    icon: Dog,
    gradientFrom: '#f97316',
    gradientTo: '#facc15',
    glowColor: 'rgba(249, 115, 22, 0.3)',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    subtitle: 'View all',
    icon: Gamepad2,
    gradientFrom: '#ec4899',
    gradientTo: '#8b5cf6',
    glowColor: 'rgba(236, 72, 153, 0.3)',
  },
  {
    id: 'ai',
    name: 'AI',
    subtitle: 'View all',
    icon: Brain,
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    glowColor: 'rgba(16, 185, 129, 0.3)',
  },
]

export function CategoriesSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-3"
    >
      {/* Section Title */}
      <h2 className="text-headline-sm font-semibold text-tg-text px-1">
        Categories
      </h2>

      {/* Horizontal Scrollable Container */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((category, index) => {
          const Icon = category.icon
          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.25 + index * 0.05,
              }}
              whileTap={{ scale: 0.96 }}
              className="flex-shrink-0 w-[120px] h-[100px] rounded-xl overflow-hidden snap-start relative group"
              style={{
                background: `linear-gradient(135deg, ${category.gradientFrom} 0%, ${category.gradientTo} 100%)`,
                boxShadow: `0 4px 16px ${category.glowColor}, 0 8px 32px rgba(0, 0, 0, 0.3)`,
              }}
            >
              {/* Gradient Overlay for Depth */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-hidden="true"
              />

              {/* Content Container */}
              <div className="relative h-full flex flex-col items-center justify-center gap-1.5 p-3">
                {/* Icon with Background */}
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Icon size={20} className="text-white" strokeWidth={2.5} />
                </div>

                {/* Category Name */}
                <h3 className="text-body font-semibold text-white tracking-tight">
                  {category.name}
                </h3>

                {/* Subtitle */}
                <p className="text-body-xs font-medium text-white/80">
                  {category.subtitle}
                </p>
              </div>

              {/* Shine Effect */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  transform: 'translateX(-100%) translateY(-100%) rotate(45deg)',
                }}
                aria-hidden="true"
              />
            </motion.button>
          )
        })}
      </div>

      {/* CSS to hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </motion.div>
  )
}
