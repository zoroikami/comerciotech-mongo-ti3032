# -*- coding: utf-8 -*-
"""
Servidor API Web Flask para ComercioTech.
Expone endpoints REST para el frontend y sirve los archivos estáticos de la aplicación.
Integrado con la lógica de conexión (conexion.py) y las capas DAO con validación y RBAC.
"""

import os
import sys
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS

# Agregar la raíz del proyecto al path para asegurar la importación de módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.conexion import obtener_db
from src.auth import login as auth_login, logout as auth_logout, AccesoDenegadoError
import src.auth
from src.dao import clientes_dao, productos_dao, pedidos_dao

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Habilitar CORS para desarrollo local

# Inicializar usuarios demo en la base de datos si la colección está vacía
def inicializar_usuarios_demo():
    try:
        db = obtener_db()
        if db.usuarios.count_documents({}) == 0:
            from src.auth import hash_password
            db.usuarios.insert_many([
                {
                    "username": "admin",
                    "password": hash_password("admin123"),
                    "rol": "admin",
                    "nombre": "Administrador General"
                },
                {
                    "username": "vendedor",
                    "password": hash_password("vende123"),
                    "rol": "vendedor",
                    "nombre": "Vendedor de Turno"
                }
            ])
            print("[INFO] Usuarios de demostración creados exitosamente en MongoDB.")
    except Exception as e:
        print(f"[ADVERTENCIA] No se pudo inicializar usuarios de demostración: {str(e)}")

# Ejecutar inicialización al cargar la aplicación
inicializar_usuarios_demo()

def serialize_doc(doc):
    """
    Serializa recursivamente objetos de MongoDB (ObjectId, datetime) 
    para poder convertirlos a formato JSON estándar.
    """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if k == "_id":
                new_doc[k] = str(v)
            elif isinstance(v, datetime):
                new_doc[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                new_doc[k] = serialize_doc(v)
            else:
                new_doc[k] = v
        return new_doc
    return doc

@app.before_request
def mock_session_from_headers():
    """
    Intercepte cada petición HTTP y configure la sesión global _usuario_actual
    en el módulo 'auth' utilizando las cabeceras provistas por el cliente.
    Esto permite reutilizar los decoradores @requiere_rol de los DAOs sin cambios.
    """
    rol = request.headers.get("X-User-Role")
    username = request.headers.get("X-User-Username")
    nombre = request.headers.get("X-User-Name")
    
    if rol and username:
        src.auth._usuario_actual = {
            "username": username,
            "rol": rol,
            "nombre": nombre or username
        }
    else:
        src.auth._usuario_actual = None

# ==========================================
# RUTAS ESTÁTICAS
# ==========================================
@app.route('/')
def root():
    """Sirve la página de inicio de la aplicación web."""
    return app.send_static_file('index.html')

# ==========================================
# API DE AUTENTICACIÓN
# ==========================================
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Debe ingresar usuario y contraseña."}), 400
        
    try:
        user = auth_login(username, password)
        return jsonify({"success": True, "user": user})
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": f"Error de servidor: {str(e)}"}), 500

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    auth_logout()
    return jsonify({"success": True})

# ==========================================
# API DASHBOARD METRICS
# ==========================================
@app.route('/api/dashboard/stats', methods=['GET'])
def api_dashboard_stats():
    # Solo visible si el usuario está autenticado
    if not src.auth._usuario_actual:
        return jsonify({"error": "No autenticado."}), 401
        
    try:
        db = obtener_db()
        num_clientes = db.clientes.count_documents({})
        num_productos = db.productos.count_documents({})
        num_pedidos = db.pedidos.count_documents({})
        
        # Agregación: Suma total de ventas
        pedidos_activos = list(db.pedidos.find({"estado": {"$ne": "cancelado"}}))
        total_ventas = sum(p.get("total", 0) for p in pedidos_activos)
        
        # Agregación: Productos más vendidos
        pipeline_top = [
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.sku",
                "nombre": {"$first": "$items.nombre_producto"},
                "cantidad": {"$sum": "$items.cantidad"},
                "total": {"$sum": "$items.subtotal"}
            }},
            {"$sort": {"cantidad": -1}},
            {"$limit": 5}
        ]
        top_productos = list(db.pedidos.aggregate(pipeline_top))
        
        # Agregación: Ventas por estado
        pipeline_estados = [
            {"$group": {
                "_id": "$estado",
                "cantidad": {"$sum": 1},
                "total": {"$sum": "$total"}
            }}
        ]
        pedidos_estados = list(db.pedidos.aggregate(pipeline_estados))
        
        return jsonify({
            "success": True,
            "stats": {
                "clientes": num_clientes,
                "productos": num_productos,
                "pedidos": num_pedidos,
                "ventas": total_ventas,
                "top_productos": serialize_doc(top_productos),
                "pedidos_estados": serialize_doc(pedidos_estados)
            }
        })
    except Exception as e:
        return jsonify({"error": f"Error de servidor al cargar métricas: {str(e)}"}), 500

