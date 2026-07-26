export const MAX_FURNITURE = 19

export type FurnitureCategory =
  | 'beds'
  | 'climbing'
  | 'houses'
  | 'scratching'
  | 'toys'
  | 'decor'
  | 'care'

export const FURNITURE_CATEGORIES: readonly {
  id: FurnitureCategory | 'all'
  label: string
}[] = [
  { id: 'all', label: 'All' },
  { id: 'beds', label: 'Beds' },
  { id: 'climbing', label: 'Climbing' },
  { id: 'houses', label: 'Houses' },
  { id: 'scratching', label: 'Scratching' },
  { id: 'toys', label: 'Toys' },
  { id: 'decor', label: 'Decor' },
  { id: 'care', label: 'Care' },
] as const

export interface FurnitureAsset {
  id: string
  label: string
  src: string
  category: FurnitureCategory
  /** Default width as % of the room */
  width: number
}

export interface PlacedFurniture {
  id: string
  assetId: string
  flipped: boolean
  /** Rotation in degrees (0-360) */
  rotation: number
  /** Size multiplier applied to the asset's default width */
  scale: number
  /** Left edge as % of room width */
  x: number
  /** Top edge as % of room height */
  y: number
}

export const MIN_FURNITURE_SCALE = 0.4
export const MAX_FURNITURE_SCALE = 2.5

export function normalizeRotation(value: number): number {
  return ((value % 360) + 360) % 360
}

export const FURNITURE_ASSETS: readonly FurnitureAsset[] = [
  {
    id: 'cat-tree',
    label: 'Cat tree',
    src: '/furniture/cat-tree.png',
    category: 'climbing',
    width: 28,
  },
  {
    id: 'donut-bed',
    label: 'Donut bed',
    src: '/furniture/donut-bed.png',
    category: 'beds',
    width: 24,
  },
  {
    id: 'tufted-cushion',
    label: 'Tufted cushion',
    src: '/furniture/tufted-cushion.png',
    category: 'beds',
    width: 26,
  },
  {
    id: 'heated-mat',
    label: 'Heated mat',
    src: '/furniture/heated-mat.png',
    category: 'beds',
    width: 28,
  },
  {
    id: 'teepee',
    label: 'Teepee',
    src: '/furniture/teepee.png',
    category: 'houses',
    width: 22,
  },
  {
    id: 'condo',
    label: 'Condo',
    src: '/furniture/condo.png',
    category: 'houses',
    width: 30,
  },
  {
    id: 'rolling-bed',
    label: 'Rolling bed',
    src: '/furniture/rolling-bed.png',
    category: 'beds',
    width: 30,
  },
  {
    id: 'radiator-hammock',
    label: 'Radiator hammock',
    src: '/furniture/radiator-hammock.png',
    category: 'beds',
    width: 26,
  },
  {
    id: 'pet-armchair',
    label: 'Pet armchair',
    src: '/furniture/pet-armchair.png',
    category: 'beds',
    width: 26,
  },
  {
    id: 'basket-trunk',
    label: 'Basket trunk',
    src: '/furniture/basket-trunk.png',
    category: 'beds',
    width: 26,
  },
  {
    id: 'feeding-station',
    label: 'Feeding station',
    src: '/furniture/feeding-station.png',
    category: 'care',
    width: 24,
  },
  {
    id: 'rope-bridge',
    label: 'Rope bridge',
    src: '/furniture/rope-bridge.png',
    category: 'climbing',
    width: 38,
  },
  {
    id: 'scratch-post',
    label: 'Scratching post',
    src: '/furniture/scratch-post.png',
    category: 'scratching',
    width: 14,
  },
  {
    id: 'triangle-condo',
    label: 'Triangle condo',
    src: '/furniture/triangle-condo.png',
    category: 'houses',
    width: 24,
  },
  {
    id: 'bookshelf',
    label: 'Bookshelf',
    src: '/furniture/bookshelf.png',
    category: 'houses',
    width: 24,
  },
  {
    id: 'wall-climb',
    label: 'Wall climb',
    src: '/furniture/wall-climb.png',
    category: 'climbing',
    width: 34,
  },
  {
    id: 'cat-wheel',
    label: 'Cat wheel',
    src: '/furniture/cat-wheel.png',
    category: 'climbing',
    width: 30,
  },
  {
    id: 'litter-cabinet',
    label: 'Litter cabinet',
    src: '/furniture/litter-cabinet.png',
    category: 'care',
    width: 26,
  },
  {
    id: 'water-fountain',
    label: 'Water fountain',
    src: '/furniture/water-fountain.png',
    category: 'care',
    width: 22,
  },
  {
    id: 'feather-teaser',
    label: 'Feather teaser',
    src: '/furniture/feather-teaser.png',
    category: 'toys',
    width: 16,
  },
  {
    id: 'yarn-basket',
    label: 'Yarn basket',
    src: '/furniture/yarn-basket.png',
    category: 'toys',
    width: 22,
  },
  {
    id: 'mouse-box',
    label: 'Mouse box',
    src: '/furniture/mouse-box.png',
    category: 'toys',
    width: 26,
  },
  {
    id: 'paw-rug',
    label: 'Paw rug',
    src: '/furniture/paw-rug.png',
    category: 'decor',
    width: 28,
  },
  {
    id: 'hang-in-there',
    label: 'Hang in there',
    src: '/furniture/hang-in-there.png',
    category: 'decor',
    width: 18,
  },
] as const

