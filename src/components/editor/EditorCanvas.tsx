'use client'

// Steps 345, 361, 367, 368, 371–410 — Fabric.js canvas + text + shapes + image tools + layers + group

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type { PlacementZone } from '@/lib/placementZones'

// ---------------------------------------------------------------------------
// Text properties
// ---------------------------------------------------------------------------

export interface TextProps {
  text: string
  fontFamily: string
  fontSize: number
  fill: string
  stroke: string
  strokeWidth: number
  textAlign: 'left' | 'center' | 'right'
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  uppercase: boolean
}

export const DEFAULT_TEXT_PROPS: TextProps = {
  text: 'Your text',
  fontFamily: 'Arial',
  fontSize: 36,
  fill: '#000000',
  stroke: '',
  strokeWidth: 0,
  textAlign: 'center',
  fontWeight: 'normal',
  fontStyle: 'normal',
  uppercase: false,
}

// ---------------------------------------------------------------------------
// Shape properties
// ---------------------------------------------------------------------------

export interface ShapeProps {
  fill: string
  stroke: string
  strokeWidth: number
  locked: boolean
}

export const DEFAULT_SHAPE_PROPS: ShapeProps = {
  fill: '#000000',
  stroke: '',
  strokeWidth: 0,
  locked: false,
}

// ---------------------------------------------------------------------------
// Image properties
// ---------------------------------------------------------------------------

export interface ImageProps {
  angle: number
  opacity: number   // 0–100
  width: number
  height: number
  flipX: boolean
  flipY: boolean
  cropActive: boolean
}

export const DEFAULT_IMAGE_PROPS: ImageProps = {
  angle: 0,
  opacity: 100,
  width: 0,
  height: 0,
  flipX: false,
  flipY: false,
  cropActive: false,
}

// ---------------------------------------------------------------------------
// Layer info — exported so LayersPanel can import it
// ---------------------------------------------------------------------------

export interface LayerInfo {
  index: number       // actual index in non-zone objects array
  type: string
  label: string
  selected: boolean
  locked: boolean
}

export type SelectionType = 'text' | 'image' | 'shape' | 'group' | null

// ---------------------------------------------------------------------------
// Handle interface
// ---------------------------------------------------------------------------

export interface EditorCanvasHandle {
  addImage: (url: string) => Promise<void>
  removeSelected: () => void
  clearDesigns: () => void
  fitSelected: (zone: PlacementZone) => void
  hasSelection: () => boolean
  exportJSON: () => object | null
  exportDataURL: () => string | null
  loadFromJSON: (json: object) => Promise<void>
  // Text
  addText: (initialProps?: Partial<TextProps>) => void
  updateSelectedText: (props: Partial<TextProps>) => void
  getSelectedTextProps: () => TextProps | null
  // Objects
  duplicateSelected: () => void
  // Shapes
  addRect: (initialProps?: Partial<ShapeProps>) => void
  addCircle: (initialProps?: Partial<ShapeProps>) => void
  addTriangle: (initialProps?: Partial<ShapeProps>) => void
  addLine: (initialProps?: Partial<ShapeProps>) => void
  updateSelectedShape: (props: Partial<ShapeProps>) => void
  getSelectedShapeProps: () => ShapeProps | null
  // Layer order
  bringForward: () => void
  sendBackward: () => void
  // Image tools
  updateSelectedImage: (props: Partial<ImageProps>) => void
  getSelectedImageProps: () => ImageProps | null
  cropSelected: () => void
  centerInZone: () => void
  resetImage: () => void
  // Step 406 — layers
  selectObjectByIndex: (index: number) => void
  // Step 408 — group / ungroup
  groupSelected: () => void
  ungroupSelected: () => void
  // Step 409 — lock any object
  toggleLockSelected: () => void
  // Step 416 — replace selected image with new URL
  replaceSelectedImage: (url: string) => Promise<void>
  // Step 415 — load template JSON onto canvas
  loadTemplate: (json: object) => Promise<void>
  // Step 421 — set canvas background color
  setBackground: (color: string) => void
}

