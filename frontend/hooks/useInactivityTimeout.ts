import { useEffect, useRef, useState, useCallback } from 'react';

interface InactivityOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export function useInactivityTimeout({
  timeoutMinutes = 15,
  warningMinutes = 1,
  onTimeout,
  enabled = true,
}: InactivityOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningMinutes * 60);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    setShowWarning(false);
    setSecondsRemaining(warningMinutes * 60);

    // 1. Timer para mostrar advertencia previa
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      let count = warningMinutes * 60;
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        setSecondsRemaining(count);
        if (count <= 0 && countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }, 1000);
    }, warningMs);

    // 2. Timer final para cerrar sesión
    logoutTimerRef.current = setTimeout(() => {
      clearTimers();
      onTimeout();
    }, timeoutMs);
  }, [enabled, timeoutMs, warningMs, warningMinutes, onTimeout, clearTimers]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      // Si la advertencia está en pantalla, no reiniciar inmediatamente con mousemove para que el usuario presione el botón explícitamente
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleActivity));
    resetTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearTimers();
    };
  }, [enabled, showWarning, resetTimer, clearTimers]);

  return {
    showWarning,
    secondsRemaining,
    mantenerSesionActiva: resetTimer,
  };
}
