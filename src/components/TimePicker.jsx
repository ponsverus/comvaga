import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function TimePicker({ value, onChange, triggerClassName = '' }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('h');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  const triggerRef = useRef(null);
  const canvasRef = useRef(null);
  const dragging = useRef(false);
  const modeRef = useRef('h');
  const hourRef = useRef(8);
  const minuteRef = useRef(0);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { hourRef.current = hour; }, [hour]);
  useEffect(() => { minuteRef.current = minute; }, [minute]);

  const pad = (n) => String(n).padStart(2, '0');
  const display = value ? String(value).slice(0, 5) : '-';
  const ang = useCallback((i, total) => (i / total) * Math.PI * 2 - Math.PI / 2, []);

  const drawHours = useCallback((ctx, cx, cy) => {
    const am = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    am.forEach((n, i) => {
      const a = ang(i, 12);
      const x = cx + 96 * Math.cos(a);
      const y = cy + 96 * Math.sin(a);
      const active = hour === n;
      if (active) {
        ctx.beginPath();
        ctx.arc(x, y, 19, 0, Math.PI * 2);
        ctx.fillStyle = '#d4a017';
        ctx.fill();
      }
      ctx.fillStyle = active ? '#000' : '#e8e8e8';
      ctx.font = `${active ? 600 : 400} 15px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), x, y);
    });

    const pm = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    pm.forEach((n, i) => {
      const a = ang(i, 12);
      const x = cx + 63 * Math.cos(a);
      const y = cy + 63 * Math.sin(a);
      const label = n === 0 ? '00' : String(n);
      const active = hour === n;
      if (active) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#d4a017';
        ctx.fill();
      }
      ctx.fillStyle = active ? '#000' : '#727272';
      ctx.font = `${active ? 600 : 400} 12px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y);
    });
  }, [ang, hour]);

  const drawMinutes = useCallback((ctx, cx, cy) => {
    const radius = 96;
    for (let i = 0; i < 60; i++) {
      const a = ang(i, 60);
      if (i % 5 !== 0) {
        ctx.beginPath();
        ctx.moveTo(cx + (radius + 5) * Math.cos(a), cy + (radius + 5) * Math.sin(a));
        ctx.lineTo(cx + (radius + 10) * Math.cos(a), cy + (radius + 10) * Math.sin(a));
        ctx.strokeStyle = '#3a3a3c';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        continue;
      }
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      const active = minute === i;
      if (active) {
        ctx.beginPath();
        ctx.arc(x, y, 19, 0, Math.PI * 2);
        ctx.fillStyle = '#d4a017';
        ctx.fill();
      }
      ctx.fillStyle = active ? '#000' : '#e8e8e8';
      ctx.font = `${active ? 600 : 400} 14px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pad(i), x, y);
    }
  }, [ang, minute]);

  const drawHand = useCallback((ctx, cx, cy) => {
    const am = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const pm = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    let angle;
    let radius;

    if (mode === 'h') {
      const isPM = hour >= 13 || hour === 0;
      radius = isPM ? 63 : 96;
      const idx = isPM ? pm.indexOf(hour) : am.indexOf(hour);
      angle = ang(idx < 0 ? 0 : idx, 12);
    } else {
      radius = 96;
      angle = ang(minute, 60);
    }

    const ex = cx + radius * Math.cos(angle);
    const ey = cy + radius * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(212,160,23,0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#d4a017';
    ctx.fill();

    const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, 22);
    gradient.addColorStop(0, 'rgba(212,160,23,0.18)');
    gradient.addColorStop(1, 'rgba(212,160,23,0)');
    ctx.beginPath();
    ctx.arc(ex, ey, 22, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [ang, hour, minute, mode]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 256;

    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1e20';
    ctx.fill();

    if (mode === 'h') {
      [96, 63].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    if (mode === 'h') drawHours(ctx, cx, cy);
    else drawMinutes(ctx, cx, cy);
    drawHand(ctx, cx, cy);
  }, [drawHand, drawHours, drawMinutes, mode]);

  useEffect(() => {
    if (open) requestAnimationFrame(draw);
  }, [open, draw]);

  function openPicker() {
    if (value) {
      const [h, m] = String(value).split(':').map(Number);
      if (Number.isFinite(h)) {
        setHour(h);
        hourRef.current = h;
      }
      if (Number.isFinite(m)) {
        setMinute(m);
        minuteRef.current = m;
      }
    } else {
      setHour(8);
      hourRef.current = 8;
      setMinute(0);
      minuteRef.current = 0;
    }
    setMode('h');
    modeRef.current = 'h';
    dragging.current = false;
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
  }

  function clearPicker() {
    onChange('');
    setOpen(false);
  }

  function confirmPicker() {
    onChange(`${pad(hourRef.current)}:${pad(minuteRef.current)}`);
    setOpen(false);
  }

  function getPoint(e) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (256 / rect.width) - 128,
      y: (clientY - rect.top) * (256 / rect.height) - 128,
    };
  }

  function resolveSelection(e) {
    const pt = getPoint(e);
    if (!pt) return;
    const { x, y } = pt;
    const dist = Math.hypot(x, y);
    const angle = Math.atan2(y, x) + Math.PI / 2;
    const norm = (angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI * 2);
    const idx12 = Math.round(norm * 12) % 12;

    if (modeRef.current === 'h') {
      const am = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const pm = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
      const nextHour = dist < 79 ? pm[idx12] : am[idx12];
      setHour(nextHour);
      hourRef.current = nextHour;
    } else {
      const nextMinute = (Math.round((norm * 60) / 5) * 5) % 60;
      setMinute(nextMinute);
      minuteRef.current = nextMinute;
    }
  }

  function handlePointerDown(e) {
    e.preventDefault();
    dragging.current = true;
    resolveSelection(e);
    if (modeRef.current === 'h') {
      setTimeout(() => {
        setMode('m');
        modeRef.current = 'm';
        dragging.current = false;
      }, 340);
    }
  }

  function handlePointerMove(e) {
    e.preventDefault();
    if (!dragging.current) return;
    resolveSelection(e);
  }

  function handlePointerUp(e) {
    e.preventDefault();
    if (!dragging.current) return;
    dragging.current = false;
    if (modeRef.current === 'm') resolveSelection(e);
  }

  const portal = open && createPortal(
    <>
      <div
        onClick={closePicker}
        className="fixed inset-0 z-[9998] bg-black/55"
      />

      <div
        className="fixed left-1/2 top-1/2 z-[9999] w-[292px] -translate-x-1/2 -translate-y-1/2 rounded-custom border border-[#2e2e30] bg-[#1c1c1e] px-4 pb-3.5 pt-4 shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
      >
        <div className="mb-2.5 flex justify-end">
          <button
            type="button"
            onClick={closePicker}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#888] transition-colors hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="mx-auto block h-[256px] w-[256px] cursor-pointer rounded-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        <div className="mt-3.5 flex justify-between">
          <button
            type="button"
            onClick={clearPicker}
            className="cursor-pointer rounded-full border border-[#3a3a3c] bg-transparent px-5 py-2 text-xs font-medium uppercase tracking-[0.06em] text-[#888]"
          >
            LIMPAR
          </button>
          <button
            type="button"
            onClick={confirmPicker}
            className="cursor-pointer rounded-full border-0 bg-[#d4a017] px-6 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-black"
          >
            DEFINIR
          </button>
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={triggerClassName || 'w-full flex items-center justify-between px-4 py-3 bg-dark-200 border border-gray-800 rounded-custom text-white hover:border-gray-700 focus:border-primary/50 focus:outline-none transition-colors'}
      >
        <span className="text-sm font-normal tabular-nums">{display}</span>
        <span className="pointer-events-none flex items-center justify-center w-5 h-5 rounded-full bg-dark-100 border border-gray-800 text-gray-400 text-xs shrink-0">
          ▾
        </span>
      </button>
      {portal}
    </>
  );
}