interface Props {
  mockupUrl: string | null
  zone: PlacementZone | null
  printWidthCm?: number | null
  printHeightCm?: number | null
  onSelectionChange?: (
    type: SelectionType,
    textProps?: TextProps,
    shapeProps?: ShapeProps,
    imageProps?: ImageProps,
  ) => void
  onLayersChange?: (layers: LayerInfo[]) => void
  onReady?: () => void
}

const CANVAS_SIZE = 560

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricObject = any

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTextObj(obj: FabricObject): boolean {
  return obj?.type === 'textbox' || obj?.type === 'text' || obj?.type === 'i-text'
}

function isShapeObj(obj: FabricObject): boolean {
  return (
    obj?.type === 'rect' ||
    obj?.type === 'circle' ||
    obj?.type === 'triangle' ||
    obj?.type === 'line'
  )
}

function isImageObj(obj: FabricObject): boolean {
  return obj?.type === 'image'
}

function getLabelForObj(obj: FabricObject, i: number): string {
  if (isTextObj(obj)) {
    const t = (obj.text ?? '').slice(0, 14)
    return `"${t}${(obj.text ?? '').length > 14 ? '…' : ''}"`
  }
  if (isImageObj(obj)) return `Image ${i + 1}`
  if (obj?.type === 'rect') return 'Rectangle'
  if (obj?.type === 'circle') return 'Circle'
  if (obj?.type === 'triangle') return 'Triangle'
  if (obj?.type === 'line') return 'Line'
  if (obj?.type === 'group') return `Group`
  return `Object ${i + 1}`
}

function getTextPropsFromObj(obj: FabricObject): TextProps {
  return {
    text: obj.text ?? '',
    fontFamily: obj.fontFamily ?? 'Arial',
    fontSize: typeof obj.fontSize === 'number' ? obj.fontSize : 36,
    fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
    stroke: typeof obj.stroke === 'string' ? obj.stroke : '',
    strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0,
    textAlign: (['left', 'center', 'right'].includes(obj.textAlign)
      ? obj.textAlign
      : 'left') as TextProps['textAlign'],
    fontWeight: obj.fontWeight === 'bold' ? 'bold' : 'normal',
    fontStyle: obj.fontStyle === 'italic' ? 'italic' : 'normal',
    uppercase: obj.__uppercase === true,
  }
}

function getShapePropsFromObj(obj: FabricObject): ShapeProps {
  return {
    fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
    stroke: typeof obj.stroke === 'string' ? obj.stroke : '',
    strokeWidth: typeof obj.strokeWidth === 'number' ? obj.strokeWidth : 0,
    locked: obj.__locked === true,
  }
}

function getImagePropsFromObj(obj: FabricObject): ImageProps {
  return {
    angle: Math.round(obj.angle ?? 0),
    opacity: Math.round((obj.opacity ?? 1) * 100),
    width: Math.round((obj.width ?? 0) * Math.abs(obj.scaleX ?? 1)),
    height: Math.round((obj.height ?? 0) * Math.abs(obj.scaleY ?? 1)),
    flipX: obj.flipX === true,
    flipY: obj.flipY === true,
    cropActive: !!obj.clipPath,
  }
}

