import { motion } from 'framer-motion'
import { Landmark, Layers, Dog, Gamepad2, Brain } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: LucideIcon
  gradientFrom: string
  gradientTo: string
}

const categories: Category[] = [
  {
    id: 'defi',
    name: 'DeFi',
    icon: Landmark,
    gradientFrom: '#667eea',
    gradientTo: '#764ba2',
  },
  {
    id: 'layer1',
    name: 'Layer 1',
    icon: Layers,
    gradientFrom: '#06b6d4',
    gradientTo: '#0891b2',
  },
  {
    id: 'meme',
    name: 'Meme',
    icon: Dog,
    gradientFrom: '#f97316',
    gradientTo: '#facc15',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: Gamepad2,
    gradientFrom: '#ec4899',
    gradientTo: '#8b5cf6',
  },
  {
    id: 'ai',
    name: 'AI',
    icon: Brain,
    gradientFrom: '#10b981',
    gradientTo: '#059669',
  },
]

export function CategoriesSection() {
  const handleCategoryClick = (categoryId: string) => {
    // TODO: Navigate to category page or filter coins
    console.log('Category clicked:', categoryId)
  }

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

      {/* Grid Layout - 3 columns top, 2 columns bottom */}
      <div className="space-y-2">
        {/* First Row - 3 items */}
        <div className="grid grid-cols-3 gap-2">
          {categories.slice(0, 3).map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              index={index}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
        </div>

        {/* Second Row - 2 items */}
        <div className="grid grid-cols-2 gap-2">
          {categories.slice(3, 5).map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              index={index + 3}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

interface CategoryCardProps {
  category: Category
  index: number
  onClick: () => void
}

function CategoryCard({ category, index, onClick }: CategoryCardProps) {
  const Icon = category.icon

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: 0.25 + index * 0.05,
      }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="h-[72px] rounded-xl overflow-hidden relative group active:opacity-90"
      style={{
        background: `linear-gradient(135deg, ${category.gradientFrom} 0%, ${category.gradientTo} 100%)`,
      }}
    >
      {/* Content Container */}
      <div className="relative h-full flex items-center justify-center gap-2 px-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Icon size={18} className="text-white" strokeWidth={2.5} />
        </div>

        {/* Category Name */}
        <h3 className="text-body font-semibold text-white">
          {category.name}
        </h3>
      </div>

      {/* Hover/Active Overlay */}
      <div
        className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200"
        aria-hidden="true"
      />
    </motion.button>
  )
}
