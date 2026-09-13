export function limpiarRut(rut: string): string {
  if (!rut) return '';
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

export function validarRutChileno(rutRaw: string): boolean {
  if (!rutRaw || typeof rutRaw !== 'string') return false;
  const rutLimpio = limpiarRut(rutRaw);
  if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;

  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const resto = 11 - (suma % 11);
  let dvEsperado = '';
  if (resto === 11) dvEsperado = '0';
  else if (resto === 10) dvEsperado = 'K';
  else dvEsperado = resto.toString();

  return dv === dvEsperado;
}

export function formatearRut(rutRaw: string): string {
  const limpio = limpiarRut(rutRaw);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1).toUpperCase();

  // Opcional con puntos: 12.345.678-K
  const formattedCuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedCuerpo}-${dv}`;
}

export function limpiarPatente(patente: string): string {
  if (!patente) return '';
  return patente.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function validarPatenteChilena(patenteRaw: string): boolean {
  if (!patenteRaw || typeof patenteRaw !== 'string') return false;
  const patente = limpiarPatente(patenteRaw);

  const formatoAntiguoAuto = /^[A-Z]{2}[0-9]{4}$/;
  const formatoNuevoAuto = /^[BCDFGHJKLPRSTVWXYZ]{4}[0-9]{2}$/;
  const formatoAntiguoMoto = /^[A-Z]{2}[0-9]{3}$/;
  const formatoNuevoMoto = /^[BCDFGHJKLPRSTVWXYZ]{3}[0-9]{2}$/;

  return (
    formatoAntiguoAuto.test(patente) ||
    formatoNuevoAuto.test(patente) ||
    formatoAntiguoMoto.test(patente) ||
    formatoNuevoMoto.test(patente)
  );
}

export function formatearPatente(patenteRaw: string): string {
  return limpiarPatente(patenteRaw);
}
