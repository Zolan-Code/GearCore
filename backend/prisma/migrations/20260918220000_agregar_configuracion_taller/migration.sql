-- CreateTable
CREATE TABLE "configuracion_taller" (
    "id" TEXT NOT NULL DEFAULT 'taller-config',
    "nombreComercial" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "ivaPorDefecto" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "validezDiasPorDefecto" INTEGER NOT NULL DEFAULT 15,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_taller_pkey" PRIMARY KEY ("id")
);

-- Inserción inicial singleton de configuración (fila única fija)
INSERT INTO "configuracion_taller" (
    "id",
    "nombreComercial",
    "rut",
    "direccion",
    "telefono",
    "email",
    "logoUrl",
    "ivaPorDefecto",
    "validezDiasPorDefecto",
    "actualizadoEn"
) VALUES (
    'taller-config',
    'GearCore Taller Demo',
    '00.000.000-0',
    'Av. Concha y Toro 1234, Puente Alto',
    '+56 9 1234 5678',
    'contacto@tallergearcore.cl',
    NULL,
    19,
    15,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
