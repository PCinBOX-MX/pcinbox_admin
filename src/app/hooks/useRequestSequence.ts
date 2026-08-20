"use client";

import { useCallback, useRef } from "react";

/**
 * Evita que una respuesta lenta pise resultados de una petición más reciente
 * (usuario tipeando / cambiando filtros rápido).
 */
export function useRequestSequence() {
  const sequenceRef = useRef(0);

  const nextSequence = useCallback(() => {
    sequenceRef.current += 1;
    return sequenceRef.current;
  }, []);

  const isCurrent = useCallback((sequence: number) => {
    return sequence === sequenceRef.current;
  }, []);

  const invalidate = useCallback(() => {
    sequenceRef.current += 1;
  }, []);

  return { nextSequence, isCurrent, invalidate };
}