function applyLock(obj: FabricObject, locked: boolean) {
  obj.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EditorCanvas = forwardRef<EditorCanvasHandle, Props>(
  function EditorCanvas(
    { mockupUrl, zone, printWidthCm, printHeightCm, onSelectionChange, onLayersChange, onReady },
    ref,
  ) {
    // Compute canvas pixel dimensions from print aspect ratio
    const printRatio =
      printWidthCm && printHeightCm && printWidthCm > 0 && printHeightCm > 0
        ? printWidthCm / printHeightCm
        : 1
    const szW = printRatio >= 1 ? CANVAS_SIZE : Math.round(CANVAS_SIZE * printRatio)
    const szH = printRatio <= 1 ? CANVAS_SIZE : Math.round(CANVAS_SIZE / printRatio)

    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<FabricCanvas | null>(null)
    const sizeWRef = useRef(szW)
    const sizeHRef = useRef(szH)
    const zoneRef = useRef<PlacementZone | null>(zone)
    const onSelectionChangeRef = useRef(onSelectionChange)
    const onLayersChangeRef = useRef(onLayersChange)
    const onReadyRef = useRef(onReady)
    // Stored function to build + fire layers list — accessible in useImperativeHandle
    const fireLayersRef = useRef<(() => void) | null>(null)

    useEffect(() => { zoneRef.current = zone }, [zone])
    useEffect(() => { onSelectionChangeRef.current = onSelectionChange }, [onSelectionChange])
    useEffect(() => { onLayersChangeRef.current = onLayersChange }, [onLayersChange])
    useEffect(() => { onReadyRef.current = onReady }, [onReady])

    // Boot Fabric canvas once
    useEffect(() => {
      if (!canvasElRef.current || fabricRef.current) return
      const el = canvasElRef.current
      const szW = sizeWRef.current
      const szH = sizeHRef.current

      import('fabric').then((fab) => {
        const canvas = new fab.Canvas(el, {
          width: szW,
          height: szH,
          backgroundColor: '#f3f4f6',
          preserveObjectStacking: true,
        })
        fabricRef.current = canvas
        onReadyRef.current?.()

        // ── Layers helper stored in ref for use in handle methods ─────────────
        const fireLayers = () => {
          if (!onLayersChangeRef.current) return
          const objs = canvas.getObjects().filter((o: FabricObject) => !o.__isZone)
          const activeSet = new Set<FabricObject>(canvas.getActiveObjects() ?? [])
          const list: LayerInfo[] = objs
            .map((obj: FabricObject, i: number) => ({
              index: i,
              type: obj.type ?? 'unknown',
              label: getLabelForObj(obj, i),
              selected: activeSet.has(obj),
              locked: obj.__locked === true,
            }))
            .reverse()
          onLayersChangeRef.current(list)
        }
        fireLayersRef.current = fireLayers

        // ── Zone clamping on move — clamp to safe zone ────────────────────────
        canvas.on('object:moving', ({ target }: FabricObject) => {
          if (!target || target.__isZone || !zoneRef.current) return
          const z = zoneRef.current
          const SAFE = 8
          const objW = (target.width ?? 0) * Math.abs(target.scaleX ?? 1)
          const objH = (target.height ?? 0) * Math.abs(target.scaleY ?? 1)
          const zL = z.x * szW + SAFE, zT = z.y * szH + SAFE
          const zR = (z.x + z.w) * szW - SAFE, zB = (z.y + z.h) * szH - SAFE
          if (target.left < zL) target.set('left', zL)
          if (target.top < zT) target.set('top', zT)
          if (target.left + objW > zR) target.set('left', zR - objW)
          if (target.top + objH > zB) target.set('top', zB - objH)
        })

        canvas.on('object:scaling', ({ target }: FabricObject) => {
          if (!target || target.__isZone || !zoneRef.current) return
          const z = zoneRef.current
          const SAFE = 8
          const maxW = z.w * szW - SAFE * 2, maxH = z.h * szH - SAFE * 2
          const w = target.width ?? 1, h = target.height ?? 1
          if (w * Math.abs(target.scaleX ?? 1) > maxW) target.scaleX = maxW / w
          if (h * Math.abs(target.scaleY ?? 1) > maxH) target.scaleY = maxH / h
        })

        // ── Selection tracking ────────────────────────────────────────────────
        const fireSelection = (selected: FabricObject[] | undefined) => {
          const obj = selected?.[0]
          if (!obj) {
            onSelectionChangeRef.current?.(null)
          } else if (isTextObj(obj)) {
            onSelectionChangeRef.current?.('text', getTextPropsFromObj(obj), undefined, undefined)
          } else if (isShapeObj(obj)) {
            onSelectionChangeRef.current?.('shape', undefined, getShapePropsFromObj(obj), undefined)
          } else if (isImageObj(obj)) {
            onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
          } else if (obj.type === 'group') {
            onSelectionChangeRef.current?.('group')
          } else {
            onSelectionChangeRef.current?.('image')
          }
        }

        canvas.on('selection:created', ({ selected }: FabricObject) => { fireSelection(selected); fireLayers() })
        canvas.on('selection:updated', ({ selected }: FabricObject) => { fireSelection(selected); fireLayers() })
        canvas.on('selection:cleared', () => { onSelectionChangeRef.current?.(null); fireLayers() })
        canvas.on('object:added', () => fireLayers())
        canvas.on('object:removed', () => fireLayers())
        canvas.on('text:changed', ({ target }: FabricObject) => {
          if (target) onSelectionChangeRef.current?.('text', getTextPropsFromObj(target), undefined, undefined)
        })
        canvas.on('object:modified', ({ target }: FabricObject) => {
          if (!target) return
          if (isImageObj(target)) {
            onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(target))
          } else if (isShapeObj(target)) {
            onSelectionChangeRef.current?.('shape', undefined, getShapePropsFromObj(target), undefined)
          }
          fireLayers()
        })

        // ── Initial zone overlay: bleed / cut / safe ─────────────────────────
        const initialZone = zoneRef.current
        if (initialZone) {
          const BLEED = 5, SAFE = 8
          const z = initialZone
          // Bleed (outer) — gray dashed
          const bleedRect = new fab.Rect({
            left: z.x * szW - BLEED, top: z.y * szH - BLEED,
            width: z.w * szW + BLEED * 2, height: z.h * szH + BLEED * 2,
            fill: 'transparent', stroke: 'rgba(156,163,175,0.7)',
            strokeWidth: 1, strokeDashArray: [4, 4],
            selectable: false, evented: false,
          })
          ;(bleedRect as FabricObject).__isZone = true
          // Cut line — red dashed
          const cutRect = new fab.Rect({
            left: z.x * szW, top: z.y * szH,
            width: z.w * szW, height: z.h * szH,
            fill: 'rgba(239,68,68,0.04)', stroke: 'rgba(239,68,68,0.85)',
            strokeWidth: 1.5, strokeDashArray: [6, 3],
            selectable: false, evented: false,
          })
          ;(cutRect as FabricObject).__isZone = true
          // Safe zone (inner) — green dashed
          const safeRect = new fab.Rect({
            left: z.x * szW + SAFE, top: z.y * szH + SAFE,
            width: z.w * szW - SAFE * 2, height: z.h * szH - SAFE * 2,
            fill: 'transparent', stroke: 'rgba(34,197,94,0.8)',
            strokeWidth: 1, strokeDashArray: [4, 4],
            selectable: false, evented: false,
          })
          ;(safeRect as FabricObject).__isZone = true
          canvas.add(bleedRect)
          canvas.add(cutRect)
          canvas.add(safeRect)
          canvas.sendObjectToBack(safeRect)
          canvas.sendObjectToBack(cutRect)
          canvas.sendObjectToBack(bleedRect)
          canvas.renderAll()
        }
      })

      return () => {
        fabricRef.current?.dispose()
        fabricRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Mockup background
    useEffect(() => {
      const canvas: FabricCanvas = fabricRef.current
      if (!canvas) return
      const szW = sizeWRef.current
      const szH = sizeHRef.current
      if (!mockupUrl) { canvas.backgroundImage = null; canvas.renderAll(); return }
      import('fabric').then((fab) => {
        fab.FabricImage.fromURL(mockupUrl, { crossOrigin: 'anonymous' }).then((img: FabricObject) => {
          img.set({
            left: 0, top: 0,
            scaleX: szW / (img.width ?? szW),
            scaleY: szH / (img.height ?? szH),
            selectable: false, evented: false,
          })
          canvas.backgroundImage = img
          canvas.renderAll()
        })
      })
    }, [mockupUrl])

    // Zone overlay
    useEffect(() => {
      const canvas: FabricCanvas = fabricRef.current
      if (!canvas) return
      const szW = sizeWRef.current
      const szH = sizeHRef.current
      canvas.getObjects().filter((o: FabricObject) => o.__isZone).forEach((o: FabricObject) => canvas.remove(o))
      if (!zone) { canvas.renderAll(); return }
      import('fabric').then((fab) => {
        const BLEED = 5, SAFE = 8
        const z = zone
        const bleedRect = new fab.Rect({
          left: z.x * szW - BLEED, top: z.y * szH - BLEED,
          width: z.w * szW + BLEED * 2, height: z.h * szH + BLEED * 2,
          fill: 'transparent', stroke: 'rgba(156,163,175,0.7)',
          strokeWidth: 1, strokeDashArray: [4, 4],
          selectable: false, evented: false,
        })
        ;(bleedRect as FabricObject).__isZone = true
        const cutRect = new fab.Rect({
          left: z.x * szW, top: z.y * szH,
          width: z.w * szW, height: z.h * szH,
          fill: 'rgba(239,68,68,0.04)', stroke: 'rgba(239,68,68,0.85)',
          strokeWidth: 1.5, strokeDashArray: [6, 3],
          selectable: false, evented: false,
        })
        ;(cutRect as FabricObject).__isZone = true
        const safeRect = new fab.Rect({
          left: z.x * szW + SAFE, top: z.y * szH + SAFE,
          width: z.w * szW - SAFE * 2, height: z.h * szH - SAFE * 2,
          fill: 'transparent', stroke: 'rgba(34,197,94,0.8)',
          strokeWidth: 1, strokeDashArray: [4, 4],
          selectable: false, evented: false,
        })
        ;(safeRect as FabricObject).__isZone = true
        canvas.add(bleedRect)
        canvas.add(cutRect)
        canvas.add(safeRect)
        canvas.sendObjectToBack(safeRect)
        canvas.sendObjectToBack(cutRect)
        canvas.sendObjectToBack(bleedRect)
        canvas.renderAll()
      })
    }, [zone])

    useImperativeHandle(ref, () => ({
      // ── Image upload ──────────────────────────────────────────────────────
      async addImage(url: string) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const fab = await import('fabric')
        const img: FabricObject = await fab.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const maxSide = Math.min(szW, szH) * 0.5
        const scale = Math.min(maxSide / (img.width ?? 1), maxSide / (img.height ?? 1))
        img.set({ left: szW * 0.25, top: szH * 0.25, scaleX: scale, scaleY: scale })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
      },

      removeSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        canvas.getActiveObjects().forEach((o: FabricObject) => canvas.remove(o))
        canvas.discardActiveObject()
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      clearDesigns() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        canvas.getObjects().filter((o: FabricObject) => !o.__isZone).forEach((o: FabricObject) => canvas.remove(o))
        canvas.discardActiveObject()
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      fitSelected(z: PlacementZone) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj) return
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const zw = z.w * szW, zh = z.h * szH
        const scale = Math.min(zw / (obj.width ?? 1), zh / (obj.height ?? 1))
        obj.set({
          scaleX: scale, scaleY: scale,
          left: z.x * szW + (zw - (obj.width ?? 0) * scale) / 2,
          top: z.y * szH + (zh - (obj.height ?? 0) * scale) / 2,
        })
        canvas.renderAll()
        if (isImageObj(obj)) {
          onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
        }
      },

      hasSelection() {
        return (fabricRef.current?.getActiveObjects()?.length ?? 0) > 0
      },

      // ── Persistence ────────────────────────────────────────────────────────
      exportJSON() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return null
        return canvas.toJSON(['__isZone', '__uppercase', '__locked'])
      },

      exportDataURL() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return null
        return canvas.toDataURL({ format: 'png', multiplier: 1 })
      },

      async loadFromJSON(json: object) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        await canvas.loadFromJSON(json)
        canvas.getObjects().filter((o: FabricObject) => o.__isZone).forEach((z: FabricObject) => canvas.remove(z))
        canvas.getObjects().forEach((o: FabricObject) => { if (o.__locked) applyLock(o, true) })
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      // ── Text ───────────────────────────────────────────────────────────────
      addText(initialProps?: Partial<TextProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const z = zoneRef.current
        const p: TextProps = { ...DEFAULT_TEXT_PROPS, ...initialProps }
        const x = z ? z.x * szW + z.w * szW * 0.1 : szW * 0.1
        const y = z ? z.y * szH + z.h * szH * 0.35 : szH * 0.35
        const w = z ? z.w * szW * 0.8 : szW * 0.8
        import('fabric').then((fab) => {
          const displayText = p.uppercase ? p.text.toUpperCase() : p.text
          const textbox = new fab.Textbox(displayText, {
            left: x, top: y, width: w,
            fontFamily: p.fontFamily, fontSize: p.fontSize,
            fill: p.fill, stroke: p.stroke || '', strokeWidth: p.strokeWidth,
            textAlign: p.textAlign, fontWeight: p.fontWeight, fontStyle: p.fontStyle,
          })
          ;(textbox as FabricObject).__uppercase = p.uppercase
          canvas.add(textbox)
          canvas.setActiveObject(textbox)
          canvas.renderAll()
        })
      },

      updateSelectedText(props: Partial<TextProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isTextObj(obj)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {}
        if ('uppercase' in props && props.uppercase !== undefined) {
          obj.__uppercase = props.uppercase
          updates.text = props.uppercase ? (obj.text ?? '').toUpperCase() : (obj.text ?? '')
        }
        if ('text' in props && props.text !== undefined) {
          updates.text = obj.__uppercase ? props.text.toUpperCase() : props.text
        }
        if ('fontFamily' in props) updates.fontFamily = props.fontFamily
        if ('fontSize' in props) updates.fontSize = props.fontSize
        if ('fill' in props) updates.fill = props.fill
        if ('stroke' in props) updates.stroke = props.stroke
        if ('strokeWidth' in props) updates.strokeWidth = props.strokeWidth
        if ('textAlign' in props) updates.textAlign = props.textAlign
        if ('fontWeight' in props) updates.fontWeight = props.fontWeight
        if ('fontStyle' in props) updates.fontStyle = props.fontStyle
        obj.set(updates)
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      getSelectedTextProps(): TextProps | null {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return null
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isTextObj(obj)) return null
        return getTextPropsFromObj(obj)
      },

      // ── Duplicate ──────────────────────────────────────────────────────────
      duplicateSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || obj.__isZone) return
        obj.clone().then((cloned: FabricObject) => {
          cloned.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 })
          if (obj.__uppercase !== undefined) cloned.__uppercase = obj.__uppercase
          if (obj.__locked !== undefined) {
            cloned.__locked = obj.__locked
            if (obj.__locked) applyLock(cloned, true)
          }
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
          canvas.renderAll()
          fireLayersRef.current?.()
        })
      },

      // ── Shapes ────────────────────────────────────────────────────────────
      addRect(initialProps?: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const p = { ...DEFAULT_SHAPE_PROPS, ...initialProps }
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const z = zoneRef.current
        const cx = z ? (z.x + z.w / 2) * szW : szW / 2
        const cy = z ? (z.y + z.h / 2) * szH : szH / 2
        import('fabric').then((fab) => {
          const rect = new fab.Rect({ left: cx - 50, top: cy - 30, width: 100, height: 60, fill: p.fill, stroke: p.stroke || '', strokeWidth: p.strokeWidth })
          canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll()
        })
      },

      addCircle(initialProps?: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const p = { ...DEFAULT_SHAPE_PROPS, ...initialProps }
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const z = zoneRef.current
        const cx = z ? (z.x + z.w / 2) * szW : szW / 2
        const cy = z ? (z.y + z.h / 2) * szH : szH / 2
        import('fabric').then((fab) => {
          const circle = new fab.Circle({ left: cx - 40, top: cy - 40, radius: 40, fill: p.fill, stroke: p.stroke || '', strokeWidth: p.strokeWidth })
          canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll()
        })
      },

      addTriangle(initialProps?: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const p = { ...DEFAULT_SHAPE_PROPS, ...initialProps }
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const z = zoneRef.current
        const cx = z ? (z.x + z.w / 2) * szW : szW / 2
        const cy = z ? (z.y + z.h / 2) * szH : szH / 2
        import('fabric').then((fab) => {
          const tri = new fab.Triangle({ left: cx - 40, top: cy - 40, width: 80, height: 80, fill: p.fill, stroke: p.stroke || '', strokeWidth: p.strokeWidth })
          canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll()
        })
      },

      addLine(initialProps?: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const p = { ...DEFAULT_SHAPE_PROPS, ...initialProps }
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const z = zoneRef.current
        const cx = z ? (z.x + z.w / 2) * szW : szW / 2
        const cy = z ? (z.y + z.h / 2) * szH : szH / 2
        import('fabric').then((fab) => {
          const line = new fab.Line([cx - 50, cy, cx + 50, cy], { stroke: p.stroke || p.fill || '#000000', strokeWidth: Math.max(p.strokeWidth, 2), fill: '' })
          canvas.add(line); canvas.setActiveObject(line); canvas.renderAll()
        })
      },

      updateSelectedShape(props: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isShapeObj(obj)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {}
        if ('fill' in props) updates.fill = props.fill
        if ('stroke' in props) updates.stroke = props.stroke
        if ('strokeWidth' in props) updates.strokeWidth = props.strokeWidth
        if ('locked' in props && props.locked !== undefined) {
          obj.__locked = props.locked
          applyLock(obj, props.locked)
        }
        obj.set(updates)
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      getSelectedShapeProps(): ShapeProps | null {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return null
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isShapeObj(obj)) return null
        return getShapePropsFromObj(obj)
      },

      // ── Layer order ────────────────────────────────────────────────────────
      bringForward() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || obj.__isZone) return
        canvas.bringObjectToFront(obj)
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      sendBackward() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || obj.__isZone) return
        canvas.sendObjectToBack(obj)
        canvas.getObjects().filter((o: FabricObject) => o.__isZone).forEach((z: FabricObject) => canvas.sendObjectToBack(z))
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      // ── Image tools ────────────────────────────────────────────────────────
      updateSelectedImage(props: Partial<ImageProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isImageObj(obj)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {}
        if ('angle' in props) updates.angle = props.angle
        if ('opacity' in props) updates.opacity = (props.opacity ?? 100) / 100
        if ('flipX' in props) updates.flipX = props.flipX
        if ('flipY' in props) updates.flipY = props.flipY
        if ('width' in props && (props.width ?? 0) > 0) updates.scaleX = props.width! / (obj.width ?? 1)
        if ('height' in props && (props.height ?? 0) > 0) updates.scaleY = props.height! / (obj.height ?? 1)
        obj.set(updates)
        canvas.renderAll()
      },

      getSelectedImageProps(): ImageProps | null {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return null
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isImageObj(obj)) return null
        return getImagePropsFromObj(obj)
      },

      cropSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isImageObj(obj)) return
        import('fabric').then((fab) => {
          if (obj.clipPath) {
            obj.clipPath = undefined
          } else {
            const z = zoneRef.current
            const szW = sizeWRef.current
            const szH = sizeHRef.current
            const clip = z
              ? new fab.Rect({ left: z.x * szW, top: z.y * szH, width: z.w * szW, height: z.h * szH, absolutePositioned: true })
              : new fab.Rect({ left: obj.left ?? 0, top: obj.top ?? 0, width: (obj.width ?? 100) * Math.abs(obj.scaleX ?? 1), height: (obj.height ?? 100) * Math.abs(obj.scaleY ?? 1), absolutePositioned: true })
            obj.clipPath = clip
          }
          canvas.renderAll()
          onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
        })
      },

      centerInZone() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || obj.__isZone) return
        const z = zoneRef.current
        if (!z) return
        const szW = sizeWRef.current
        const szH = sizeHRef.current
        const objW = (obj.width ?? 0) * Math.abs(obj.scaleX ?? 1)
        const objH = (obj.height ?? 0) * Math.abs(obj.scaleY ?? 1)
        obj.set({ left: z.x * szW + (z.w * szW - objW) / 2, top: z.y * szH + (z.h * szH - objH) / 2 })
        canvas.renderAll()
        if (isImageObj(obj)) {
          onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
        }
      },

      resetImage() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isImageObj(obj)) return
        obj.set({ angle: 0, opacity: 1, scaleX: 1, scaleY: 1, flipX: false, flipY: false })
        obj.clipPath = undefined
        canvas.renderAll()
        onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
      },

      // ── Layers ─────────────────────────────────────────────────────────────
      // Step 406 — select object by its index in the non-zone objects array
      selectObjectByIndex(index: number) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const objs = canvas.getObjects().filter((o: FabricObject) => !o.__isZone)
        const obj = objs[index]
        if (!obj) return
        canvas.setActiveObject(obj)
        canvas.renderAll()
      },

      // ── Group / Ungroup ────────────────────────────────────────────────────
      // Step 408
      groupSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const active: FabricObject = canvas.getActiveObject()
        if (!active || active.type !== 'activeselection') return
        // toGroup() converts ActiveSelection → Group in Fabric.js
        const group = active.toGroup()
        canvas.setActiveObject(group)
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      ungroupSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const active: FabricObject = canvas.getActiveObject()
        if (!active || active.type !== 'group') return
        // toActiveSelection() decomposes Group → individual objects
        const sel = active.toActiveSelection()
        canvas.setActiveObject(sel)
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      // ── Replace selected image (step 416) ────────────────────────────────
      async replaceSelectedImage(url: string) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isImageObj(obj)) return
        const fab = await import('fabric')
        const newImg: FabricObject = await fab.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
        newImg.set({
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle,
          opacity: obj.opacity,
          flipX: obj.flipX,
          flipY: obj.flipY,
        })
        if (obj.clipPath) newImg.clipPath = obj.clipPath
        canvas.remove(obj)
        canvas.add(newImg)
        canvas.setActiveObject(newImg)
        canvas.renderAll()
        onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(newImg))
        fireLayersRef.current?.()
      },

      // ── Canvas background (step 421) ──────────────────────────────────────
      setBackground(color: string) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        canvas.set('backgroundColor', color)
        canvas.renderAll()
      },

      // ── Load template (step 415) ──────────────────────────────────────────
      async loadTemplate(json: object) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        await canvas.loadFromJSON(json)
        canvas.getObjects().filter((o: FabricObject) => o.__isZone).forEach((z: FabricObject) => canvas.remove(z))
        canvas.getObjects().forEach((o: FabricObject) => { if (o.__locked) applyLock(o, true) })
        canvas.renderAll()
        fireLayersRef.current?.()
      },

      // ── Lock any object (step 409) ─────────────────────────────────────────
      toggleLockSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || obj.__isZone) return
        const newLocked = !obj.__locked
        obj.__locked = newLocked
        applyLock(obj, newLocked)
        canvas.renderAll()
        // Sync panel state
        if (isImageObj(obj)) {
          onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
        } else if (isShapeObj(obj)) {
          onSelectionChangeRef.current?.('shape', undefined, getShapePropsFromObj(obj), undefined)
        }
        fireLayersRef.current?.()
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
