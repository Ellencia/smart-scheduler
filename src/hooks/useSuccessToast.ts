import { useState, useRef } from 'react';

const DURATION_MS = 2500;

export function useSuccessToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    timer.current = setTimeout(() => setMessage(null), DURATION_MS);
  };

  const dismiss = () => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(null);
  };

  return { message, show, dismiss };
}
