import { useEffect } from 'react'

function assertIsNode(e: EventTarget | null): asserts e is Node {
  if (!e || !('nodeType' in e)) {
    throw new Error(`Node expected`)
  }
}

export function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: VoidFunction
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      assertIsNode(event.target)
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }
      handler()
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
