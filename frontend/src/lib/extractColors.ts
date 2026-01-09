/**
 * Extract dominant colors from an image using canvas
 */

interface RGB {
  r: number
  g: number
  b: number
}

/**
 * Extract dominant colors from an image URL
 * @param imageUrl - URL of the image to analyze
 * @param colorCount - Number of colors to extract (default: 2)
 * @returns Promise with array of hex color strings
 */
export async function extractColors(imageUrl: string, colorCount = 2): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          resolve(getDefaultColors())
          return
        }

        // Use small size for performance
        const size = 50
        canvas.width = size
        canvas.height = size

        ctx.drawImage(img, 0, 0, size, size)

        const imageData = ctx.getImageData(0, 0, size, size)
        const pixels = imageData.data

        // Collect all pixels
        const colorMap = new Map<string, { color: RGB; count: number }>()

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i] ?? 0
          const g = pixels[i + 1] ?? 0
          const b = pixels[i + 2] ?? 0
          const a = pixels[i + 3] ?? 0

          // Skip transparent pixels
          if (a < 128) continue

          // Skip very dark or very light pixels
          const brightness = (r + g + b) / 3
          if (brightness < 30 || brightness > 225) continue

          // Quantize colors to reduce variations (group similar colors)
          const qr = Math.round(r / 32) * 32
          const qg = Math.round(g / 32) * 32
          const qb = Math.round(b / 32) * 32

          const key = `${qr},${qg},${qb}`
          const existing = colorMap.get(key)

          if (existing) {
            existing.count++
          } else {
            colorMap.set(key, { color: { r: qr, g: qg, b: qb }, count: 1 })
          }
        }

        // Sort by frequency and get top colors
        const sortedColors = Array.from(colorMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, colorCount)
          .map(({ color }) => rgbToHex(color))

        if (sortedColors.length < colorCount) {
          // Fill with defaults if not enough colors found
          while (sortedColors.length < colorCount) {
            sortedColors.push(sortedColors[0] || '#3b82f6')
          }
        }

        resolve(sortedColors)
      } catch {
        resolve(getDefaultColors())
      }
    }

    img.onerror = () => {
      resolve(getDefaultColors())
    }

    img.src = imageUrl
  })
}

function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function getDefaultColors(): string[] {
  return ['#3b82f6', '#8b5cf6'] // Blue to purple fallback
}
