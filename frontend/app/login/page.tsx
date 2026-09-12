'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './login.module.css';

interface ToastState {
  title: string;
  message: string;
  icon: string;
}

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  function triggerToast(title: string, message: string, icon = 'ℹ️') {
    setToast({ title, message, icon });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess('Sesión iniciada correctamente. Redirigiendo...');
      console.log('Sesión iniciada:', data.session);
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(`Enlace enviado a ${email.trim()}. Revisa tu bandeja de entrada.`);
        triggerToast('Correo enviado', 'Instrucciones enviadas correctamente a tu correo.', '📬');
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* Notificación flotante (Toast) */}
      {toast && (
        <div className={styles.toastContainer} role="alert">
          <span className={styles.toastIcon}>{toast.icon}</span>
          <div className={styles.toastContent}>
            <div className={styles.toastTitle}>{toast.title}</div>
            <div className={styles.toastMessage}>{toast.message}</div>
          </div>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      )}

      {/* Columna Izquierda: Logo e Identidad */}
      <div className={styles.heroSide}>
        <div className={styles.heroContent}>
          <div className={styles.logoWrapper}>
            <img
              src="/assets/logo.png"
              alt="GearCore - Automotive Workshop ERP"
              className={styles.heroImage}
            />
          </div>
          <h1 className={styles.heroTitle}>Bienvenido</h1>
          <p className={styles.heroSubtitle}>
            El núcleo operativo para talleres mecánicos. Gestión integral de órdenes de
            trabajo, inventario, cotizaciones y clientes.
          </p>
        </div>
      </div>

      {/* Columna Derecha: Card interactiva */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          {view === 'login' ? (
            /* Vista 1: Iniciar Sesión */
            <>
              <h2 className={styles.cardTitle}>Iniciar Sesión</h2>

              <form onSubmit={handleLoginSubmit} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="Ingresa tu correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Contraseña</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${styles.input} ${styles.passwordInput}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.eyeBtn}
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <a
                  href="#recuperar"
                  onClick={(e) => {
                    e.preventDefault();
                    setError(null);
                    setSuccess(null);
                    setView('reset');
                  }}
                  className={styles.forgotLink}
                >
                  ¿Olvidaste tu contraseña?
                </a>

                {error && <div className={styles.errorBanner}>{error}</div>}
                {success && <div className={styles.successBanner}>{success}</div>}

                <button type="submit" disabled={loading} className={styles.submitBtn}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>

              {/* Accesos rápidos provisorios para pruebas */}
              <div className={styles.demoBox}>
                <div className={styles.demoTitle}>
                  <span>Accesos rápidos (Pruebas)</span>
                  <span>Clave: Password123!</span>
                </div>
                <div className={styles.demoButtons}>
                  <button
                    type="button"
                    className={styles.demoBtn}
                    onClick={() => {
                      setEmail('admin@gearcore.cl');
                      setPassword('Password123!');
                    }}
                    title="Clic para autocompletar"
                  >
                    <span><strong>Admin:</strong> admin@gearcore.cl</span>
                    <span className={styles.demoBadge}>ADMIN</span>
                  </button>
                  <button
                    type="button"
                    className={styles.demoBtn}
                    onClick={() => {
                      setEmail('recepcion@gearcore.cl');
                      setPassword('Password123!');
                    }}
                    title="Clic para autocompletar"
                  >
                    <span><strong>Recepción:</strong> recepcion@gearcore.cl</span>
                    <span className={styles.demoBadge}>RECEPCIÓN</span>
                  </button>
                  <button
                    type="button"
                    className={styles.demoBtn}
                    onClick={() => {
                      setEmail('mecanico@gearcore.cl');
                      setPassword('Password123!');
                    }}
                    title="Clic para autocompletar"
                  >
                    <span><strong>Mecánico:</strong> mecanico@gearcore.cl</span>
                    <span className={styles.demoBadge}>MECÁNICO</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Vista 2: Recuperar Contraseña */
            <>
              <h2 className={styles.cardTitle}>Recuperar Contraseña</h2>
              <p className={styles.cardSubtitle}>
                Ingresa tu correo para recibir un enlace de restablecimiento.
              </p>

              <form onSubmit={handleResetSubmit} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="Ingresa tu correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                {error && <div className={styles.errorBanner}>{error}</div>}
                {success && <div className={styles.successBanner}>{success}</div>}

                <button type="submit" disabled={loading} className={styles.submitBtn}>
                  {loading ? 'Enviando enlace...' : 'Enviar Enlace'}
                </button>

                <a
                  href="#login"
                  onClick={(e) => {
                    e.preventDefault();
                    setError(null);
                    setSuccess(null);
                    setView('login');
                  }}
                  className={styles.backLink}
                >
                  ← Volver a Iniciar Sesión
                </a>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
