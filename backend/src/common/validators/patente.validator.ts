import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Limpia la patente eliminando espacios, guiones y puntos, convirtiendo a mayúsculas.
 */
export function limpiarPatente(patente: string): string {
  if (!patente) return '';
  return patente.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Valida si una patente corresponde al formato chileno:
 * 1. Formato Antiguo Autos (hasta 2007): 2 letras + 4 números (ej: AB1234).
 * 2. Formato Nuevo Autos (desde 2007): 4 consonantes (sin vocales ni M, N, Ñ, Q) + 2 números (ej: BCDF10).
 * 3. Formato Motos (antiguo 2 letras + 3 números, o nuevo 3 consonantes + 2 números).
 */
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

/**
 * Formatea una patente a su representación estándar (mayúsculas y sin caracteres especiales).
 */
export function formatearPatente(patenteRaw: string): string {
  return limpiarPatente(patenteRaw);
}

@ValidatorConstraint({ name: 'isPatenteChilena', async: false })
export class IsPatenteChilenaConstraint implements ValidatorConstraintInterface {
  validate(patente: any): boolean {
    return typeof patente === 'string' && validarPatenteChilena(patente);
  }

  defaultMessage(): string {
    return 'La patente debe tener un formato chileno válido (ej: AA1000 o BBBB10).';
  }
}

export function IsPatenteChilena(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPatenteChilenaConstraint,
    });
  };
}
