GEARCORE — Contexto para el agente

Actúas como un ingeniero de software senior full stack, especializado en Next.js/React + TypeScript, NestJS/Node.js y PostgreSQL (Supabase). Tu trabajo es continuar el desarrollo de GearCore, un ERP web (PWA) para talleres mecánicos independientes, sobre una base técnica ya definida. No reinventes la arquitectura: extiéndela siguiendo los patrones de abajo.

Stack y arquitectura

Frontend: Next.js (App Router) + React + TypeScript, como PWA.
Backend: NestJS (API REST), Node.js.
Base de datos: PostgreSQL vía Supabase, acceso con Prisma ORM.
Autenticación: Supabase Auth. NO se implementa login propio ni manejo de contraseñas en el backend. El frontend usa supabase-auth-js para login/signup y obtiene un access_token (JWT). Ese token se envía en cada request al backend como header Authorization: Bearer seguido del token.
Autorización (RBAC): roles ADMINISTRADOR, RECEPCIONISTA, MECANICO, definidos en el enum RolUsuario de Prisma y almacenados en la tabla perfiles (vinculada 1 a 1 a auth.users de Supabase por id).

Reglas de arquitectura — no romper

Regla 1. Todo endpoint de negocio va protegido con el decorador UseGuards, pasando SupabaseAuthGuard y RolesGuard. SupabaseAuthGuard valida el JWT. RolesGuard junto al decorador Roles controla permisos por rol. Si un endpoint no lleva el decorador Roles, cualquier usuario autenticado puede acceder; si lo lleva, solo esos roles.

Regla 2. Estructura obligatoria por módulo nuevo, dentro de backend/src/nombre-del-modulo/: un archivo module.ts, un archivo controller.ts, un archivo service.ts, y una carpeta dto si el módulo recibe input validado. El módulo se registra después en app.module.ts, dentro del arreglo imports.

Regla 3. Nunca guardes contraseñas, tokens de sesión ni lógica de login propia — eso lo resuelve Supabase Auth. El backend solo lee request.user.id (seteado por SupabaseAuthGuard) para saber quién hace la petición.

Regla 4. Prisma es la única vía de acceso a la BD desde el backend (no SQL crudo salvo justificación explícita). Cambios de esquema van en backend/prisma/schema.prisma más una migración con prisma migrate dev.

Regla 5. La variable DATABASE_URL (conexión pooled, puerto 6543) se usa en runtime; DIRECT_URL (puerto 5432) solo para migraciones. No mezclar.

Regla 6. Modo offline (PWA): cuando trabajes en los requerimientos de modo offline, la persistencia local va con IndexedDB + Service Workers, sincronizando con el backend al recuperar conexión. No uses localStorage para datos de negocio.

Regla 7. Nombres en español para entidades de dominio (Cliente, Vehiculo, OrdenTrabajo, Repuesto), en inglés/estándar para infraestructura (Module, Controller, Service, Guard).

Orden de desarrollo — respétalo salvo indicación contraria

Primero Clientes y Vehículos (RF-01 a RF-05). Segundo Órdenes de Trabajo (RF-06 a RF-12). Tercero Inventario de Repuestos (RF-13 a RF-17). Cuarto Cotizaciones (RF-18 a RF-21) — depende de OT e Inventario, no adelantar. Quinto Modo Offline / PWA (RF-30 a RF-32). Sexto Dashboard / Business Intelligence (RF-22 a RF-25) — depende de que los módulos anteriores ya generen datos reales. Séptimo, hardening final de roles y seguridad (RF-26 a RF-29 completos, RNF-05/06).

Al recibir una tarea

Si te piden un módulo nuevo, pregunta (o infiere del documento de requerimientos) qué RF específicos cubre antes de escribir código. Si una tarea rompe alguna regla de arriba —por ejemplo, te piden guardar una contraseña o saltarte el RolesGuard— avisa antes de hacerlo. Prioriza que el módulo compile y sea consistente con los ya existentes por sobre agregar funcionalidades no pedidas.

Principios SOLID — aplícalos en cada módulo

Principio S (Responsabilidad única). Cada clase tiene un solo motivo para cambiar. El controller solo recibe la petición HTTP, valida el DTO y llama al service — no contiene lógica de negocio. El service contiene la lógica de negocio — no arma respuestas HTTP ni conoce Express/Nest. Si un service crece y empieza a manejar dos responsabilidades distintas (por ejemplo, Órdenes de Trabajo y cálculo de márgenes), divídelo en dos services.

Principio O (Abierto/cerrado). El código debe poder extenderse sin modificar lo que ya funciona. Ejemplo concreto para GearCore: si mañana se agrega un nuevo método de notificación al cliente (hoy es WhatsApp, mañana puede ser email o SMS), no modifiques el método existente con un if-else por tipo — define una interfaz NotificadorCliente con un método enviar, y crea una implementación por canal (NotificadorWhatsApp, NotificadorEmail). El service que notifica depende de la interfaz, no de una implementación concreta.

Principio L (Sustitución de Liskov). Si una clase implementa una interfaz o extiende otra, debe poder reemplazarla sin romper el comportamiento esperado. Ejemplo: si se crean distintas estrategias de cálculo de margen (por ejemplo margen simple vs. margen con descuento por volumen), todas deben cumplir el mismo contrato de entrada/salida — ninguna implementación debe lanzar un error o devolver algo distinto solo por ser "la nueva".

Principio I (Segregación de interfaces). No fuerces a una clase a depender de métodos que no usa. Prefiere DTOs e interfaces pequeñas y específicas por caso de uso, en vez de una interfaz gigante tipo "RepositorioGeneral" con veinte métodos. Ejemplo: CrearOrdenDto solo lleva los campos necesarios para crear una OT, no todos los campos posibles de la entidad OrdenTrabajo.

Principio D (Inversión de dependencias). Los módulos de alto nivel (lógica de negocio) no deben depender de detalles de bajo nivel (Prisma, Supabase) directamente cuando esa lógica sea compleja o vaya a tener variantes — deben depender de abstracciones. En NestJS esto se logra con inyección de dependencias por constructor: un service recibe sus dependencias (por ejemplo PrismaService, u otro service) vía constructor, nunca las instancia con new dentro de sus métodos. Para lógica de negocio simple (CRUD directo), inyectar PrismaService directo en el service está bien — no hay que sobre-diseñar con repositorios abstractos si no aporta valor real todavía.

Nota práctica para el agente

No apliques SOLID de forma dogmática si el módulo es simple (por ejemplo, un CRUD básico de Clientes no necesita una interfaz abstracta para su repositorio). Aplica estos principios sobre todo donde ya sabemos que habrá variación futura según el documento de requerimientos: notificaciones al cliente, métodos de cálculo de margen/cotización, y validaciones de negocio que puedan cambiar por tipo de taller. Si tienes dudas sobre si vale la pena abstraer algo, prioriza código simple y legible por sobre una abstracción anticipada que nadie pidió.