# ==========================================
# API CLIENTES CRUD
# ==========================================
@app.route('/api/clientes', methods=['GET'])
def api_listar_clientes():
    try:
        clientes = clientes_dao.listar_clientes()
        return jsonify(serialize_doc(clientes))
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clientes', methods=['POST'])
def api_crear_cliente():
    try:
        data = request.json or {}
        rut = clientes_dao.crear_cliente(data)
        return jsonify({"success": True, "rut": rut}), 201
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clientes/<rut>', methods=['GET'])
def api_obtener_cliente(rut):
    try:
        cliente = clientes_dao.obtener_cliente(rut)
        if not cliente:
            return jsonify({"error": "Cliente no encontrado."}), 404
        return jsonify(serialize_doc(cliente))
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clientes/<rut>', methods=['PUT'])
def api_actualizar_cliente(rut):
    try:
        data = request.json or {}
        modificado = clientes_dao.actualizar_cliente(rut, data)
        return jsonify({"success": modificado})
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clientes/<rut>', methods=['DELETE'])
def api_eliminar_cliente(rut):
    try:
        eliminado = clientes_dao.eliminar_cliente(rut)
        return jsonify({"success": eliminado})
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# API PRODUCTOS CRUD
# ==========================================
@app.route('/api/productos', methods=['GET'])
def api_listar_productos():
    try:
        productos = productos_dao.listar_productos()
        return jsonify(serialize_doc(productos))
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos', methods=['POST'])
def api_crear_producto():
    try:
        data = request.json or {}
        sku = productos_dao.crear_producto(data)
        return jsonify({"success": True, "sku": sku}), 201
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<sku>', methods=['GET'])
def api_obtener_producto(sku):
    try:
        producto = productos_dao.obtener_producto(sku)
        if not producto:
            return jsonify({"error": "Producto no encontrado."}), 404
        return jsonify(serialize_doc(producto))
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<sku>', methods=['PUT'])
def api_actualizar_producto(sku):
    try:
        data = request.json or {}
        modificado = productos_dao.actualizar_producto(sku, data)
        return jsonify({"success": modificado})
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/productos/<sku>', methods=['DELETE'])
def api_eliminar_producto(sku):
    try:
        eliminado = productos_dao.eliminar_producto(sku)
        return jsonify({"success": eliminado})
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# API PEDIDOS CRUD
# ==========================================
@app.route('/api/pedidos', methods=['GET'])
def api_listar_pedidos():
    try:
        pedidos = pedidos_dao.listar_pedidos()
        return jsonify(serialize_doc(pedidos))
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pedidos', methods=['POST'])
def api_crear_pedido():
    try:
        data = request.json or {}
        numero = pedidos_dao.crear_pedido(data)
        return jsonify({"success": True, "numero_pedido": numero}), 201
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pedidos/<numero_pedido>', methods=['GET'])
def api_obtener_pedido(numero_pedido):
    try:
        pedido = pedidos_dao.obtener_pedido(numero_pedido)
        if not pedido:
            return jsonify({"error": "Pedido no encontrado."}), 404
        return jsonify(serialize_doc(pedido))
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pedidos/<numero_pedido>', methods=['PUT'])
def api_actualizar_pedido(numero_pedido):
    try:
        data = request.json or {}
        modificado = pedidos_dao.actualizar_pedido(numero_pedido, data)
        return jsonify({"success": modificado})
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pedidos/<numero_pedido>', methods=['DELETE'])
def api_eliminar_pedido(numero_pedido):
    try:
        eliminado = pedidos_dao.eliminar_pedido(numero_pedido)
        return jsonify({"success": eliminado})
    except AccesoDenegadoError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 5000))
    print(f"Iniciando API de ComercioTech en http://{host}:{port}")
    app.run(host=host, port=port, debug=True)
