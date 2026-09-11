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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  async function handleForgotPassword(e: React.MouseEvent) {
    e.preventDefault();

    if (!email.trim()) {
      triggerToast(
        'Recuperación de contraseña',
        'Escribe tu correo en el formulario para enviarte el enlace o contacta al administrador.',
        '🔑',
      );
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        triggerToast(
          'Aviso de recuperación',
          'No se pudo enviar el correo automático. Contacta al administrador del taller.',
          '⚠️',
        );
      } else {
        triggerToast(
          'Correo enviado',
          `Enviamos las instrucciones a ${email.trim()}. Revisa tu bandeja de entrada.`,
          '📬',
        );
      }
    } catch {
      triggerToast(
        'Aviso de recuperación',
        'Contacta al administrador del taller para restablecer tus credenciales.',
        'ℹ️',
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
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

      {/* Columna Derecha: Card de Login */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
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
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <a
              href="#recuperar"
              onClick={handleForgotPassword}
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
        </div>
      </div>
    </div>
  );
}
