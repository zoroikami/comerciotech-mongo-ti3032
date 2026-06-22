# -*- coding: utf-8 -*-
"""
Esquemas de validación $jsonSchema para las colecciones de ComercioTech.
Asignatura: Bases de Datos No Estructuradas (TI3032).
"""

CLIENTES_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["rut", "nombre", "email", "telefono", "direccion", "fecha_registro"],
        "properties": {
            "rut": {
                "bsonType": "string",
                "pattern": r"^\d{7,8}-[\dkK]$",
                "description": "RUT del cliente. Formato sin puntos y con guión (ej: 12345678-9)."
            },
            "nombre": {
                "bsonType": "string",
                "minLength": 2,
                "description": "Nombre completo del cliente, mínimo 2 caracteres."
            },
            "email": {
                "bsonType": "string",
                "pattern": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
                "description": "Correo electrónico de contacto válido."
            },
            "telefono": {
                "bsonType": "string",
                "description": "Teléfono de contacto del cliente."
            },
            "direccion": {
                "bsonType": "object",
                "required": ["calle", "numero", "comuna", "ciudad"],
                "properties": {
                    "calle": {"bsonType": "string"},
                    "numero": {"bsonType": "string"},
                    "comuna": {"bsonType": "string"},
                    "ciudad": {"bsonType": "string"}
                },
                "description": "Dirección completa del cliente."
            },
            "fecha_registro": {
                "bsonType": "date",
                "description": "Fecha en que se registró el cliente."
            }
        }
    }
}

PRODUCTOS_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["sku", "nombre", "precio", "stock", "categoria"],
        "properties": {
            "sku": {
                "bsonType": "string",
                "pattern": r"^[a-zA-Z0-9-]+$",
                "minLength": 3,
                "description": "Stock Keeping Unit. Identificador único del producto."
            },
            "nombre": {
                "bsonType": "string",
                "minLength": 2,
                "description": "Nombre comercial del producto."
            },
            "descripcion": {
                "bsonType": "string",
                "description": "Descripción detallada del producto."
            },
            "precio": {
                "bsonType": ["double", "int", "long"],
                "minimum": 0,
                "description": "Precio unitario del producto, no puede ser negativo."
            },
            "stock": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Cantidad de unidades disponibles, no puede ser negativo."
            },
            "categoria": {
                "bsonType": "string",
                "description": "Categoría a la que pertenece el producto."
            }
        }
    }
}

PEDIDOS_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": [
            "numero_pedido",
            "cliente_rut",
            "fecha_pedido",
            "estado",
            "items",
            "total",
            "direccion_envio"
        ],
        "properties": {
            "numero_pedido": {
                "bsonType": "string",
                "pattern": r"^PED-\d+$",
                "description": "Número único de pedido con prefijo PED-."
            },
            "cliente_rut": {
                "bsonType": "string",
                "pattern": r"^\d{7,8}-[\dkK]$",
                "description": "RUT del cliente asociado al pedido."
            },
            "fecha_pedido": {
                "bsonType": "date",
                "description": "Fecha y hora en que se realizó el pedido."
            },
            "estado": {
                "bsonType": "string",
                "enum": ["pendiente", "pagado", "despachado", "entregado", "cancelado"],
                "description": "Estado actual del ciclo de vida del pedido."
            },
            "items": {
                "bsonType": "array",
                "minItems": 1,
                "items": {
                    "bsonType": "object",
                    "required": ["sku", "nombre_producto", "cantidad", "precio_unitario", "subtotal"],
                    "properties": {
                        "sku": {"bsonType": "string"},
                        "nombre_producto": {"bsonType": "string"},
                        "cantidad": {
                            "bsonType": "int",
                            "minimum": 1
                        },
                        "precio_unitario": {
                            "bsonType": ["double", "int", "long"],
                            "minimum": 0
                        },
                        "subtotal": {
                            "bsonType": ["double", "int", "long"],
                            "minimum": 0
                        }
                    }
                },
                "description": "Lista de productos incluidos en el pedido."
            },
            "total": {
                "bsonType": ["double", "int", "long"],
                "minimum": 0,
                "description": "Monto total del pedido."
            },
            "direccion_envio": {
                "bsonType": "object",
                "required": ["calle", "numero", "comuna", "ciudad"],
                "properties": {
                    "calle": {"bsonType": "string"},
                    "numero": {"bsonType": "string"},
                    "comuna": {"bsonType": "string"},
                    "ciudad": {"bsonType": "string"}
                },
                "description": "Dirección física de despacho."
            }
        }
    }
}
