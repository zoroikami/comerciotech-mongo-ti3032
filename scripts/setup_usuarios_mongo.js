/**
 * Script para configurar seguridad y usuarios en MongoDB (Mongo Shell).
 * Define roles específicos de negocio y crea los usuarios admin y vendedor.
 * Asignatura: Bases de Datos No Estructuradas (TI3032).
 */

// Conectarse a la base de datos de administración para crear usuarios si corresponde,
// o directamente a la base de datos de ComercioTech.
db = db.getSiblingDB('comerciotech');

print("Iniciando configuración de seguridad y roles en la base de datos...");

// 1. Limpieza de usuarios y roles anteriores (Opcional, para reprocesabilidad)
try {
  db.dropUser("comerciotech_admin");
} catch (e) {
  // Ignorar si el usuario no existe
}
try {
  db.dropUser("comerciotech_vendedor");
} catch (e) {
  // Ignorar si el usuario no existe
}
try {
  db.dropRole("roleVendedor");
} catch (e) {
  // Ignorar si el rol no existe
}

// 2. Creación del Rol de Negocio: roleVendedor
// Este rol permite:
// - Leer y escribir (insertar/actualizar) en clientes y pedidos (CRUD pero SIN eliminar).
// - Leer (solo consulta) en productos.
// - Ningún privilegio de eliminación (delete) sobre ninguna colección.
db.createRole({
  role: "roleVendedor",
  privileges: [
    {
      resource: { db: "comerciotech", collection: "clientes" },
      actions: ["find", "insert", "update"]
    },
    {
      resource: { db: "comerciotech", collection: "pedidos" },
      actions: ["find", "insert", "update"]
    },
    {
      resource: { db: "comerciotech", collection: "productos" },
      actions: ["find"]
    }
  ],
  roles: []
});
print("Rol 'roleVendedor' creado con éxito.");

// 3. Crear usuario administrador (admin)
// Posee el rol dbOwner para control total sobre ComercioTech.
db.createUser({
  user: "comerciotech_admin",
  pwd: "secure_admin_password",
  roles: [
    { role: "dbOwner", db: "comerciotech" }
  ]
});
print("Usuario 'comerciotech_admin' con rol 'dbOwner' creado con éxito.");

// 4. Crear usuario vendedor (vendedor / operador)
// Posee el rol personalizado 'roleVendedor'.
db.createUser({
  user: "comerciotech_vendedor",
  pwd: "secure_vendedor_password",
  roles: [
    { role: "roleVendedor", db: "comerciotech" }
  ]
});
print("Usuario 'comerciotech_vendedor' con rol 'roleVendedor' creado con éxito.");

print("Configuración de seguridad completada con éxito.");
