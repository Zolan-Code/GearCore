import { Injectable } from '@nestjs/common';
import {
  ICalculadorMargen,
  InputCalculoMargen,
  ResultadoCalculoMargen,
} from './calculador-margen.interface';

@Injectable()
export class CalculadorMargenEstandarService implements ICalculadorMargen {
  calcular(input: InputCalculoMargen): ResultadoCalculoMargen {
    const costoRepuestos = Number(input.costoRepuestos) || 0;
    const costoManoObra = Number(input.costoManoObra) || 0;
    const costoOtros = Number(input.costoOtros) || 0;
    const subtotalNeto = Number(input.subtotalNeto) || 0;

    const costoTotal = Math.round((costoRepuestos + costoManoObra + costoOtros) * 100) / 100;
    const margenNeto = Math.round((subtotalNeto - costoTotal) * 100) / 100;

    let porcentajeMargen = 0;
    if (subtotalNeto > 0) {
      porcentajeMargen = Math.round(((margenNeto / subtotalNeto) * 100) * 100) / 100;
    }

    return {
      costoTotal,
      margenNeto,
      porcentajeMargen,
    };
  }
}
