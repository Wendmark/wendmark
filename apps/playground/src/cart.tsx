import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { findCoffee, priceFor, type Grind, type SizeId } from './data'

/** A cart that lives in memory. Reloading the page empties it, like a demo should. */

export interface CartLine {
  key: string
  coffeeId: string
  size: SizeId
  grind: Grind
  quantity: number
}

interface CartValue {
  lines: CartLine[]
  count: number
  subtotal: number
  isOpen: boolean
  open: () => void
  close: () => void
  add: (coffeeId: string, size: SizeId, grind: Grind, quantity?: number) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [isOpen, setOpen] = useState(false)

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0)
    const subtotal = lines.reduce((sum, line) => {
      const coffee = findCoffee(line.coffeeId)
      return coffee ? sum + priceFor(coffee, line.size) * line.quantity : sum
    }, 0)

    return {
      lines,
      count,
      subtotal,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add: (coffeeId, size, grind, quantity = 1) => {
        const key = `${coffeeId}-${size}-${grind}`
        setLines((current) => {
          const existing = current.find((line) => line.key === key)
          if (existing) {
            return current.map((line) =>
              line.key === key ? { ...line, quantity: line.quantity + quantity } : line,
            )
          }
          return [...current, { key, coffeeId, size, grind, quantity }]
        })
      },
      setQuantity: (key, quantity) => {
        setLines((current) =>
          quantity <= 0
            ? current.filter((line) => line.key !== key)
            : current.map((line) => (line.key === key ? { ...line, quantity } : line)),
        )
      },
      remove: (key) => setLines((current) => current.filter((line) => line.key !== key)),
      clear: () => setLines([]),
    }
  }, [lines, isOpen])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart must be used inside <CartProvider>')
  return cart
}
