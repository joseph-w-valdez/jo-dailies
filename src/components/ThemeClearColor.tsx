import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'

/** Keep the WebGL clear color in sync with the active theme. */
export function ThemeClearColor({ color }: { color: string }) {
  const { gl } = useThree()
  useLayoutEffect(() => {
    gl.setClearColor(color)
  }, [gl, color])
  return null
}
