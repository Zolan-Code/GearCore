export interface InputCalculoMargen {
  costoRepuestos: number;
  costoManoObra: number;
  costoOtros?: number;
  subtotalNeto: number;
}

export interface ResultadoCalculoMargen {
  costoTotal: number;
  margenNeto: number;
  porcentajeMargen: number;
}

export interface ICalculadorMargen {
  calcular(input: InputCalculoMargen): ResultadoCalculoMargen;
}
