import { motion } from 'framer-motion'
import { Landmark, Layers, Dog, Gamepad2, Brain } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CategoryId = 'defi' | 'layer1' | 'meme' | 'gaming' | 'ai'

interface Category {
  id: CategoryId
  name: string
  icon: LucideIcon
  gradientFrom: string
  gradientTo: string
  // Coin symbols in this category
  symbols: string[]
}

export const categories: Category[] = [
  {
    id: 'defi',
    name: 'DeFi',
    icon: Landmark,
    gradientFrom: '#667eea',
    gradientTo: '#764ba2',
    symbols: ['UNI', 'AAVE', 'CAKE', 'SUSHI', 'CRV', 'COMP', 'MKR', 'SNX', 'YFI', 'LDO', 'DYDX', 'GMX', '1INCH', 'BAL', 'RUNE', 'INJ', 'PENDLE', 'JUP', 'RAY', 'ORCA'],
  },
  {
    id: 'layer1',
    name: 'Layer 1',
    icon: Layers,
    gradientFrom: '#06b6d4',
    gradientTo: '#0891b2',
    symbols: ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'ATOM', 'FTM', 'ALGO', 'HBAR', 'ICP', 'APT', 'SUI', 'SEI', 'TIA', 'INJ', 'KAS', 'TON', 'TRX'],
  },
  {
    id: 'meme',
    name: 'Meme',
    icon: Dog,
    gradientFrom: '#f97316',
    gradientTo: '#facc15',
    symbols: ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'ELON', 'BABYDOGE', 'SNEK', 'MYRO', 'BOME', 'BRETT', 'MOG', 'POPCAT', 'NEIRO', 'TURBO', 'LADYS', 'WOJAK', 'MONG'],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: Gamepad2,
    gradientFrom: '#ec4899',
    gradientTo: '#8b5cf6',
    symbols: ['AXS', 'SAND', 'MANA', 'GALA', 'ENJ', 'IMX', 'ILV', 'GODS', 'ALICE', 'YGG', 'MAGIC', 'PRIME', 'PIXEL', 'PORTAL', 'BEAM', 'RONIN', 'SUPER', 'PYR', 'WEMIX', 'GMT'],
  },
  {
    id: 'ai',
    name: 'AI',
    icon: Brain,
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    symbols: ['FET', 'AGIX', 'OCEAN', 'RNDR', 'TAO', 'ARKM', 'WLD', 'AI', 'NMR', 'CTXC', 'GRT', 'ORAI', 'AIOZ', 'PHB', 'RSS3', 'ALI', 'VIDT', 'NFP', 'IO', 'ATH'],
  },
]

interface CategoriesSectionProps {
  selectedCategory: CategoryId
  onSelectCategory: (category: CategoryId) => void
}

export function CategoriesSection({ selectedCategory, onSelectCategory }: CategoriesSectionProps) {
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
              isSelected={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
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
              isSelected={selectedCategory === category.id}
              onClick={() => onSelectCategory(category.id)}
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
  isSelected: boolean
  onClick: () => void
}

function CategoryCard({ category, index, isSelected, onClick }: CategoryCardProps) {
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
      className={cn(
        'h-[72px] rounded-xl overflow-hidden relative group active:opacity-90 transition-all duration-200',
        isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-[#1C1C1E]'
      )}
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${category.gradientFrom} 0%, ${category.gradientTo} 100%)`
          : `linear-gradient(135deg, ${category.gradientFrom}80 0%, ${category.gradientTo}80 100%)`,
        opacity: isSelected ? 1 : 0.7,
      }}
    >
      {/* Content Container */}
      <div className="relative h-full flex items-center justify-center gap-2 px-3">
        {/* Icon */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isSelected ? 'bg-white/30' : 'bg-white/20'
        )}>
          <Icon size={18} className="text-white" strokeWidth={2.5} />
        </div>

        {/* Category Name */}
        <h3 className="text-body font-semibold text-white">
          {category.name}
        </h3>
      </div>

      {/* Active indicator */}
      {isSelected && (
        <motion.div
          layoutId="categoryIndicator"
          className="absolute inset-0 border-2 border-white/30 rounded-xl"
          initial={false}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.button>
  )
}
