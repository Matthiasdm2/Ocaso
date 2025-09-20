"use client";
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import ChatDock from './ChatDock';

interface OpenDockEventDetail { conversationId: string; title?: string }

type DockState = { id: string; title: string; minimized: boolean };

export default function ChatDockManager() {
  const [docks, setDocks] = useState<DockState[]>([]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const pathname = usePathname();
  const [bottomOffset, setBottomOffset] = useState(16); // px

  const openDock = useCallback((id: string, title?: string) => {
    setDocks(prev => {
      // already open -> un-minimize & bring front
      const existing = prev.find(d => d.id === id);
      if (existing) {
        return [ { ...existing, minimized: false }, ...prev.filter(d => d.id !== id) ];
      }
      return [ { id, title: title || 'Chat', minimized: false }, ...prev ].slice(0,4); // max 4
    });
  }, []);

  const closeDock = (id: string) => setDocks(prev => prev.filter(d => d.id !== id));
  const toggleMin = (id: string, v: boolean) => setDocks(prev => prev.map(d => d.id === id ? { ...d, minimized: v } : d));
  const updateWidth = (id: string, w: number) => setWidths(prev => prev[id] === w ? prev : { ...prev, [id]: w });

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<OpenDockEventDetail>).detail;
      if (!detail?.conversationId) return;
      openDock(detail.conversationId, detail.title);
    }
    window.addEventListener('ocaso:open-chat-dock', handler as EventListener);
    return () => window.removeEventListener('ocaso:open-chat-dock', handler as EventListener);
  }, [openDock]);

  // Close all docks on route change (navigation) to avoid stale floating windows
  useEffect(() => {
    if (docks.length) setDocks([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Listen for dynamic offset changes (e.g. cookie bar / mobile nav) via custom event
  useEffect(() => {
    function onOffset(e: Event) {
      const detail = (e as CustomEvent<{ bottom?: number }>).detail;
      if (detail && typeof detail.bottom === 'number') {
        setBottomOffset(Math.max(0, Math.min(200, Math.round(detail.bottom))));
      }
    }
    window.addEventListener('ocaso:set-chat-offset', onOffset as EventListener);
    return () => window.removeEventListener('ocaso:set-chat-offset', onOffset as EventListener);
  }, []);

  // Increase for iOS safe area if present
  useEffect(() => {
    const safe = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0', 10);
    if (Number.isFinite(safe) && safe > 0) setBottomOffset(b => b + safe);
  }, []);

  // Hide manager on full-screen or auth pages to reduce clutter
  const hiddenPrefixes = ['/login', '/register', '/sell', '/profile/chats/'];
  const hiddenExact: string[] = []; // allow bubbles on /profile/chats list page
  if (hiddenExact.includes(pathname) || hiddenPrefixes.some(p => pathname.startsWith(p))) {
    return null;
  }

  if (!docks.length) return null;
  return (
    <div className="pointer-events-none">
      {docks.map((d, idx) => {
        // Calculate shiftLeft = sum of widths (+gaps) of preceding non-minimized docks
        const gap = 20; // spacing between full docks
        const preceding = docks.slice(0, idx);
        const shiftLeft = preceding.filter(x => !x.minimized)
          .reduce((sum, x) => sum + (widths[x.id] || 420) + gap, 0);
        // bubbleIndex counts previous minimized docks (for stacking smaller bubbles)
        const bubbleIndex = preceding.filter(x => x.minimized).length;
        return (
          <div key={d.id} className="pointer-events-auto">
            <ChatDock
              chatId={d.id}
              title={d.title}
              index={idx}
              minimized={d.minimized}
              bottomOffset={bottomOffset}
              shiftLeft={shiftLeft}
              bubbleIndex={bubbleIndex}
              onReportWidth={(w) => updateWidth(d.id, w)}
              onMinimize={(v) => toggleMin(d.id, v)}
              onClose={() => closeDock(d.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
