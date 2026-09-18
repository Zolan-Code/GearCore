-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "TipoItemCotizacion" AS ENUM ('REPUESTO', 'MANO_DE_OBRA', 'SERVICIO_EXTERNO', 'OTRO');

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "ordenTrabajoId" TEXT NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "validezDias" INTEGER NOT NULL DEFAULT 15,
    "fechaVencimiento" TIMESTAMP(3),
    "observaciones" TEXT,
    "horasHombre" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHoraHombre" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoHoraHombre" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalRepuestos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalManoObra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalOtros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalNeto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aplicaIva" BOOLEAN NOT NULL DEFAULT true,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoRepuestos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoManoObra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoOtros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margenNeto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcentajeMargen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_cotizacion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "tipo" "TipoItemCotizacion" NOT NULL DEFAULT 'REPUESTO',
    "referenciaId" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "items_cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_precios_cotizaciones" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "totalAnterior" DOUBLE PRECISION NOT NULL,
    "subtotalAnterior" DOUBLE PRECISION NOT NULL,
    "totalNuevo" DOUBLE PRECISION NOT NULL,
    "subtotalNuevo" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalles" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_precios_cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_ordenTrabajoId_key" ON "cotizaciones"("ordenTrabajoId");

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cotizacion" ADD CONSTRAINT "items_cotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precios_cotizaciones" ADD CONSTRAINT "historial_precios_cotizaciones_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precios_cotizaciones" ADD CONSTRAINT "historial_precios_cotizaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "perfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
