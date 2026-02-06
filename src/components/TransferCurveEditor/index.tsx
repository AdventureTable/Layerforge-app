import { Box } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TransferCurvePoint } from '../../types';

const FIXED_XS = [0, 0.25, 0.5, 0.75, 1] as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const normalizePoints = (points: TransferCurvePoint[] | undefined | null): TransferCurvePoint[] => {
  const map = new Map<number, number>();
  for (const p of points ?? []) {
    if (typeof p?.x !== 'number' || typeof p?.y !== 'number') continue;
    map.set(p.x, clamp01(p.y));
  }

  return FIXED_XS.map((x) => ({
    x,
    y: clamp01(map.get(x) ?? x),
  }));
};

const hitRadiusPx = 10;

interface TransferCurveEditorProps {
  value: TransferCurvePoint[];
  onChange: (value: TransferCurvePoint[]) => void;
  height?: number;
}

export function TransferCurveEditor({ value, onChange, height = 110 }: TransferCurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const normalizedExternal = useMemo(() => normalizePoints(value), [value]);
  const [draft, setDraft] = useState<TransferCurvePoint[]>(normalizedExternal);
  const draftRef = useRef<TransferCurvePoint[]>(normalizedExternal);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (dragIndex !== null) return;
    setDraft(normalizedExternal);
  }, [normalizedExternal, dragIndex]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = height;
    const pad = 10;
    const innerW = Math.max(1, w - pad * 2);
    const innerH = Math.max(1, h - pad * 2);

    const xToPx = (x: number) => pad + x * innerW;
    const yToPx = (y: number) => pad + (1 - y) * innerH;

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10, 13, 15, 0.35)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(31, 174, 122, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = pad + (i / 4) * innerW;
      const gy = pad + (i / 4) * innerH;
      ctx.beginPath();
      ctx.moveTo(gx, pad);
      ctx.lineTo(gx, pad + innerH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad, gy);
      ctx.lineTo(pad + innerW, gy);
      ctx.stroke();
    }

    // Curve
    ctx.strokeStyle = 'rgba(31, 174, 122, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    draft.forEach((p, i) => {
      const px = xToPx(p.x);
      const py = yToPx(p.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Points
    for (let i = 0; i < draft.length; i++) {
      const p = draft[i];
      const px = xToPx(p.x);
      const py = yToPx(p.y);

      const isEndpoint = i === 0 || i === draft.length - 1;
      const isActive = i === dragIndex;

      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isEndpoint
        ? 'rgba(255, 255, 255, 0.85)'
        : isActive
          ? 'rgba(255, 165, 0, 0.95)'
          : 'rgba(31, 174, 122, 0.95)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(10, 13, 15, 0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [draft, dragIndex, height]);

  const pickPoint = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = height;
    const pad = 10;
    const innerW = Math.max(1, w - pad * 2);
    const innerH = Math.max(1, h - pad * 2);

    const xToPx = (x: number) => rect.left + pad + x * innerW;
    const yToPx = (y: number) => rect.top + pad + (1 - y) * innerH;

    let best: { idx: number; dist2: number } | null = null;
    for (let i = 0; i < draft.length; i++) {
      if (i === 0 || i === draft.length - 1) continue; // endpoints locked
      const px = xToPx(draft[i].x);
      const py = yToPx(draft[i].y);
      const dx = clientX - px;
      const dy = clientY - py;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= hitRadiusPx * hitRadiusPx && (!best || dist2 < best.dist2)) {
        best = { idx: i, dist2 };
      }
    }
    return best?.idx ?? null;
  };

  const updatePointFromClientY = (index: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const pad = 10;
    const innerH = Math.max(1, height - pad * 2);
    const localY = clientY - rect.top;
    const y = clamp01(1 - (localY - pad) / innerH);

    setDraft((prev) => prev.map((p, i) => (i === index ? { ...p, y } : p)));
  };

  return (
    <Box
      style={{
        width: '100%',
        height,
        borderRadius: 6,
        border: '1px solid rgba(31, 174, 122, 0.2)',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'ns-resize' }}
        onPointerDown={(e) => {
          const idx = pickPoint(e.clientX, e.clientY);
          if (idx === null) return;
          setDragIndex(idx);
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          updatePointFromClientY(idx, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragIndex === null) return;
          updatePointFromClientY(dragIndex, e.clientY);
        }}
        onPointerUp={(e) => {
          if (dragIndex === null) return;
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
          const committed = normalizePoints(draftRef.current);
          setDraft(committed);
          setDragIndex(null);
          onChange(committed);
        }}
        onPointerCancel={(e) => {
          if (dragIndex === null) return;
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
          setDraft(normalizedExternal);
          setDragIndex(null);
        }}
      />
    </Box>
  );
}
