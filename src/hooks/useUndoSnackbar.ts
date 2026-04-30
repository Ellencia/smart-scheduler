import { useState, useRef, useCallback } from 'react';
import { usePendingScheduleStore } from '../stores/pendingScheduleStore';
import type { Schedule } from '../types/schedule';

const UNDO_DURATION_MS = 7000;

interface SnackbarEntry {
  id: string;
  previousStatus: Schedule['status'];
  message: string;
}

export function useUndoSnackbar() {
  const restore = usePendingScheduleStore((s) => s.restore);
  const [entry, setEntry] = useState<SnackbarEntry | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (id: string, previousStatus: Schedule['status'], message = '일정이 무시되었습니다') => {
      if (timer.current) clearTimeout(timer.current);
      setEntry({ id, previousStatus, message });
      timer.current = setTimeout(() => setEntry(null), UNDO_DURATION_MS);
    },
    []
  );

  const undo = useCallback(() => {
    if (!entry) return;
    if (timer.current) clearTimeout(timer.current);
    restore(entry.id, entry.previousStatus);
    setEntry(null);
  }, [entry, restore]);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setEntry(null);
  }, []);

  return { entry, show, undo, dismiss };
}
