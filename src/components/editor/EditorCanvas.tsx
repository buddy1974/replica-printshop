'use client'

// Steps 345, 361, 367, 368, 371–410, 641 — Fabric.js canvas + text + shapes + image tools + layers + group

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
  zone?: PlacementZone | null   // accepted for backwards compat, not used internally
  printWidthCm?: number | null
  printHeightCm?: number | null
  bleedMm?: number | null
  safeMm?: number | null
  onSelectionChange?: (
    type: SelectionType,
    textProps?: TextProps,
    shapeProps?: ShapeProps,
    imageProps?: ImageProps,
  ) => void
  onLayersChange?: (layers: LayerInfo[]) => void
  onReady?: () => void
}

// Max print sheet pixel dimensions inside the workspace
const MAX_SHEET_W = 700
const MAX_SHEET_H = 540
const RULER_PX = 20   // ruler strip height/width in px
const WS_GAP = 16     // workspace padding around canvas

function getMajorStepCm(totalCm: number): number {
  if (totalCm > 200) return 50
  if (totalCm > 100) return 20
  if (totalCm > 50) return 10
  if (totalCm > 20) return 5
  if (totalCm > 10) return 2
  return 1
}

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
    { mockupUrl, printWidthCm, printHeightCm, bleedMm, safeMm, onSelectionChange, onLayersChange, onReady },
    ref,
  ) {
    // Compute canvas pixel dimensions: sheet + bleed on all sides
    const pW = printWidthCm ?? 100
    const pH = printHeightCm ?? 100
    const bMm = bleedMm ?? 0
    const sMm = safeMm ?? 0
    const scale = Math.min(MAX_SHEET_W / pW, MAX_SHEET_H / pH)
    const bleedPx = Math.round((bMm / 10) * scale)
    const safePx = Math.round((sMm / 10) * scale)
    const sheetW = Math.round(pW * scale)
    const sheetH = Math.round(pH * scale)
    const sheetX = bleedPx   // sheet origin inside canvas
    const sheetY = bleedPx
    const szW = sheetW + 2 * bleedPx   // total canvas width (sheet + bleed)
    const szH = sheetH + 2 * bleedPx   // total canvas height

    const canvasElRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<FabricCanvas | null>(null)
    // Sheet geometry refs (stable values for Fabric event handlers)
    const sheetXRef = useRef(sheetX)
    const sheetYRef = useRef(sheetY)
    const sheetWRef = useRef(sheetW)
    const sheetHRef = useRef(sheetH)
    const safePxRef = useRef(safePx)
    const sheetRectRef = useRef<FabricObject | null>(null)
    const drawSheetOverlayRef = useRef<(() => void) | null>(null)
    const onSelectionChangeRef = useRef(onSelectionChange)
    const onLayersChangeRef = useRef(onLayersChange)
    const onReadyRef = useRef(onReady)
    // Stored function to build + fire layers list — accessible in useImperativeHandle
    const fireLayersRef = useRef<(() => void) | null>(null)

    useEffect(() => { onSelectionChangeRef.current = onSelectionChange }, [onSelectionChange])
    useEffect(() => { onLayersChangeRef.current = onLayersChange }, [onLayersChange])
    useEffect(() => { onReadyRef.current = onReady }, [onReady])

    // Keep sheet geometry refs in sync when props change
    useEffect(() => { sheetXRef.current = sheetX; sheetYRef.current = sheetY }, [sheetX, sheetY])
    useEffect(() => { sheetWRef.current = sheetW; sheetHRef.current = sheetH }, [sheetW, sheetH])
    useEffect(() => { safePxRef.current = safePx }, [safePx])

    // Boot Fabric canvas once
    useEffect(() => {
      if (!canvasElRef.current || fabricRef.current) return
      const el = canvasElRef.current
      const sX = sheetXRef.current
      const sY = sheetYRef.current
      const sW = sheetWRef.current
      const sH = sheetHRef.current
      const sp = safePxRef.current
      const canvasW = sW + 2 * sX
      const canvasH = sH + 2 * sY

      import('fabric').then((fab) => {
        const canvas = new fab.Canvas(el, {
          width: canvasW,
          height: canvasH,
          backgroundColor: '#c8c8c8',   // gray = bleed area
          preserveObjectStacking: true,
        })
        fabricRef.current = canvas
        onReadyRef.current?.()

        // ── drawSheetOverlay: white sheet + cut line + safe line ──────────────
        const drawSheetOverlay = () => {
          canvas.getObjects()
            .filter((o: FabricObject) => o.__isZone)
            .forEach((o: FabricObject) => canvas.remove(o))

          // White sheet rect
          const sheetRect = new fab.Rect({
            left: sX, top: sY, width: sW, height: sH,
            fill: '#ffffff',
            selectable: false, evented: false,
          })
          ;(sheetRect as FabricObject).__isZone = true
          sheetRectRef.current = sheetRect

          // Cut line (red dashed) — trim edge
          const cutRect = new fab.Rect({
            left: sX, top: sY, width: sW, height: sH,
            fill: 'rgba(239,68,68,0.03)', stroke: 'rgba(239,68,68,0.85)',
            strokeWidth: 1.5, strokeDashArray: [6, 3],
            selectable: false, evented: false,
          })
          ;(cutRect as FabricObject).__isZone = true

          // Safe line (green dashed) — content safe area
          const safeRect = new fab.Rect({
            left: sX + sp, top: sY + sp, width: sW - 2 * sp, height: sH - 2 * sp,
            fill: 'transparent', stroke: 'rgba(34,197,94,0.8)',
            strokeWidth: 1, strokeDashArray: [4, 4],
            selectable: false, evented: false,
          })
          ;(safeRect as FabricObject).__isZone = true

          canvas.add(sheetRect)
          canvas.add(cutRect)
          canvas.add(safeRect)
          canvas.sendObjectToBack(safeRect)
          canvas.sendObjectToBack(cutRect)
          canvas.sendObjectToBack(sheetRect)
          canvas.renderAll()
        }
        drawSheetOverlayRef.current = drawSheetOverlay
        drawSheetOverlay()

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
      })

      return () => {
        fabricRef.current?.dispose()
        fabricRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Mockup background — positioned at sheet origin, scaled to sheet size
    useEffect(() => {
      const canvas: FabricCanvas = fabricRef.current
      if (!canvas) return
      if (!mockupUrl) { canvas.backgroundImage = null; canvas.renderAll(); return }
      import('fabric').then((fab) => {
        fab.FabricImage.fromURL(mockupUrl, { crossOrigin: 'anonymous' }).then((img: FabricObject) => {
          img.set({
            left: sheetXRef.current, top: sheetYRef.current,
            scaleX: sheetWRef.current / (img.width ?? sheetWRef.current),
            scaleY: sheetHRef.current / (img.height ?? sheetHRef.current),
            selectable: false, evented: false,
          })
          canvas.backgroundImage = img
          canvas.renderAll()
        })
      })
    }, [mockupUrl])

    useImperativeHandle(ref, () => ({
      // ── Image upload ──────────────────────────────────────────────────────
      async addImage(url: string) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const fab = await import('fabric')
        const img: FabricObject = await fab.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const maxSide = Math.min(sW, sH) * 0.5
        const sc = Math.min(maxSide / (img.width ?? 1), maxSide / (img.height ?? 1))
        img.set({ left: sX + sW * 0.25, top: sY + sH * 0.25, scaleX: sc, scaleY: sc })
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

      // fitSelected: zone param accepted for API compat but ignored — uses sheet geometry
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fitSelected(_zone: PlacementZone) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj) return
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const sc = Math.min(sW / (obj.width ?? 1), sH / (obj.height ?? 1))
        obj.set({
          scaleX: sc, scaleY: sc,
          left: sX + (sW - (obj.width ?? 0) * sc) / 2,
          top: sY + (sH - (obj.height ?? 0) * sc) / 2,
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
        drawSheetOverlayRef.current?.()
        fireLayersRef.current?.()
      },

      // ── Text ───────────────────────────────────────────────────────────────
      addText(initialProps?: Partial<TextProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const p: TextProps = { ...DEFAULT_TEXT_PROPS, ...initialProps }
        const x = sX + sW * 0.1
        const y = sY + sH * 0.35
        const w = sW * 0.8
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
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const cx = sX + sW / 2, cy = sY + sH / 2
        import('fabric').then((fab) => {
          const rect = new fab.Rect({ left: cx - 50, top: cy - 30, width: 100, height: 60, fill: p.fill, stroke: p.stroke || '', strokeWidth: p.strokeWidth })
          canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll()
        })
      },

      addCircle(initialProps?: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const p = { ...DEFAULT_SHAPE_PROPS, ...initialProps }
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const cx = sX + sW / 2, cy = sY + sH / 2
        import('fabric').then((fab) => {
          const circle = new fab.Circle({ left: cx - 40, top: cy - 40, radius: 40, fill: p.fill, stroke: p.stroke || '', strokeWidth: p.strokeWidth })
          canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll()
        })
      },

      addTriangle(initialProps?: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const p = { ...DEFAULT_SHAPE_PROPS, ...initialProps }
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const cx = sX + sW / 2, cy = sY + sH / 2
        import('fabric').then((fab) => {
          const tri = new fab.Triangle({ left: cx - 40, top: cy - 40, width: 80, height: 80, fill: p.fill, stroke: p.stroke || '', strokeWidth: p.strokeWidth })
          canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll()
        })
      },

      addLine(initialProps?: Partial<ShapeProps>) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const p = { ...DEFAULT_SHAPE_PROPS, ...initialProps }
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const cx = sX + sW / 2, cy = sY + sH / 2
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
        // clipPath removed — objects are not clipped to any zone
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || !isImageObj(obj)) return
        obj.clipPath = undefined
        canvas.renderAll()
        onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
      },

      centerInZone() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const obj: FabricObject = canvas.getActiveObject()
        if (!obj || obj.__isZone) return
        const sX = sheetXRef.current, sY = sheetYRef.current
        const sW = sheetWRef.current, sH = sheetHRef.current
        const objW = (obj.width ?? 0) * Math.abs(obj.scaleX ?? 1)
        const objH = (obj.height ?? 0) * Math.abs(obj.scaleY ?? 1)
        obj.set({ left: sX + (sW - objW) / 2, top: sY + (sH - objH) / 2 })
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
      groupSelected() {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        const active: FabricObject = canvas.getActiveObject()
        if (!active || active.type !== 'activeselection') return
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
          left: obj.left, top: obj.top,
          scaleX: obj.scaleX, scaleY: obj.scaleY,
          angle: obj.angle, opacity: obj.opacity,
          flipX: obj.flipX, flipY: obj.flipY,
        })
        if (obj.clipPath) newImg.clipPath = obj.clipPath
        canvas.remove(obj)
        canvas.add(newImg)
        canvas.setActiveObject(newImg)
        canvas.renderAll()
        onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(newImg))
        fireLayersRef.current?.()
      },

      // ── Canvas background (step 421) — changes sheet fill ─────────────────
      setBackground(color: string) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        if (sheetRectRef.current) {
          sheetRectRef.current.set('fill', color)
        }
        canvas.renderAll()
      },

      // ── Load template (step 415) ──────────────────────────────────────────
      async loadTemplate(json: object) {
        const canvas: FabricCanvas = fabricRef.current
        if (!canvas) return
        await canvas.loadFromJSON(json)
        canvas.getObjects().filter((o: FabricObject) => o.__isZone).forEach((z: FabricObject) => canvas.remove(z))
        canvas.getObjects().forEach((o: FabricObject) => { if (o.__locked) applyLock(o, true) })
        drawSheetOverlayRef.current?.()
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
        if (isImageObj(obj)) {
          onSelectionChangeRef.current?.('image', undefined, undefined, getImagePropsFromObj(obj))
        } else if (isShapeObj(obj)) {
          onSelectionChangeRef.current?.('shape', undefined, getShapePropsFromObj(obj), undefined)
        }
        fireLayersRef.current?.()
      },
    }))

    // ── JSX: workspace with rulers ────────────────────────────────────────────
    // hScale / vScale: pixels per cm (for ruler tick placement)
    const hScale = sheetW / pW
    const vScale = sheetH / pH
    const hStep = getMajorStepCm(pW)
    const vStep = getMajorStepCm(pH)
    // wsW/wsH: total workspace including ruler strips and gaps around canvas
    const wsW = RULER_PX + WS_GAP + szW + WS_GAP
    const wsH = RULER_PX + WS_GAP + szH + WS_GAP

    return (
      <div className="select-none">
        {/* Size label */}
        <p className="text-center text-xs text-gray-400 mb-1 font-mono tracking-wide">
          {pW} × {pH} cm
        </p>

        {/* Print workspace */}
        <div style={{ position: 'relative', width: wsW, height: wsH, background: '#6b7280' }}>

          {/* Corner block */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: RULER_PX, height: RULER_PX, background: '#c4c8d0' }} />

          {/* Top ruler — 0 aligns with cut line (sheet left edge = bleedPx into canvas) */}
          <div style={{ position: 'absolute', top: 0, left: RULER_PX, width: wsW - RULER_PX, height: RULER_PX, background: '#dde1ea', overflow: 'hidden' }}>
            <svg width={wsW - RULER_PX} height={RULER_PX} style={{ display: 'block' }}>
              {Array.from({ length: Math.floor(pW / hStep) + 1 }, (_, i) => {
                const cm = i * hStep
                const x = WS_GAP + bleedPx + cm * hScale
                return (
                  <g key={cm}>
                    <line x1={x} y1={RULER_PX} x2={x} y2={RULER_PX - 8} stroke="#888" strokeWidth={0.75} />
                    {i > 0 && <text x={x + 2} y={RULER_PX - 9} fontSize={7} fill="#666">{cm}</text>}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Left ruler — 0 aligns with cut line (sheet top edge = bleedPx into canvas) */}
          <div style={{ position: 'absolute', top: RULER_PX, left: 0, width: RULER_PX, height: wsH - RULER_PX, background: '#dde1ea', overflow: 'hidden' }}>
            <svg width={RULER_PX} height={wsH - RULER_PX} style={{ display: 'block' }}>
              {Array.from({ length: Math.floor(pH / vStep) + 1 }, (_, i) => {
                const cm = i * vStep
                const y = WS_GAP + bleedPx + cm * vScale
                return (
                  <g key={cm}>
                    <line x1={RULER_PX} y1={y} x2={RULER_PX - 8} y2={y} stroke="#888" strokeWidth={0.75} />
                    {i > 0 && (
                      <text x={RULER_PX - 10} y={y} fontSize={7} fill="#666" textAnchor="end" dominantBaseline="middle">{cm}</text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Print sheet (Fabric canvas — includes bleed area) */}
          <div style={{ position: 'absolute', top: RULER_PX + WS_GAP, left: RULER_PX + WS_GAP, boxShadow: '0 4px 20px rgba(0,0,0,0.45)' }}>
            <canvas ref={canvasElRef} />
          </div>
        </div>
      </div>
    )
  },
)

export default EditorCanvas
