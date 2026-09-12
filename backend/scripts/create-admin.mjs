import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Leer .env manualmente por compatibilidad universal
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas en backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const prisma = new PrismaClient();

const defaultUsers = [
  {
    email: 'admin@gearcore.cl',
    password: 'Password123!',
    nombre: 'Administrador Principal',
    rol: 'ADMINISTRADOR',
  },
  {
    email: 'recepcion@gearcore.cl',
    password: 'Password123!',
    nombre: 'Recepcionista Taller',
    rol: 'RECEPCIONISTA',
  },
  {
    email: 'mecanico@gearcore.cl',
    password: 'Password123!',
    nombre: 'Mecánico Jefe',
    rol: 'MECANICO',
  },
];

async function seed() {
  console.log('Iniciando creación de usuarios de prueba para desarrollo...\n');

  for (const u of defaultUsers) {
    let userId = null;

    // 1. Intentar crear en Supabase Auth
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, rol: u.rol },
    });

    if (createError) {
      if (createError.message.includes('already exists') || createError.status === 422) {
        // Buscar usuario existente
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find((user) => user.email === u.email);
        if (existing) {
          userId = existing.id;
          console.log(`- Usuario ${u.email} ya existía en Auth (ID: ${userId})`);
        }
      } else {
        console.error(`Error creando ${u.email} en Auth:`, createError.message);
        continue;
      }
    } else {
      userId = createData.user.id;
      console.log(`- Usuario ${u.email} creado en Auth (ID: ${userId})`);
    }

    if (!userId) continue;

    // 2. Crear o actualizar en tabla `perfiles` con Prisma
    await prisma.perfil.upsert({
      where: { id: userId },
      update: {
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        activo: true,
      },
      create: {
        id: userId,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        activo: true,
      },
    });

    console.log(`  Perfil en base de datos actualizado con rol [${u.rol}]\n`);
  }

  console.log('--------------------------------------------------');
  console.log('Usuarios de prueba listos para ingresar en el login:');
  for (const u of defaultUsers) {
    console.log(`  Rol: ${u.rol.padEnd(14)} -> Email: ${u.email.padEnd(24)} Clave: ${u.password}`);
  }
  console.log('--------------------------------------------------\n');

  await prisma.$disconnect();
}

seed().catch(async (e) => {
  console.error('Error ejecutando script:', e);
  await prisma.$disconnect();
  process.exit(1);
});
