import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Cierre automático de sesión por inactividad.
 *
 * - Tras INACTIVITY_MINUTES sin actividad (mouse, teclado, scroll, touch) se
 *   muestra un aviso con cuenta regresiva de WARNING_SECONDS.
 * - "Continuar" reinicia el temporizador; si no hay respuesta, se cierra la
 *   sesión y se redirige al login.
 * - Mientras el aviso está visible, la actividad NO reinicia el temporizador:
 *   el usuario debe confirmar explícitamente.
 */
const INACTIVITY_MINUTES = 20;
const WARNING_SECONDS = 60;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export default function InactivityHandler() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const warningActive = useRef(false);
    const lastReset = useRef(0);

    const clearTimers = useCallback(() => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);
        inactivityTimer.current = null;
        countdownInterval.current = null;
    }, []);

    const expireSession = useCallback(() => {
        clearTimers();
        warningActive.current = false;
        setShowWarning(false);
        logout();
        navigate('/login');
    }, [clearTimers, logout, navigate]);

    const startWarning = useCallback(() => {
        warningActive.current = true;
        setSecondsLeft(WARNING_SECONDS);
        setShowWarning(true);
        countdownInterval.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    expireSession();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [expireSession]);

    const startInactivityTimer = useCallback(() => {
        clearTimers();
        warningActive.current = false;
        setShowWarning(false);
        inactivityTimer.current = setTimeout(startWarning, INACTIVITY_MINUTES * 60 * 1000);
    }, [clearTimers, startWarning]);

    useEffect(() => {
        if (!isAuthenticated) {
            clearTimers();
            setShowWarning(false);
            return;
        }

        startInactivityTimer();

        const handleActivity = () => {
            if (warningActive.current) return; // durante el aviso solo cuenta el botón "Continuar"
            const now = Date.now();
            if (now - lastReset.current < 1000) return; // throttle: máx. un reinicio por segundo
            lastReset.current = now;
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(startWarning, INACTIVITY_MINUTES * 60 * 1000);
        };

        ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }));
        return () => {
            ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handleActivity));
            clearTimers();
        };
    }, [isAuthenticated, startInactivityTimer, startWarning, clearTimers]);

    if (!isAuthenticated || !showWarning) return null;

    return (
        <div className="confirm-modal-overlay" style={{ zIndex: 10000 }}>
            <div className="confirm-modal glass-panel slide-up">
                <div className="confirm-modal-header">
                    <Clock size={32} className="confirm-icon warning" />
                </div>
                <h3 className="confirm-modal-title">Sesión a punto de expirar</h3>
                <p className="confirm-modal-message">
                    Su sesión está a punto de expirar por inactividad.
                    Si desea continuar trabajando, haga clic en "Continuar".
                </p>
                <p style={{ textAlign: 'center', fontSize: '22px', fontWeight: 700, color: 'var(--accent-red, #ef4444)', margin: '4px 0 12px' }}>
                    {secondsLeft}s
                </p>
                <div className="confirm-modal-actions">
                    <button className="btn-secondary" onClick={expireSession}>
                        Cerrar sesión
                    </button>
                    <button className="btn-primary" onClick={startInactivityTimer}>
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
}
