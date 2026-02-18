'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────
interface Vec2 { x: number; y: number; }

interface Zone {
  id: string; name: string; color: string;
  x: number; y: number; width: number; height: number;
  rotation: number; shape: string; points: Vec2[] | null;
  zIndex: number; isLocked: boolean; metadata: Record<string, unknown>;
}

interface Chair {
  id: string; tableId: string;
  offsetX: number; offsetY: number; rotation: number;
  chairType: string;
}

interface Table {
  id: string; label: string; friendlyName: string | null;
  shape: string; x: number; y: number; width: number; height: number;
  rotation: number; capacity: number; minCapacity: number;
  color: string; category: string; zIndex: number;
  isLocked: boolean; isActive: boolean; status: string;
  notes: string | null; zoneId: string | null;
  metadata: Record<string, unknown>;
}

interface Obstacle {
  id: string; kind: string; label: string | null;
  x: number; y: number; width: number; height: number;
  rotation: number; color: string; zIndex: number;
  isLocked: boolean; points: Vec2[] | null;
  metadata: Record<string, unknown>;
}

interface Layout {
  id: string; name: string; description: string | null;
  floor: number; status: string; version: number;
  canvasWidth: number; canvasHeight: number; gridSize: number;
  scale: number; bgImageUrl: string | null;
  location: { id: string; name: string; slug: string };
  zones: Zone[]; tables: (Table & { chairs: Chair[] })[]; obstacles: Obstacle[];
}

type ElementType = 'table' | 'zone' | 'obstacle';
type ToolMode = 'select' | 'pan' | 'add-table' | 'add-zone' | 'add-obstacle';

const CATEGORY_COLORS: Record<string, string> = {
  dine_in: '#6366F1', outdoor: '#10B981', vip: '#8B5CF6',
  bar: '#F59E0B', staff: '#6B7280',
};

const OBSTACLE_KINDS = ['wall', 'door', 'window', 'pillar', 'bar', 'kitchen', 'pathway', 'stairs'];

const TABLE_SHAPES = ['rectangle', 'round', 'square', 'oval'];

// ─── Helper: generate UUID ─────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Helper: snap to grid ──────────────────────────────
function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

// ─── Helper: generate chair positions around a table ───
function generateChairPositions(
  count: number,
  shape: string,
  width: number,
  height: number,
): { offsetX: number; offsetY: number; rotation: number }[] {
  if (count === 0) return [];
  const pad = 18; // gap between table edge and chair center

  if (shape === 'round') {
    const r = width / 2 + pad;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      return { offsetX: Math.cos(a) * r, offsetY: Math.sin(a) * r, rotation: (a * 180) / Math.PI + 90 };
    });
  }

  if (shape === 'oval') {
    const rx = width / 2 + pad;
    const ry = height / 2 + pad;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      return { offsetX: Math.cos(a) * rx, offsetY: Math.sin(a) * ry, rotation: (a * 180) / Math.PI + 90 };
    });
  }

  // Rectangle / Square — smart side distribution
  // Allocate chairs to each side proportional to its length, then space evenly
  const hw = width / 2 + pad;
  const hh = height / 2 + pad;
  const sides = [
    { len: width, axis: 'top' as const },
    { len: height, axis: 'right' as const },
    { len: width, axis: 'bottom' as const },
    { len: height, axis: 'left' as const },
  ];
  const perim = 2 * (width + height);

  // Distribute chairs proportionally to each side
  const perSide = sides.map((s) => Math.floor((s.len / perim) * count));
  // Distribute remainder to longest sides first
  let remainder = count - perSide.reduce((a, b) => a + b, 0);
  const sortedIndices = [0, 1, 2, 3].sort((a, b) => sides[b].len - sides[a].len);
  for (const idx of sortedIndices) {
    if (remainder <= 0) break;
    perSide[idx]++;
    remainder--;
  }

  const positions: { offsetX: number; offsetY: number; rotation: number }[] = [];

  for (let si = 0; si < 4; si++) {
    const n = perSide[si];
    const axis = sides[si].axis;
    for (let ci = 0; ci < n; ci++) {
      const f = (ci + 0.5) / n; // fraction along the side (centered)
      let ox: number, oy: number, rot: number;
      switch (axis) {
        case 'top':
          ox = -width / 2 + f * width;
          oy = -hh;
          rot = 0;
          break;
        case 'right':
          ox = hw;
          oy = -height / 2 + f * height;
          rot = 90;
          break;
        case 'bottom':
          ox = width / 2 - f * width;
          oy = hh;
          rot = 180;
          break;
        case 'left':
          ox = -hw;
          oy = height / 2 - f * height;
          rot = 270;
          break;
      }
      positions.push({ offsetX: ox, offsetY: oy, rotation: rot });
    }
  }

  return positions;
}

