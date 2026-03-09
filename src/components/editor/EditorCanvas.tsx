'use client'

// Step 345 — Fabric.js canvas with zone overlay + imperative handle

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type { PlacementZone } from '@/lib/placementZones'

export interface EditorCanvasHandle {
  addImage: (url: string) => Promise<void>
  removeSelected: () => void
  clearDesigns: () => void
  fitSelected: (zone: PlacementZone) => void
  hasSelection: () => boolean
}

interface Props {
  mockupUrl: string | null
  zone: PlacementZone | null
  canvasSize?: number
}

const CANVAS_SIZE = 560

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricObject = any

const EditorCanvas = forwardRef<EditorCanvasHandle, Props>(
  function EditorCanvas({ mockupUrl, zone, canvasSize = CANVAS_SIZE }, ref) {
    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<FabricCanvas | null>(null)
    const sizeRef = useRef(canvasSize)

    // Boot Fabric canvas once
    useEffect(() => {
      if (!canvasElRef.current || fabricRef.current) return
      const el = canvasElRef.current

      import('fabric').then((fab) => {
        const canvas = new fab.Canvas(el, {
          width: sizeRef.current,
          height: sizeRef.current,
          backgroundColor: '#f3f4f6',
          preserveObjectStacking: true,
        })
        fabricRef.current = canvas
      })

      return () => {
        fabricRef.current?.dispose()
        fabricRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Update mockup background whenever mockupUrl changes
    useEffect(() => {
      const canvas: FabricCanvas = fabricRef.current
      if (!canvas) return
      const sz = sizeRef.current

      if (!mockupUrl) {
        canvas.backgroundImage = null
        canvas.renderAll()
        return
      }

      import('fabric').then((fab) => {
        fab.FabricImage.fromURL(mockupUrl, { crossOrigin: 'anonymous' }).then(
          (img: FabricObject) => {
            img.set({
              left: 0,
              top: 0,
              scaleX: sz / (img.width ?? sz),
              scaleY: sz / (img.height ?? sz),
              selectable: false,
              evented: false,
            })
            canvas.backgroundImage = img
            canvas.renderAll()
          },
        )
      })
    }, [mockupUrl])

    // Redraw zone overlay whenever zone changes
    useEffect(() => {
      const canvas: FabricCanvas = fabricRef.current
      if (!canvas) return
      const sz = sizeRef.current

      // Remove old zone rects
      const old = canvas.getObjects().filter((o: FabricObject) => o.__isZone)
      old.forEach((o: FabricObject) => canvas.remove(o))

      if (!zone) {
        canvas.renderAll()
        return
      }

      import('fabric').then((fab) => {
        const rect = new fab.Rect({
          left: zone.x * sz,
          top: zone.y * sz,
          width: zone.w * sz,
          height: zone.h * sz,
          fill: 'rgba(99,102,241,0.07)',
          stroke: 'rgba(99,102,241,0.65)',
          strokeWidth: 1.5,
          strokeDashArray: [6, 3],
          selectable: false,
          evented: false,
          shadow: undefined,
        })
        // Tag it so we can find it later
        ;(rect as FabricObject).__isZone = true
        canvas.add(rect)
        canvas.sendObjectToBack(rect)
        canvas.renderAll()
      })
    }, [zone])

    useImperativeHandle(ref, () => ({
      async addImage(url: string) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const fab = await import('fabric')
        const img: FabricObject = await fab.FabricImage.fromURL(url, {
          crossOrigin: 'anonymous',
        })
        const sz = sizeRef.current
        const maxSide = sz * 0.5
        const scale = Math.min(maxSide / (img.width ?? 1), maxSide / (img.height ?? 1))
        img.set({ left: sz * 0.25, top: sz * 0.25, scaleX: scale, scaleY: scale })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
      },

      removeSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const active = canvas.getActiveObjects()
        active.forEach((o: FabricObject) => canvas.remove(o))
        canvas.discardActiveObject()
        canvas.renderAll()
      },

      clearDesigns() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const designs = canvas.getObjects().filter((o: FabricObject) => !o.__isZone)
        designs.forEach((o: FabricObject) => canvas.remove(o))
        canvas.discardActiveObject()
        canvas.renderAll()
      },

      fitSelected(z: PlacementZone) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj) return
        const sz = sizeRef.current
        const zw = z.w * sz
        const zh = z.h * sz
        const scale = Math.min(zw / (obj.width ?? 1), zh / (obj.height ?? 1))
        obj.set({
          scaleX: scale,
          scaleY: scale,
          left: z.x * sz + (zw - (obj.width ?? 0) * scale) / 2,
          top: z.y * sz + (zh - (obj.height ?? 0) * scale) / 2,
        })
        canvas.renderAll()
      },

      hasSelection() {
        const canvas: FabricCanvas = fabricRef.current
        return (canvas?.getActiveObjects()?.length ?? 0) > 0
      },
    }))

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner bg-gray-100 flex items-center justify-center">
        <canvas ref={canvasElRef} />
      </div>
    )
  },
)

export default EditorCanvas
