'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface CartItem {
  id: string
  product: { name: string; imageUrl: string | null }
  variant: { name: string } | null
  design: { id: string; preview: string | null } | null
  width: number
  height: number
  quantity: number
  priceSnapshot: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  total: number
  isOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  refresh: () => void
  removeItem: (id: string) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/cart')
      if (!res.ok) return
      const data = await res.json()
      setItems(data?.items ?? [])
    } catch {
      // silently fail — cart is non-critical
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const removeItem = useCallback(async (id: string) => {
    try {
      await fetch(`/api/cart/item/${id}`, { method: 'DELETE' })
      await refresh()
    } catch {
      // ignore
    }
  }, [refresh])

  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0)

  return (
    <CartContext.Provider value={{
      items,
      count,
      total,
      isOpen,
      openDrawer: () => setIsOpen(true),
      closeDrawer: () => setIsOpen(false),
      refresh,
      removeItem,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