export function furnitureByCategory(
  category: FurnitureCategory | 'all',
): readonly FurnitureAsset[] {
  if (category === 'all') return FURNITURE_ASSETS
  return FURNITURE_ASSETS.filter((asset) => asset.category === category)
}

export function getFurnitureAsset(assetId: string): FurnitureAsset | undefined {
  return FURNITURE_ASSETS.find((asset) => asset.id === assetId)
}

export function isFurnitureAssetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    FURNITURE_ASSETS.some((asset) => asset.id === value)
  )
}

function createFurnitureId(): string {
  return `furn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function normalizeFurniture(raw: unknown): PlacedFurniture | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Record<string, unknown>
  if (!isFurnitureAssetId(f.assetId)) return null
  const asset = getFurnitureAsset(f.assetId)!
  const width = asset.width
  const x =
    typeof f.x === 'number' && Number.isFinite(f.x)
      ? clamp(f.x, 0, 100 - width)
      : 50 - width / 2
  const y =
    typeof f.y === 'number' && Number.isFinite(f.y)
      ? clamp(f.y, 0, 100 - width)
      : 55
  return {
    id: typeof f.id === 'string' && f.id ? f.id : createFurnitureId(),
    assetId: f.assetId,
    flipped: f.flipped === true,
    rotation:
      typeof f.rotation === 'number' && Number.isFinite(f.rotation)
        ? normalizeRotation(f.rotation)
        : 0,
    scale:
      typeof f.scale === 'number' && Number.isFinite(f.scale)
        ? clamp(f.scale, MIN_FURNITURE_SCALE, MAX_FURNITURE_SCALE)
        : 1,
    x,
    y,
  }
}

export function normalizeFurnitureList(raw: unknown): PlacedFurniture[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => normalizeFurniture(entry))
    .filter((entry): entry is PlacedFurniture => entry != null)
    .slice(0, MAX_FURNITURE)
}

export function addFurniture(
  list: PlacedFurniture[],
  assetId: string,
): PlacedFurniture[] {
  if (list.length >= MAX_FURNITURE) return list
  if (!isFurnitureAssetId(assetId)) return list
  const asset = getFurnitureAsset(assetId)!
  const offset = (list.length % 5) * 4
  return [
    ...list,
    {
      id: createFurnitureId(),
      assetId,
      flipped: false,
      rotation: 0,
      scale: 1,
      x: clamp(12 + offset, 0, 100 - asset.width),
      y: clamp(48 + (list.length % 3) * 6, 0, 100 - asset.width),
    },
  ]
}

export function removeFurniture(
  list: PlacedFurniture[],
  furnitureId: string,
): PlacedFurniture[] {
  return list.filter((item) => item.id !== furnitureId)
}

export function flipFurniture(
  list: PlacedFurniture[],
  furnitureId: string,
): PlacedFurniture[] {
  return list.map((item) =>
    item.id === furnitureId ? { ...item, flipped: !item.flipped } : item,
  )
}

export function moveFurniture(
  list: PlacedFurniture[],
  furnitureId: string,
  x: number,
  y: number,
): PlacedFurniture[] {
  return list.map((item) => {
    if (item.id !== furnitureId) return item
    const asset = getFurnitureAsset(item.assetId)
    const width = (asset?.width ?? 28) * item.scale
    // Approximate height from square-ish assets; clamp using width as height proxy
    const height = width
    return {
      ...item,
      x: clamp(x, 0, Math.max(0, 100 - width)),
      y: clamp(y, 0, Math.max(0, 100 - height)),
    }
  })
}

export function transformFurniture(
  list: PlacedFurniture[],
  furnitureId: string,
  rotation: number,
  scale: number,
): PlacedFurniture[] {
  return list.map((item) => {
    if (item.id !== furnitureId) return item
    const asset = getFurnitureAsset(item.assetId)
    const nextScale = clamp(scale, MIN_FURNITURE_SCALE, MAX_FURNITURE_SCALE)
    const width = (asset?.width ?? 28) * nextScale
    return {
      ...item,
      rotation: normalizeRotation(rotation),
      scale: nextScale,
      x: clamp(item.x, 0, Math.max(0, 100 - width)),
      y: clamp(item.y, 0, Math.max(0, 100 - width)),
    }
  })
}

/** Clamp a drag position so the piece stays fully inside the room. */
export function clampFurniturePosition(
  assetId: string,
  x: number,
  y: number,
  roomWidthPx: number,
  roomHeightPx: number,
  pieceWidthPx: number,
  pieceHeightPx: number,
): { x: number; y: number } {
  const maxX = Math.max(0, ((roomWidthPx - pieceWidthPx) / roomWidthPx) * 100)
  const maxY = Math.max(0, ((roomHeightPx - pieceHeightPx) / roomHeightPx) * 100)
  void assetId
  return {
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
  }
}
