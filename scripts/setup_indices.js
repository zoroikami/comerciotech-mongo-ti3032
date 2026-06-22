/**
 * Script de inicialización para MongoDB (Mongo Shell).
 * Configura colecciones, esquemas de validación ($jsonSchema) e índices.
 * Asignatura: Bases de Datos No Estructuradas (TI3032).
 */

// Seleccionar la base de datos
db = db.getSiblingDB('comerciotech');

print("Iniciando configuración de colecciones, esquemas e índices...");

// --- 1. Colección: clientes ---
db.clientes.drop(); // Limpieza inicial
db.createCollection("clientes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["rut", "nombre", "email", "telefono", "direccion", "fecha_registro"],
      properties: {
        rut: {
          bsonType: "string",
          pattern: "^\\d{7,8}-[\\dkK]$",
          description: "RUT único del cliente (sin puntos y con guión)."
        },
        nombre: {
          bsonType: "string",
          minLength: 2,
          description: "Nombre del cliente, mínimo 2 letras."
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Email de contacto del cliente."
        },
        telefono: {
          bsonType: "string",
          description: "Teléfono de contacto."
        },
        direccion: {
          bsonType: "object",
          required: ["calle", "numero", "comuna", "ciudad"],
          properties: {
            calle: { bsonType: "string" },
            numero: { bsonType: "string" },
            comuna: { bsonType: "string" },
            ciudad: { bsonType: "string" }
          }
        },
        fecha_registro: {
          bsonType: "date",
          description: "Fecha de registro en la plataforma."
        }
      }
    }
  }
});

// Índices para clientes
db.clientes.createIndex({ rut: 1 }, { unique: true });
db.clientes.createIndex({ email: 1 }, { unique: true });
print("Colección 'clientes' e índices creados con éxito.");


// --- 2. Colección: productos ---
db.productos.drop(); // Limpieza inicial
db.createCollection("productos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sku", "nombre", "precio", "stock", "categoria"],
      properties: {
        sku: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9-]+$",
          minLength: 3,
          description: "SKU identificador único del producto."
        },
        nombre: {
          bsonType: "string",
          minLength: 2,
          description: "Nombre comercial del producto."
        },
        descripcion: {
          bsonType: "string"
        },
        precio: {
          bsonType: ["double", "int", "long"],
          minimum: 0,
          description: "Precio unitario no negativo."
        },
        stock: {
          bsonType: "int",
          minimum: 0,
          description: "Stock del producto, entero mayor o igual a 0."
        },
        categoria: {
          bsonType: "string"
        }
      }
    }
  }
});

// Índices para productos
db.productos.createIndex({ sku: 1 }, { unique: true });
db.productos.createIndex({ categoria: 1 });
print("Colección 'productos' e índices creados con éxito.");


// --- 3. Colección: pedidos ---
db.pedidos.drop(); // Limpieza inicial
db.createCollection("pedidos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["numero_pedido", "cliente_rut", "fecha_pedido", "estado", "items", "total", "direccion_envio"],
      properties: {
        numero_pedido: {
          bsonType: "string",
          pattern: "^PED-\\d+$",
          description: "Identificador único de pedido (ej: PED-12345)."
        },
        cliente_rut: {
          bsonType: "string",
          pattern: "^\\d{7,8}-[\\dkK]$",
          description: "RUT del cliente asociado."
        },
        fecha_pedido: {
          bsonType: "date",
          description: "Fecha y hora del pedido."
        },
        estado: {
          bsonType: "string",
          enum: ["pendiente", "pagado", "despachado", "entregado", "cancelado"]
        },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["sku", "nombre_producto", "cantidad", "precio_unitario", "subtotal"],
            properties: {
              sku: { bsonType: "string" },
              nombre_producto: { bsonType: "string" },
              cantidad: { bsonType: "int", minimum: 1 },
              precio_unitario: { bsonType: ["double", "int", "long"], minimum: 0 },
              subtotal: { bsonType: ["double", "int", "long"], minimum: 0 }
            }
          }
        },
        total: {
          bsonType: ["double", "int", "long"],
          minimum: 0
        },
        direccion_envio: {
          bsonType: "object",
          required: ["calle", "numero", "comuna", "ciudad"],
          properties: {
            calle: { bsonType: "string" },
            numero: { bsonType: "string" },
            comuna: { bsonType: "string" },
            ciudad: { bsonType: "string" }
          }
        }
      }
    }
  }
});

// Índices para pedidos
db.pedidos.createIndex({ numero_pedido: 1 }, { unique: true });
db.pedidos.createIndex({ cliente_rut: 1 });
db.pedidos.createIndex({ fecha_pedido: -1 });
db.pedidos.createIndex({ estado: 1, fecha_pedido: -1 });
print("Colección 'pedidos' e índices creados con éxito.");

print("Configuración de base de datos ComercioTech completada exitosamente.");
