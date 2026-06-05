// src/hooks/useDebouncedSave.ts
import { useCallback, useEffect, useRef } from "react";

export type DebouncedSaver = ((value: string) => void) & { flush: () => void };

export function useDebouncedSave(
  save: (value: string) => void,
  delay = 500
): DebouncedSaver {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (pending.current !== null) { saveRef.current(pending.current); pending.current = null; }
  }, []);

  const trigger = useCallback((value: string) => {
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [delay, flush]) as DebouncedSaver;

  trigger.flush = flush;

  useEffect(() => () => flush(), [flush]); // flush on unmount
  return trigger;
}
