import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Limpia el RUT quitando puntos, guiones y espacios, convirtiendo a mayúsculas.
 */
export function limpiarRut(rut: string): string {
  if (!rut) return '';
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Valida un RUT chileno usando el algoritmo Módulo 11.
 */
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

  if (resto === 11) {
    dvEsperado = '0';
  } else if (resto === 10) {
    dvEsperado = 'K';
  } else {
    dvEsperado = resto.toString();
  }

  return dv === dvEsperado;
}

/**
 * Formatea un RUT a formato estándar limpio: 12345678-K
 */
export function formatearRut(rutRaw: string): string {
  const limpio = limpiarRut(rutRaw);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1).toUpperCase();
  return `${cuerpo}-${dv}`;
}

@ValidatorConstraint({ name: 'isRutChileno', async: false })
export class IsRutChilenoConstraint implements ValidatorConstraintInterface {
  validate(rut: any): boolean {
    return typeof rut === 'string' && validarRutChileno(rut);
  }

  defaultMessage(): string {
    return 'El RUT no es válido o tiene formato incorrecto.';
  }
}

export function IsRutChileno(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRutChilenoConstraint,
    });
  };
}