// ─── Component ─────────────────────────────────────────
export default function FloorPlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const layoutId = params.layoutId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout data
  const [layout, setLayout] = useState<Layout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Canvas state
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<(Table & { chairs: Chair[] })[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  // Editor state
  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ElementType | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Vec2>({ x: 0, y: 0 });
  const [showProperties, setShowProperties] = useState(true);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Vec2>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Vec2>({ x: 0, y: 0 });

  // Resize state
  type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeOrigin, setResizeOrigin] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const [cursorStyle, setCursorStyle] = useState('default');

  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStartAngle, setRotateStartAngle] = useState(0);
  const [rotateStartRotation, setRotateStartRotation] = useState(0);

  const HANDLE_SIZE = 10; // hit area for resize handles (px in canvas coords)
  const ROTATE_HANDLE_DIST = 28; // distance above the element for the rotate handle

  // Rotate a point around a center
  const rotatePoint = (px: number, py: number, centerX: number, centerY: number, angleDeg: number): Vec2 => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - centerX;
    const dy = py - centerY;
    return { x: centerX + dx * cos - dy * sin, y: centerY + dx * sin + dy * cos };
  };

  // Unrotate a point — transform canvas coords into element-local coords
  const unrotatePoint = (cx: number, cy: number, elem: { x: number; y: number; width: number; height: number; rotation?: number }): Vec2 => {
    const rot = (elem as { rotation?: number }).rotation || 0;
    if (rot === 0) return { x: cx, y: cy };
    const centerX = elem.x + elem.width / 2;
    const centerY = elem.y + elem.height / 2;
    return rotatePoint(cx, cy, centerX, centerY, -rot);
  };

  // Hit-test the rotation handle (circle above top-center of selected element)
  const hitTestRotateHandle = (cx: number, cy: number): boolean => {
    const sel = getSelected();
    if (!sel || !('x' in sel)) return false;
    const s = sel as { x: number; y: number; width: number; height: number; rotation?: number };
    // Transform cursor into element-local coords
    const local = unrotatePoint(cx, cy, s);
    const hx = s.x + s.width / 2;
    const hy = s.y - ROTATE_HANDLE_DIST;
    const dist = Math.sqrt((local.x - hx) ** 2 + (local.y - hy) ** 2);
    return dist <= (HANDLE_SIZE + 2) / zoom;
  };

  // Hit-test resize handles of the selected element (works in element-local space)
  const hitTestHandles = (cx: number, cy: number): ResizeHandle => {
    const sel = getSelected();
    if (!sel || !('x' in sel)) return null;
    const s = sel as { x: number; y: number; width: number; height: number; rotation?: number };
    // Transform cursor into element-local coords
    const local = unrotatePoint(cx, cy, s);
    const hs = HANDLE_SIZE / zoom; // scale hit area with zoom
    const handles: { key: ResizeHandle; hx: number; hy: number }[] = [
      { key: 'nw', hx: s.x, hy: s.y },
      { key: 'n',  hx: s.x + s.width / 2, hy: s.y },
      { key: 'ne', hx: s.x + s.width, hy: s.y },
      { key: 'e',  hx: s.x + s.width, hy: s.y + s.height / 2 },
      { key: 'se', hx: s.x + s.width, hy: s.y + s.height },
      { key: 's',  hx: s.x + s.width / 2, hy: s.y + s.height },
      { key: 'sw', hx: s.x, hy: s.y + s.height },
      { key: 'w',  hx: s.x, hy: s.y + s.height / 2 },
    ];
    for (const h of handles) {
      if (Math.abs(local.x - h.hx) <= hs && Math.abs(local.y - h.hy) <= hs) return h.key;
    }
    return null;
  };

  const handleCursorForResize = (handle: ResizeHandle): string => {
    switch (handle) {
      case 'nw': case 'se': return 'nwse-resize';
      case 'ne': case 'sw': return 'nesw-resize';
      case 'n': case 's': return 'ns-resize';
      case 'e': case 'w': return 'ew-resize';
      default: return 'default';
    }
  };

  // Add-element config
  const [addTableShape, setAddTableShape] = useState('rectangle');
  const [addTableCategory, setAddTableCategory] = useState('dine_in');
  const [addObstacleKind, setAddObstacleKind] = useState('wall');

  // ─── Fetch layout ──────────────────────────────────
  const fetchLayout = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/floor-layouts/${layoutId}`);
      if (!res.ok) { router.push(`/t/${tenantId}/admin/floor-plans`); return; }
      const data = await res.json();
      const l = data.layout as Layout;
      setLayout(l);
      setZones(l.zones);
      setTables(l.tables);
      setObstacles(l.obstacles);
    } catch {
      console.error('Failed to fetch layout');
    } finally {
      setLoading(false);
    }
  }, [layoutId, tenantId, router]);

  useEffect(() => { fetchLayout(); }, [fetchLayout]);

  // ─── Save ──────────────────────────────────────────
  const handleSave = async () => {
    if (!layout) return;
    setSaving(true);
    try {
      const allChairs = tables.flatMap((t) => t.chairs || []);
      const res = await fetch(`/api/admin/floor-layouts/${layoutId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones, tables, obstacles, chairs: allChairs }),
      });
      if (res.ok) setDirty(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  // ─── Get selected element ─────────────────────────
  const getSelected = () => {
    if (!selectedId || !selectedType) return null;
    if (selectedType === 'table') return tables.find((t) => t.id === selectedId) || null;
    if (selectedType === 'zone') return zones.find((z) => z.id === selectedId) || null;
    if (selectedType === 'obstacle') return obstacles.find((o) => o.id === selectedId) || null;
    return null;
  };

  // ─── Canvas coordinates ───────────────────────────
  const screenToCanvas = (screenX: number, screenY: number): Vec2 => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - panOffset.x) / zoom,
      y: (screenY - rect.top - panOffset.y) / zoom,
    };
  };

  // ─── Hit test ─────────────────────────────────────
  const hitTest = (cx: number, cy: number): { id: string; type: ElementType } | null => {
    // Check tables first (highest z-index)
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      if (cx >= t.x && cx <= t.x + t.width && cy >= t.y && cy <= t.y + t.height) {
        return { id: t.id, type: 'table' };
      }
    }
    // Then obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (cx >= o.x && cx <= o.x + o.width && cy >= o.y && cy <= o.y + o.height) {
        return { id: o.id, type: 'obstacle' };
      }
    }
    // Then zones (background)
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      if (cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height) {
        return { id: z.id, type: 'zone' };
      }
    }
    return null;
  };

  // ─── Mouse handlers ───────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = screenToCanvas(e.clientX, e.clientY);
    const grid = layout?.gridSize || 20;

    if (tool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (tool === 'add-table') {
      const nextNum = tables.length + 1;
      const newTable: Table & { chairs: Chair[] } = {
        id: uuid(), label: `T${nextNum}`, friendlyName: null,
        shape: addTableShape, x: snap(canvas.x - 40, grid), y: snap(canvas.y - 40, grid),
        width: addTableShape === 'round' ? 80 : (addTableShape === 'square' ? 80 : 120),
        height: 80, rotation: 0, capacity: 4, minCapacity: 1,
        color: CATEGORY_COLORS[addTableCategory] || '#6366F1',
        category: addTableCategory, zIndex: 10, isLocked: false,
        isActive: true, status: 'active', notes: null, zoneId: null,
        metadata: {}, chairs: [],
      };
      // Auto-generate chairs arranged properly around the table shape
      const positions = generateChairPositions(4, newTable.shape, newTable.width, newTable.height);
      newTable.chairs = positions.map((p) => ({
        id: uuid(), tableId: newTable.id,
        offsetX: p.offsetX, offsetY: p.offsetY,
        rotation: p.rotation, chairType: 'normal',
      }));
      setTables((prev) => [...prev, newTable]);
      setSelectedId(newTable.id);
      setSelectedType('table');
      setDirty(true);
      setTool('select');
      return;
    }

    if (tool === 'add-zone') {
      const newZone: Zone = {
        id: uuid(), name: `Zone ${zones.length + 1}`,
        color: '#E5E7EB', x: snap(canvas.x - 100, grid), y: snap(canvas.y - 100, grid),
        width: 200, height: 200, rotation: 0, shape: 'rectangle', points: null,
        zIndex: 0, isLocked: false, metadata: {},
      };
      setZones((prev) => [...prev, newZone]);
      setSelectedId(newZone.id);
      setSelectedType('zone');
      setDirty(true);
      setTool('select');
      return;
    }

    if (tool === 'add-obstacle') {
      const newObs: Obstacle = {
        id: uuid(), kind: addObstacleKind, label: null,
        x: snap(canvas.x - 50, grid), y: snap(canvas.y - 10, grid),
        width: 100, height: 20, rotation: 0, color: '#9CA3AF',
        zIndex: 5, isLocked: false, points: null, metadata: {},
      };
      setObstacles((prev) => [...prev, newObs]);
      setSelectedId(newObs.id);
      setSelectedType('obstacle');
      setDirty(true);
      setTool('select');
      return;
    }

    // Check rotation handle first (if something is already selected)
    if (selectedId && selectedType && tool === 'select') {
      if (hitTestRotateHandle(canvas.x, canvas.y)) {
        const sel = getSelected();
        if (sel && 'x' in sel) {
          const s = sel as { x: number; y: number; width: number; height: number; rotation?: number };
          const centerX = s.x + s.width / 2;
          const centerY = s.y + s.height / 2;
          const startAngle = Math.atan2(canvas.y - centerY, canvas.x - centerX);
          setIsRotating(true);
          setRotateStartAngle(startAngle);
          setRotateStartRotation((s as { rotation?: number }).rotation || 0);
          setIsDragging(true);
          return;
        }
      }
    }

    // Check resize handles (if something is already selected)
    if (selectedId && selectedType && tool === 'select') {
      const handle = hitTestHandles(canvas.x, canvas.y);
      if (handle) {
        const sel = getSelected();
        if (sel && 'x' in sel) {
          const s = sel as { x: number; y: number; width: number; height: number };
          setResizeHandle(handle);
          setResizeOrigin({ x: s.x, y: s.y, w: s.width, h: s.height });
          setDragStart(canvas);
          setIsDragging(true);
          return;
        }
      }
    }

    // Select mode
    const hit = hitTest(canvas.x, canvas.y);
    if (hit) {
      setSelectedId(hit.id);
      setSelectedType(hit.type);
      const elem =
        hit.type === 'table' ? tables.find((t) => t.id === hit.id) :
        hit.type === 'obstacle' ? obstacles.find((o) => o.id === hit.id) :
        zones.find((z) => z.id === hit.id);
      if (elem && !('isLocked' in elem && elem.isLocked)) {
        setIsDragging(true);
        setResizeHandle(null);
        setDragStart(canvas);
        setDragOffset({ x: canvas.x - (elem as { x: number }).x, y: canvas.y - (elem as { y: number }).y });
      }
    } else {
      setSelectedId(null);
      setSelectedType(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = screenToCanvas(e.clientX, e.clientY);

    // Update cursor on hover over handles
    if (!isDragging && tool === 'select' && selectedId) {
      if (hitTestRotateHandle(canvas.x, canvas.y)) {
        setCursorStyle('grab');
      } else {
        const handle = hitTestHandles(canvas.x, canvas.y);
        setCursorStyle(handle ? handleCursorForResize(handle) : 'default');
      }
    }

    if (!isDragging) return;

    if (tool === 'pan') {
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    if (!selectedId || !selectedType) return;
    const grid = layout?.gridSize || 20;

    // ── Rotation mode ──
    if (isRotating) {
      const sel = getSelected();
      if (sel && 'x' in sel) {
        const s = sel as { x: number; y: number; width: number; height: number };
        const centerX = s.x + s.width / 2;
        const centerY = s.y + s.height / 2;
        const currentAngle = Math.atan2(canvas.y - centerY, canvas.x - centerX);
        const deltaAngle = ((currentAngle - rotateStartAngle) * 180) / Math.PI;
        // Snap to 15° increments when not holding shift
        let newRotation = rotateStartRotation + deltaAngle;
        newRotation = Math.round(newRotation / 15) * 15;
        newRotation = ((newRotation % 360) + 360) % 360;

        if (selectedType === 'table') {
          setTables((prev) => prev.map((t) => t.id === selectedId ? { ...t, rotation: newRotation } : t));
        } else if (selectedType === 'obstacle') {
          setObstacles((prev) => prev.map((ob) => ob.id === selectedId ? { ...ob, rotation: newRotation } : ob));
        } else if (selectedType === 'zone') {
          setZones((prev) => prev.map((z) => z.id === selectedId ? { ...z, rotation: newRotation } : z));
        }
        setDirty(true);
      }
      return;
    }

    // ── Resize mode ──
    if (resizeHandle) {
      const dx = canvas.x - dragStart.x;
      const dy = canvas.y - dragStart.y;
      const o = resizeOrigin;
      const MIN = 20; // minimum element size
      let nx = o.x, ny = o.y, nw = o.w, nh = o.h;

      // Horizontal component
      if (resizeHandle.includes('e')) { nw = Math.max(MIN, snap(o.w + dx, grid)); }
      if (resizeHandle.includes('w')) { const d = snap(dx, grid); nw = Math.max(MIN, o.w - d); nx = o.x + (o.w - nw); }
      // Vertical component
      if (resizeHandle.includes('s')) { nh = Math.max(MIN, snap(o.h + dy, grid)); }
      if (resizeHandle.includes('n')) { const d = snap(dy, grid); nh = Math.max(MIN, o.h - d); ny = o.y + (o.h - nh); }

      const patch = { x: nx, y: ny, width: nw, height: nh };

      if (selectedType === 'zone') {
        setZones((prev) => prev.map((z) => z.id === selectedId ? { ...z, ...patch } : z));
      } else if (selectedType === 'table') {
        setTables((prev) => prev.map((t) => {
          if (t.id !== selectedId) return t;
          const count = t.chairs?.length || 0;
          const positions = generateChairPositions(count, t.shape, nw, nh);
          const chairs: Chair[] = positions.map((p, i) => ({
            id: t.chairs?.[i]?.id || uuid(),
            tableId: t.id,
            offsetX: p.offsetX, offsetY: p.offsetY,
            rotation: p.rotation,
            chairType: t.chairs?.[i]?.chairType || 'normal',
          }));
          return { ...t, ...patch, chairs };
        }));
      } else if (selectedType === 'obstacle') {
        setObstacles((prev) => prev.map((ob) => ob.id === selectedId ? { ...ob, ...patch } : ob));
      }
      setDirty(true);
      return;
    }

    // ── Move mode ──
    const nx = snap(canvas.x - dragOffset.x, grid);
    const ny = snap(canvas.y - dragOffset.y, grid);

    if (selectedType === 'table') {
      setTables((prev) => prev.map((t) => t.id === selectedId ? { ...t, x: nx, y: ny } : t));
    } else if (selectedType === 'obstacle') {
      setObstacles((prev) => prev.map((o) => o.id === selectedId ? { ...o, x: nx, y: ny } : o));
    } else if (selectedType === 'zone') {
      setZones((prev) => prev.map((z) => z.id === selectedId ? { ...z, x: nx, y: ny } : z));
    }
    setDirty(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizeHandle(null);
    setIsRotating(false);
  };

  // ─── Keyboard shortcuts ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId && selectedType) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedType(null);
        setTool('select');
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'g') setShowGrid((p) => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedType]);

  const deleteSelected = () => {
    if (!selectedId || !selectedType) return;
    if (selectedType === 'table') setTables((prev) => prev.filter((t) => t.id !== selectedId));
    if (selectedType === 'obstacle') setObstacles((prev) => prev.filter((o) => o.id !== selectedId));
    if (selectedType === 'zone') setZones((prev) => prev.filter((z) => z.id !== selectedId));
    setSelectedId(null);
    setSelectedType(null);
    setDirty(true);
  };

  const duplicateSelected = () => {
    if (!selectedId || !selectedType) return;
    const grid = layout?.gridSize || 20;
    if (selectedType === 'table') {
      const t = tables.find((t) => t.id === selectedId);
      if (!t) return;
      const newId = uuid();
      const newTable = {
        ...t, id: newId, label: `T${tables.length + 1}`,
        x: t.x + grid * 2, y: t.y + grid * 2,
        chairs: t.chairs.map((c) => ({ ...c, id: uuid(), tableId: newId })),
      };
      setTables((prev) => [...prev, newTable]);
      setSelectedId(newId);
    }
    if (selectedType === 'zone') {
      const z = zones.find((z) => z.id === selectedId);
      if (!z) return;
      const newId = uuid();
      setZones((prev) => [...prev, { ...z, id: newId, name: `${z.name} Copy`, x: z.x + grid * 2, y: z.y + grid * 2 }]);
      setSelectedId(newId);
    }
    if (selectedType === 'obstacle') {
      const o = obstacles.find((o) => o.id === selectedId);
      if (!o) return;
      const newId = uuid();
      setObstacles((prev) => [...prev, { ...o, id: newId, x: o.x + grid * 2, y: o.y + grid * 2 }]);
      setSelectedId(newId);
    }
    setDirty(true);
  };

  // ─── Update selected element property ─────────────
  const updateSelected = (key: string, value: unknown) => {
    if (!selectedId || !selectedType) return;
    if (selectedType === 'table') {
      setTables((prev) => prev.map((t) => t.id === selectedId ? { ...t, [key]: value } : t));
    } else if (selectedType === 'zone') {
      setZones((prev) => prev.map((z) => z.id === selectedId ? { ...z, [key]: value } : z));
    } else if (selectedType === 'obstacle') {
      setObstacles((prev) => prev.map((o) => o.id === selectedId ? { ...o, [key]: value } : o));
    }
    setDirty(true);
  };

  // ─── Canvas rendering ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Canvas area background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, layout.canvasWidth, layout.canvasHeight);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#F3F4F6';
      ctx.lineWidth = 0.5;
      const g = layout.gridSize;
      for (let x = g; x < layout.canvasWidth; x += g) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, layout.canvasHeight); ctx.stroke();
      }
      for (let y = g; y < layout.canvasHeight; y += g) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(layout.canvasWidth, y); ctx.stroke();
      }
    }

    // Zones
    zones.forEach((z) => {
      ctx.fillStyle = z.color + '40'; // 25% opacity
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 2;
      if (z.id === selectedId) {
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
      }
      ctx.fillRect(z.x, z.y, z.width, z.height);
      ctx.strokeRect(z.x, z.y, z.width, z.height);
      ctx.setLineDash([]);
      // Zone label
      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(z.name, z.x + 8, z.y + 18);
    });

    // Obstacles
    obstacles.forEach((o) => {
      const ocx = o.x + o.width / 2;
      const ocy = o.y + o.height / 2;
      ctx.save();
      if (o.rotation) {
        ctx.translate(ocx, ocy);
        ctx.rotate((o.rotation * Math.PI) / 180);
        ctx.translate(-ocx, -ocy);
      }
      ctx.fillStyle = o.color;
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 1;
      if (o.id === selectedId) {
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
      }
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      ctx.setLineDash([]);
      // Obstacle label
      if (o.label || o.kind) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(o.label || o.kind, ocx, ocy + 4);
      }
      ctx.restore();
    });

    // Tables
    tables.forEach((t) => {
      const isDisabled = t.status === 'disabled' || !t.isActive;
      ctx.fillStyle = isDisabled ? '#D1D5DB' : t.color + 'CC'; // grey for disabled, 80% opacity otherwise
      ctx.strokeStyle = isDisabled ? '#9CA3AF' : t.color;
      ctx.lineWidth = 2;
      if (t.id === selectedId) {
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
      } else if (isDisabled) {
        ctx.setLineDash([6, 4]);
      }
      if (t.shape === 'round' || t.shape === 'oval') {
        ctx.beginPath();
        ctx.ellipse(t.x + t.width / 2, t.y + t.height / 2, t.width / 2, t.height / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      } else {
        const r = 6;
        ctx.beginPath();
        ctx.roundRect(t.x, t.y, t.width, t.height, r);
        ctx.fill(); ctx.stroke();
      }
      ctx.setLineDash([]);

      // Diagonal stripes overlay for disabled tables
      if (isDisabled) {
        ctx.save();
        ctx.beginPath();
        if (t.shape === 'round' || t.shape === 'oval') {
          ctx.ellipse(t.x + t.width / 2, t.y + t.height / 2, t.width / 2, t.height / 2, 0, 0, Math.PI * 2);
        } else {
          ctx.roundRect(t.x, t.y, t.width, t.height, 6);
        }
        ctx.clip();
        ctx.strokeStyle = '#EF444466';
        ctx.lineWidth = 2;
        const step = 10;
        for (let d = -t.width - t.height; d < t.width + t.height; d += step) {
          ctx.beginPath();
          ctx.moveTo(t.x + d, t.y);
          ctx.lineTo(t.x + d + t.height, t.y + t.height);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Table label
      ctx.fillStyle = isDisabled ? '#6B7280' : '#FFFFFF';
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, t.x + t.width / 2, t.y + t.height / 2 - (isDisabled ? 10 : 6));
      // Capacity + chair count on canvas
      ctx.font = '10px Inter, system-ui, sans-serif';
      const chairCount = t.chairs?.length || 0;
      if (isDisabled) {
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.fillText('DISABLED', t.x + t.width / 2, t.y + t.height / 2 + 4);
        ctx.fillStyle = '#6B7280';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.fillText(`${chairCount}/${t.capacity} seats`, t.x + t.width / 2, t.y + t.height / 2 + 16);
      } else {
        ctx.fillText(`${chairCount}/${t.capacity} seats`, t.x + t.width / 2, t.y + t.height / 2 + 10);
      }

      // Chairs — drawn as rounded seats with a back rest facing outward
      (t.chairs || []).forEach((c) => {
        const cx = t.x + t.width / 2 + c.offsetX;
        const cy = t.y + t.height / 2 + c.offsetY;
        const rad = 8;
        const rotRad = ((c.rotation - 90) * Math.PI) / 180; // rotation: 0=top, convert to canvas angle

        ctx.save();
        if (isDisabled) ctx.globalAlpha = 0.3;
        ctx.translate(cx, cy);
        ctx.rotate(rotRad);

        // Seat (filled circle)
        const baseColor = c.chairType === 'bar_stool' ? '#D97706' :
          c.chairType === 'booth' ? '#7C3AED' : '#6B7280';
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Back rest — a thicker arc on the "away from table" side
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, rad + 2.5, -0.7 * Math.PI, 0.7 * Math.PI);
        ctx.stroke();

        ctx.restore();
      });

      ctx.textBaseline = 'alphabetic';
    });

    // Selection handles (8 resize handles: 4 corners + 4 edge midpoints + rotation handle)
    if (selectedId) {
      const sel = getSelected();
      if (sel && 'x' in sel) {
        const s = sel as { x: number; y: number; width: number; height: number; rotation?: number };
        const hs = 8;
        const mx = s.x + s.width / 2;
        const my = s.y + s.height / 2;
        const elemRot = (s as { rotation?: number }).rotation || 0;

        // Apply rotation transform so handles rotate with the element
        ctx.save();
        if (elemRot) {
          ctx.translate(mx, my);
          ctx.rotate((elemRot * Math.PI) / 180);
          ctx.translate(-mx, -my);
        }

        // Rotation handle — stem + circle above top-center
        const rotHandleY = s.y - ROTATE_HANDLE_DIST;
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(mx, s.y);
        ctx.lineTo(mx, rotHandleY);
        ctx.stroke();
        ctx.setLineDash([]);
        // Outer white circle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(mx, rotHandleY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Rotation arrow icon inside the circle
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, rotHandleY, 4, -Math.PI * 0.7, Math.PI * 0.4);
        ctx.stroke();
        // Arrow tip
        const tipAngle = Math.PI * 0.4;
        const tipX = mx + Math.cos(tipAngle) * 4;
        const tipY = rotHandleY + Math.sin(tipAngle) * 4;
        ctx.beginPath();
        ctx.moveTo(tipX - 2, tipY - 3);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX + 3, tipY - 1);
        ctx.stroke();

        // Resize handles
        const allHandles = [
          // Corners
          { x: s.x, y: s.y },
          { x: s.x + s.width, y: s.y },
          { x: s.x, y: s.y + s.height },
          { x: s.x + s.width, y: s.y + s.height },
          // Edge midpoints
          { x: mx, y: s.y },
          { x: s.x + s.width, y: my },
          { x: mx, y: s.y + s.height },
          { x: s.x, y: my },
        ];
        // White outline + indigo fill
        allHandles.forEach((h) => {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(h.x - hs / 2 - 1, h.y - hs / 2 - 1, hs + 2, hs + 2);
          ctx.fillStyle = '#4F46E5';
          ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        });

        ctx.restore(); // end rotation transform for selection handles
      }
    }

    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, zones, tables, obstacles, selectedId, showGrid, zoom, panOffset]);

  // ─── Zoom with scroll ─────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.25, Math.min(3, prev + delta)));
  };

  // ─── Loading state ────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading floor plan...</p>
        </div>
      </div>
    );
  }

  if (!layout) return null;

  const selected = getSelected();

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -m-6 -mt-2">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/t/${tenantId}/admin/floor-plans`)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">{layout.name}</h2>
            <p className="text-xs text-gray-400">{layout.location.name} · v{layout.version}</p>
          </div>
          <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
            layout.status === 'published' ? 'bg-green-100 text-green-700' :
            layout.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
          }`}>{layout.status}</span>
        </div>

        {/* Tool buttons — enhanced with SVG icons + labels */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {/* Select */}
          <button
            onClick={() => setTool('select')}
            title="Select (V)"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              tool === 'select' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Select
          </button>
          {/* Pan */}
          <button
            onClick={() => setTool('pan')}
            title="Pan (H)"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              tool === 'pan' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 11V6a2 2 0 00-4 0v1M14 10V4a2 2 0 00-4 0v6m4-3a2 2 0 014 0v4M10 10V2a2 2 0 00-4 0v9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 11a5 5 0 005 5h3.5a3.5 3.5 0 013.5 3.5v0a3.5 3.5 0 01-3.5 3.5H11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Pan
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Add Table */}
          <button
            onClick={() => setTool('add-table')}
            title="Add Table"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              tool === 'add-table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 16v4M18 16v4M12 4v12" strokeLinecap="round" />
            </svg>
            Table
          </button>
          {/* Add Zone */}
          <button
            onClick={() => setTool('add-zone')}
            title="Add Zone"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              tool === 'add-zone' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="4 2" strokeLinecap="round" />
              <path d="M12 8v8M8 12h8" strokeLinecap="round" />
            </svg>
            Zone
          </button>
          {/* Add Obstacle */}
          <button
            onClick={() => setTool('add-obstacle')}
            title="Add Obstacle"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              tool === 'add-obstacle' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="10" width="20" height="4" rx="1" strokeLinecap="round" />
              <path d="M6 10V7M18 10V7M12 10V6" strokeLinecap="round" />
            </svg>
            Obstacle
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showGrid ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            Grid
          </button>
          <button
            onClick={() => setShowProperties((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showProperties ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3v18M3 12h18M3 6h6M3 18h6M15 6h6M15 18h6" strokeLinecap="round" />
            </svg>
            Properties
          </button>
          <div className="flex items-center gap-0.5 text-xs text-gray-500 bg-gray-100 rounded-lg p-0.5 mx-1">
            <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-md font-bold">−</button>
            <span className="w-11 text-center font-medium">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-md font-bold">+</button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              dirty ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 21 17 13 7 13 7 21" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 3 7 8 15 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Tool options bar */}
      {(tool === 'add-table' || tool === 'add-obstacle' || tool === 'add-zone') && (
        <div className={`border-b px-4 py-2.5 flex items-center gap-5 flex-shrink-0 ${
          tool === 'add-table' ? 'bg-indigo-50 border-indigo-100' :
          tool === 'add-zone' ? 'bg-emerald-50 border-emerald-100' :
          'bg-amber-50 border-amber-100'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${
              tool === 'add-table' ? 'text-indigo-700' :
              tool === 'add-zone' ? 'text-emerald-700' :
              'text-amber-700'
            }`}>
              {tool === 'add-table' && '🪑 Click canvas to place table'}
              {tool === 'add-zone' && '📐 Click canvas to place zone'}
              {tool === 'add-obstacle' && '🧱 Click canvas to place obstacle'}
            </span>
          </div>

          {tool === 'add-table' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-indigo-600">Shape</label>
                <select
                  value={addTableShape}
                  onChange={(e) => setAddTableShape(e.target.value)}
                  className="text-sm px-3 py-1.5 border border-indigo-200 rounded-lg bg-white font-medium text-gray-700 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                >
                  {TABLE_SHAPES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-indigo-600">Category</label>
                <select
                  value={addTableCategory}
                  onChange={(e) => setAddTableCategory(e.target.value)}
                  className="text-sm px-3 py-1.5 border border-indigo-200 rounded-lg bg-white font-medium text-gray-700 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                >
                  {Object.entries(CATEGORY_COLORS).map(([k]) => (
                    <option key={k} value={k}>{k.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tool === 'add-obstacle' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-amber-600">Kind</label>
              <select
                value={addObstacleKind}
                onChange={(e) => setAddObstacleKind(e.target.value)}
                className="text-sm px-3 py-1.5 border border-amber-200 rounded-lg bg-white font-medium text-gray-700 focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
              >
                {OBSTACLE_KINDS.map((k) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
          )}

          <button
            onClick={() => setTool('select')}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white/60"
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Main area: Canvas + Properties */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          style={{ cursor: isRotating ? 'grabbing' : resizeHandle ? handleCursorForResize(resizeHandle) : tool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : tool === 'select' ? cursorStyle : 'crosshair' }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          {/* Element counts overlay */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="px-2 py-1 bg-white/90 rounded text-xs text-gray-600 shadow-sm">
              {zones.length} zones
            </span>
            <span className="px-2 py-1 bg-white/90 rounded text-xs text-gray-600 shadow-sm">
              {tables.length} tables
            </span>
            <span className="px-2 py-1 bg-white/90 rounded text-xs text-gray-600 shadow-sm">
              {obstacles.length} obstacles
            </span>
            <span className="px-2 py-1 bg-white/90 rounded text-xs text-gray-600 shadow-sm">
              {tables.reduce((s, t) => s + t.capacity, 0)} total capacity
            </span>
          </div>
        </div>

        {/* Properties Panel */}
        {showProperties && (
          <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            {selected ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm capitalize">{selectedType} Properties</h3>
                  <div className="flex gap-1">
                    <button onClick={duplicateSelected} title="Duplicate" className="p-1 text-gray-400 hover:text-indigo-600 rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button onClick={deleteSelected} title="Delete" className="p-1 text-gray-400 hover:text-red-600 rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Table properties */}
                {selectedType === 'table' && (() => {
                  const t = selected as Table & { chairs: Chair[] };
                  return (
                    <div className="space-y-3">
                      <Field label="Label">
                        <input value={t.label} onChange={(e) => updateSelected('label', e.target.value)} className="field-input" />
                      </Field>
                      <Field label="Friendly Name">
                        <input value={t.friendlyName || ''} onChange={(e) => updateSelected('friendlyName', e.target.value || null)} className="field-input" placeholder="e.g., VIP Booth" />
                      </Field>
                      <Field label="Shape">
                        <select value={t.shape} onChange={(e) => {
                          const newShape = e.target.value;
                          const count = t.chairs?.length || 0;
                          const positions = generateChairPositions(count, newShape, t.width, t.height);
                          const chairs: Chair[] = positions.map((p, i) => ({
                            id: t.chairs?.[i]?.id || uuid(),
                            tableId: t.id,
                            offsetX: p.offsetX, offsetY: p.offsetY,
                            rotation: p.rotation,
                            chairType: t.chairs?.[i]?.chairType || 'normal',
                          }));
                          setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, shape: newShape, chairs } : tb));
                          setDirty(true);
                        }} className="field-input">
                          {TABLE_SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Width">
                          <input type="number" value={t.width} min={20} onChange={(e) => {
                            const nw = Math.max(20, +e.target.value);
                            const count = t.chairs?.length || 0;
                            const positions = generateChairPositions(count, t.shape, nw, t.height);
                            const chairs: Chair[] = positions.map((p, i) => ({
                              id: t.chairs?.[i]?.id || uuid(),
                              tableId: t.id,
                              offsetX: p.offsetX, offsetY: p.offsetY,
                              rotation: p.rotation,
                              chairType: t.chairs?.[i]?.chairType || 'normal',
                            }));
                            setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, width: nw, chairs } : tb));
                            setDirty(true);
                          }} className="field-input" />
                        </Field>
                        <Field label="Height">
                          <input type="number" value={t.height} min={20} onChange={(e) => {
                            const nh = Math.max(20, +e.target.value);
                            const count = t.chairs?.length || 0;
                            const positions = generateChairPositions(count, t.shape, t.width, nh);
                            const chairs: Chair[] = positions.map((p, i) => ({
                              id: t.chairs?.[i]?.id || uuid(),
                              tableId: t.id,
                              offsetX: p.offsetX, offsetY: p.offsetY,
                              rotation: p.rotation,
                              chairType: t.chairs?.[i]?.chairType || 'normal',
                            }));
                            setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, height: nh, chairs } : tb));
                            setDirty(true);
                          }} className="field-input" />
                        </Field>
                      </div>
                      <Field label="Rotation (°)">
                        <input type="number" value={t.rotation} min={0} max={360} onChange={(e) => updateSelected('rotation', +e.target.value)} className="field-input" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Capacity">
                          <input type="number" value={t.capacity} min={1} onChange={(e) => {
                            const newCap = Math.max(1, +e.target.value);
                            const currentCount = t.chairs?.length || 0;
                            // If reducing capacity below current chair count, trim chairs
                            if (newCap < currentCount) {
                              const positions = generateChairPositions(newCap, t.shape, t.width, t.height);
                              const chairs: Chair[] = positions.map((p, i) => ({
                                id: t.chairs?.[i]?.id || uuid(),
                                tableId: t.id,
                                offsetX: p.offsetX, offsetY: p.offsetY,
                                rotation: p.rotation,
                                chairType: t.chairs?.[i]?.chairType || 'normal',
                              }));
                              setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, capacity: newCap, chairs } : tb));
                            } else {
                              setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, capacity: newCap } : tb));
                            }
                            setDirty(true);
                          }} className="field-input" />
                        </Field>
                        <Field label="Min Capacity">
                          <input type="number" value={t.minCapacity} min={1} max={t.capacity} onChange={(e) => updateSelected('minCapacity', Math.min(+e.target.value, t.capacity))} className="field-input" />
                        </Field>
                      </div>
                      <Field label="Category">
                        <select value={t.category} onChange={(e) => {
                          updateSelected('category', e.target.value);
                          updateSelected('color', CATEGORY_COLORS[e.target.value] || '#6366F1');
                        }} className="field-input">
                          {Object.entries(CATEGORY_COLORS).map(([k]) => (
                            <option key={k} value={k}>{k.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Color">
                        <input type="color" value={t.color} onChange={(e) => updateSelected('color', e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                      </Field>
                      <Field label="Status">
                        <select value={t.status} onChange={(e) => updateSelected('status', e.target.value)} className="field-input">
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                          <option value="seasonal">Seasonal</option>
                        </select>
                      </Field>
                      <Field label="Zone">
                        <select value={t.zoneId || ''} onChange={(e) => updateSelected('zoneId', e.target.value || null)} className="field-input">
                          <option value="">No zone</option>
                          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Notes">
                        <textarea value={t.notes || ''} onChange={(e) => updateSelected('notes', e.target.value || null)} className="field-input" rows={2} placeholder="Special instructions..." />
                      </Field>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={t.isLocked} onChange={(e) => updateSelected('isLocked', e.target.checked)} className="rounded" />
                        Lock position
                      </label>
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        <label className="block text-xs font-medium text-gray-500">Chairs</label>
                        {/* +/- stepper */}
                        <div className="flex items-center gap-2">
                          <button
                            disabled={(t.chairs?.length || 0) === 0}
                            onClick={() => {
                              const newCount = Math.max(0, (t.chairs?.length || 0) - 1);
                              const positions = generateChairPositions(newCount, t.shape, t.width, t.height);
                              const chairs: Chair[] = positions.map((p, i) => ({
                                id: t.chairs?.[i]?.id || uuid(),
                                tableId: t.id,
                                offsetX: p.offsetX, offsetY: p.offsetY,
                                rotation: p.rotation,
                                chairType: t.chairs?.[i]?.chairType || 'normal',
                              }));
                              setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, chairs } : tb));
                              setDirty(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-gray-800">{t.chairs?.length || 0}<span className="text-[10px] font-normal text-gray-400">/{t.capacity}</span></span>
                          <button
                            disabled={(t.chairs?.length || 0) >= t.capacity}
                            onClick={() => {
                              const newCount = Math.min((t.chairs?.length || 0) + 1, t.capacity);
                              const positions = generateChairPositions(newCount, t.shape, t.width, t.height);
                              const chairs: Chair[] = positions.map((p, i) => ({
                                id: t.chairs?.[i]?.id || uuid(),
                                tableId: t.id,
                                offsetX: p.offsetX, offsetY: p.offsetY,
                                rotation: p.rotation,
                                chairType: t.chairs?.[i]?.chairType || 'normal',
                              }));
                              setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, chairs } : tb));
                              setDirty(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                          >
                            +
                          </button>
                        </div>
                        {/* Quick actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const count = t.chairs?.length || 0;
                              if (count === 0) return;
                              const positions = generateChairPositions(count, t.shape, t.width, t.height);
                              const chairs: Chair[] = positions.map((p, i) => ({
                                id: t.chairs?.[i]?.id || uuid(),
                                tableId: t.id,
                                offsetX: p.offsetX, offsetY: p.offsetY,
                                rotation: p.rotation,
                                chairType: t.chairs?.[i]?.chairType || 'normal',
                              }));
                              setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, chairs } : tb));
                              setDirty(true);
                            }}
                            className="flex-1 px-2 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-center"
                          >
                            ↻ Rearrange
                          </button>
                          <button
                            onClick={() => {
                              const positions = generateChairPositions(t.capacity, t.shape, t.width, t.height);
                              const chairs: Chair[] = positions.map((p, i) => ({
                                id: t.chairs?.[i]?.id || uuid(),
                                tableId: t.id,
                                offsetX: p.offsetX, offsetY: p.offsetY,
                                rotation: p.rotation,
                                chairType: t.chairs?.[i]?.chairType || 'normal',
                              }));
                              setTables((prev) => prev.map((tb) => tb.id === t.id ? { ...tb, chairs } : tb));
                              setDirty(true);
                            }}
                            className="flex-1 px-2 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md text-center"
                          >
                            = Match capacity ({t.capacity})
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Zone properties */}
                {selectedType === 'zone' && (() => {
                  const z = selected as Zone;
                  return (
                    <div className="space-y-3">
                      <Field label="Name">
                        <input value={z.name} onChange={(e) => updateSelected('name', e.target.value)} className="field-input" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Width">
                          <input type="number" value={z.width} onChange={(e) => updateSelected('width', +e.target.value)} className="field-input" />
                        </Field>
                        <Field label="Height">
                          <input type="number" value={z.height} onChange={(e) => updateSelected('height', +e.target.value)} className="field-input" />
                        </Field>
                      </div>
                      <Field label="Color">
                        <input type="color" value={z.color} onChange={(e) => updateSelected('color', e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                      </Field>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={z.isLocked} onChange={(e) => updateSelected('isLocked', e.target.checked)} className="rounded" />
                        Lock position
                      </label>
                    </div>
                  );
                })()}

                {/* Obstacle properties */}
                {selectedType === 'obstacle' && (() => {
                  const o = selected as Obstacle;
                  return (
                    <div className="space-y-3">
                      <Field label="Kind">
                        <select value={o.kind} onChange={(e) => updateSelected('kind', e.target.value)} className="field-input">
                          {OBSTACLE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </Field>
                      <Field label="Label">
                        <input value={o.label || ''} onChange={(e) => updateSelected('label', e.target.value || null)} className="field-input" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Width">
                          <input type="number" value={o.width} onChange={(e) => updateSelected('width', +e.target.value)} className="field-input" />
                        </Field>
                        <Field label="Height">
                          <input type="number" value={o.height} onChange={(e) => updateSelected('height', +e.target.value)} className="field-input" />
                        </Field>
                      </div>
                      <Field label="Rotation">
                        <div className="flex items-center gap-1.5">
                          <input type="number" value={o.rotation} min={0} max={360} step={15} onChange={(e) => updateSelected('rotation', ((+e.target.value % 360) + 360) % 360)} className="field-input flex-1" />
                          <span className="text-[10px] text-gray-400">°</span>
                          <button onClick={() => updateSelected('rotation', ((o.rotation - 45) % 360 + 360) % 360)} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs" title="Rotate −45°">↶</button>
                          <button onClick={() => updateSelected('rotation', (o.rotation + 45) % 360)} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs" title="Rotate +45°">↷</button>
                          <button onClick={() => updateSelected('rotation', (o.rotation + 90) % 360)} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 text-[10px] font-medium" title="Rotate +90°">90</button>
                        </div>
                      </Field>
                      <Field label="Color">
                        <input type="color" value={o.color} onChange={(e) => updateSelected('color', e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                      </Field>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={o.isLocked} onChange={(e) => updateSelected('isLocked', e.target.checked)} className="rounded" />
                        Lock position
                      </label>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-400 mt-12">
                <p className="mb-2">Select an element to edit its properties</p>
                <p className="text-xs">
                  Or use the toolbar to add tables, zones, and obstacles
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline styles for property fields */}
      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 0.375rem 0.5rem;
          border: 1px solid #D1D5DB;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          background: white;
        }
        .field-input:focus {
          outline: none;
          border-color: #6366F1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
        }
      `}</style>
    </div>
  );
}

// ─── Field component ─────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
