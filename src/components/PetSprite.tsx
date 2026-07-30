import type { ComponentPropsWithoutRef } from 'react'
import { usePetFace } from '../hooks/usePetFace'
import { faceBackgroundImage, type FaceFrame } from '../lib/petAssets'
import type { FaceMood } from '../lib/petQuotes'

/**
 * An animating face. Each layer is its own <img>, keyed by depth, so changing
 * a pose swaps one element's `src` while the others are left untouched.
 * Rewriting a multi-layer `background-image` instead makes the browser
 * re-resolve every layer on each frame, which reads as a flicker.
 *
 * Sizing and positioning come from `className`, which must establish a
 * containing block (the layers are absolutely positioned).
 */
export function PetSprite({
  frame,
  alt,
  className,
}: {
  frame: FaceFrame
  alt: string
  className?: string
}) {
  return (
    <div className={className} role="img" aria-label={alt}>
      {frame.layers.map((src, depth) => (
        <img
          key={depth}
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ))}
    </div>
  )
}

/**
 * A pet's resting face, painted as stacked backgrounds on a single element so
 * it drops into markup wherever a plain <img> used to sit — same classes,
 * inline styles, and handlers. Static only; use `PetSprite` to animate.
 */
export function PetFace({
  species,
  mood = 'neutral',
  alt,
  style,
  ...rest
}: Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  species: string
  mood?: FaceMood
  alt?: string
}) {
  const face = usePetFace({ species, mood })

  return (
    <div
      {...rest}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{
        backgroundImage: faceBackgroundImage(face.idle),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        ...style,
      }}
    />
  )
}
