# -*- coding: utf-8 -*-
"""
Módulo principal interactivo (CLI) de ComercioTech.
Proporciona el menú de consola, control de login, carga de datos demo y CRUD.
Asignatura: Bases de Datos No Estructuradas (TI3032).
"""

import sys
import os
from datetime import datetime, timezone

# Agregar la raíz del proyecto al path por si se ejecuta desde carpetas internas
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pymongo.errors import PyMongoError
from src.conexion import obtener_db, obtener_cliente_mongo
from src.auth import login, logout, obtener_usuario_actual, hash_password, AccesoDenegadoError
from src.dao import clientes_dao, productos_dao, pedidos_dao


def inicializar_usuarios_sistema():
    """
    Inicializa los usuarios por defecto en la colección 'usuarios' para permitir
    el acceso a la aplicación si la colección está vacía.
    """
    try:
        db = obtener_db()
        # Verificar si ya existen usuarios
        if db.usuarios.count_documents({}) == 0:
            usuarios_defecto = [
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
            ]
            db.usuarios.insert_many(usuarios_defecto)
            print("\n[INFO] Colección de usuarios del sistema inicializada con accesos demo:")
            print("       - Usuario: admin    / Clave: admin123  (Rol: admin)")
            print("       - Usuario: vendedor / Clave: vende123  (Rol: vendedor)")
    except Exception as e:
        print(f"\n[ADVERTENCIA] No se pudo inicializar usuarios del sistema: {str(e)}")


def cargar_datos_demostracion():
    """
    Carga datos iniciales de prueba en clientes y productos para facilitar las pruebas del evaluador.
    """
    try:
        db = obtener_db()
        
        # 1. Cargar Clientes Demo
        clientes_demo = [
            {
                "rut": "12345678-9",
                "nombre": "Juan Pérez González",
                "email": "juan.perez@email.com",
                "telefono": "+56911112222",
                "direccion": {
                    "calle": "Av. Apoquindo",
                    "numero": "4500",
                    "comuna": "Las Condes",
                    "ciudad": "Santiago"
                },
                "fecha_registro": datetime.now(timezone.utc)
            },
            {
                "rut": "9876543-K",
                "nombre": "María Loreto Silva",
                "email": "maria.silva@email.com",
                "telefono": "+56933334444",
                "direccion": {
                    "calle": "Calle Prat",
                    "numero": "120",
                    "comuna": "Valparaíso",
                    "ciudad": "Valparaíso"
                },
                "fecha_registro": datetime.now(timezone.utc)
            }
        ]
        
        insertados_cli = 0
        for cli in clientes_demo:
            if not db.clientes.find_one({"rut": cli["rut"]}):
                db.clientes.insert_one(cli)
                insertados_cli += 1

        # 2. Cargar Productos Demo
        productos_demo = [
            {
                "sku": "LAP-DELL-15",
                "nombre": "Notebook Dell Inspiron 15",
                "descripcion": "Intel Core i7, 16GB RAM, 512GB SSD",
                "precio": 850000,
                "stock": 10,
                "categoria": "Computación"
            },
            {
                "sku": "MOU-LOGI-M180",
                "nombre": "Mouse Logitech Inalámbrico M180",
                "descripcion": "Mouse óptico ergonómico",
                "precio": 15000,
                "stock": 50,
                "categoria": "Accesorios"
            },
            {
                "sku": "MON-SAMS-24",
                "nombre": "Monitor Samsung 24 pulgadas FHD",
                "descripcion": "Frecuencia 75Hz, Panel IPS, HDMI",
                "precio": 120000,
                "stock": 15,
                "categoria": "Pantallas"
            }
        ]
        
        insertados_prod = 0
        for prod in productos_demo:
            if not db.productos.find_one({"sku": prod["sku"]}):
                db.productos.insert_one(prod)
                insertados_prod += 1

        print(f"\n[ÉXITO] Datos de demostración cargados:")
        print(f"        - Clientes insertados: {insertados_cli}")
        print(f"        - Productos insertados: {insertados_prod}")
        
    except AccesoDenegadoError as e:
        print(f"\n[ERROR] {str(e)}")
    except Exception as e:
        print(f"\n[ERROR] Ocurrió un error al cargar datos: {str(e)}")


def menu_clientes():
    """Submenú para operaciones CRUD de Clientes."""
    while True:
        print("\n=== GESTIÓN DE CLIENTES ===")
        print("1. Crear nuevo cliente")
        print("2. Buscar cliente por RUT")
        print("3. Listar todos los clientes")
        print("4. Actualizar datos de cliente")
        print("5. Eliminar cliente (Solo Admin)")
        print("0. Volver al menú principal")
        
        opc = input("Seleccione una opción: ").strip()
        
        try:
            if opc == "1":
                print("\n-- REGISTRAR CLIENTE --")
                rut = input("RUT (ej. 12345678-9): ").strip()
                nombre = input("Nombre completo: ").strip()
                email = input("Email: ").strip()
                telefono = input("Teléfono: ").strip()
                print("Dirección:")
                calle = input("  Calle: ").strip()
                numero = input("  Número: ").strip()
                comuna = input("  Comuna: ").strip()
                ciudad = input("  Ciudad: ").strip()
                
                cliente_data = {
                    "rut": rut,
                    "nombre": nombre,
                    "email": email,
                    "telefono": telefono,
                    "direccion": {
                        "calle": calle,
                        "numero": numero,
                        "comuna": comuna,
                        "ciudad": ciudad
                    }
                }
                rut_creado = clientes_dao.crear_cliente(cliente_data)
                print(f"[ÉXITO] Cliente registrado correctamente con el RUT: {rut_creado}")
                
            elif opc == "2":
                print("\n-- BUSCAR CLIENTE --")
                rut = input("Ingrese RUT del cliente: ").strip()
                cli = clientes_dao.obtener_cliente(rut)
                if cli:
                    print("\nDatos del Cliente:")
                    print(f"  RUT: {cli['rut']}")
                    print(f"  Nombre: {cli['nombre']}")
                    print(f"  Email: {cli['email']}")
                    print(f"  Teléfono: {cli['telefono']}")
                    dir_obj = cli['direccion']
                    print(f"  Dirección: {dir_obj['calle']} N°{dir_obj['numero']}, {dir_obj['comuna']}, {dir_obj['ciudad']}")
                    print(f"  Fecha Registro: {cli['fecha_registro']}")
                else:
                    print("[INFO] No se encontró ningún cliente con ese RUT.")
                    
            elif opc == "3":
                print("\n-- LISTADO DE CLIENTES --")
                lista = clientes_dao.listar_clientes()
                if lista:
                    for c in lista:
                        print(f"RUT: {c['rut']} | Nombre: {c['nombre']} | Email: {c['email']}")
                else:
                    print("[INFO] No hay clientes registrados.")
                    
            elif opc == "4":
                print("\n-- ACTUALIZAR CLIENTE --")
                rut = input("Ingrese RUT del cliente a actualizar: ").strip()
                # Verificar primero si existe
                cli = clientes_dao.obtener_cliente(rut)
                if not cli:
                    print("[ERROR] El cliente no existe.")
                    continue
                    
                print("Presione ENTER para dejar el valor actual.")
                nombre = input(f"Nombre [{cli['nombre']}]: ").strip() or cli['nombre']
                email = input(f"Email [{cli['email']}]: ").strip() or cli['email']
                telefono = input(f"Teléfono [{cli['telefono']}]: ").strip() or cli['telefono']
                
                dir_actual = cli['direccion']
                calle = input(f"Calle [{dir_actual['calle']}]: ").strip() or dir_actual['calle']
                numero = input(f"Número [{dir_actual['numero']}]: ").strip() or dir_actual['numero']
                comuna = input(f"Comuna [{dir_actual['comuna']}]: ").strip() or dir_actual['comuna']
                ciudad = input(f"Ciudad [{dir_actual['ciudad']}]: ").strip() or dir_actual['ciudad']
                
                datos_actualizar = {
                    "nombre": nombre,
                    "email": email,
                    "telefono": telefono,
                    "direccion": {
                        "calle": calle,
                        "numero": numero,
                        "comuna": comuna,
                        "ciudad": ciudad
                    }
                }
                
                if clientes_dao.actualizar_cliente(rut, datos_actualizar):
                    print("[ÉXITO] Cliente actualizado correctamente.")
                else:
                    print("[INFO] No se modificó ningún dato (valores idénticos).")
                    
            elif opc == "5":
                print("\n-- ELIMINAR CLIENTE --")
                rut = input("Ingrese RUT del cliente a eliminar: ").strip()
                confirmar = input(f"¿Está seguro de eliminar al cliente con RUT {rut}? (s/n): ").strip().lower()
                if confirmar == "s":
                    if clientes_dao.eliminar_cliente(rut):
                        print("[ÉXITO] Cliente eliminado del sistema.")
                    else:
                        print("[INFO] No se encontró el cliente o no se pudo eliminar.")
                else:
                    print("[INFO] Operación cancelada.")
                    
            elif opc == "0":
                break
            else:
                print("[ERROR] Opción no válida.")
        except AccesoDenegadoError as ade:
            print(f"\n[ACCESO DENEGADO] {str(ade)}")
        except ValueError as ve:
            print(f"\n[ERROR DE VALIDACIÓN] {str(ve)}")
        except Exception as e:
            print(f"\n[ERROR INESPERADO] {str(e)}")


def menu_productos():
    """Submenú para operaciones CRUD de Productos."""
    while True:
        print("\n=== CATALOGO DE PRODUCTOS ===")
        print("1. Crear nuevo producto (Solo Admin)")
        print("2. Buscar producto por SKU")
        print("3. Listar catálogo completo")
        print("4. Actualizar datos de producto (Solo Admin)")
        print("5. Eliminar producto del catálogo (Solo Admin)")
        print("0. Volver al menú principal")
        
        opc = input("Seleccione una opción: ").strip()
        
        try:
            if opc == "1":
                print("\n-- CREAR PRODUCTO --")
                sku = input("SKU (ej: LAP-DELL-15): ").strip()
                nombre = input("Nombre comercial: ").strip()
                descripcion = input("Descripción: ").strip()
                try:
                    precio = float(input("Precio unitario: ").strip())
                    stock = int(input("Stock inicial: ").strip())
                except ValueError:
                    print("[ERROR] Precio y Stock deben ser números válidos.")
                    continue
                categoria = input("Categoría: ").strip()
                
                prod_data = {
                    "sku": sku,
                    "nombre": nombre,
                    "descripcion": descripcion,
                    "precio": precio,
                    "stock": stock,
                    "categoria": categoria
                }
                sku_creado = productos_dao.crear_producto(prod_data)
                print(f"[ÉXITO] Producto registrado en catálogo con SKU: {sku_creado}")
                
            elif opc == "2":
                print("\n-- BUSCAR PRODUCTO --")
                sku = input("Ingrese SKU: ").strip()
                p = productos_dao.obtener_producto(sku)
                if p:
                    print("\nDatos del Producto:")
                    print(f"  SKU: {p['sku']}")
                    print(f"  Nombre: {p['nombre']}")
                    print(f"  Descripción: {p.get('descripcion', '')}")
                    print(f"  Precio: ${p['precio']:,}")
                    print(f"  Stock: {p['stock']} unidades")
                    print(f"  Categoría: {p['categoria']}")
                else:
                    print("[INFO] No se encontró ningún producto con ese SKU.")
                    
            elif opc == "3":
                print("\n-- CATALOGO DE PRODUCTOS --")
                lista = productos_dao.listar_productos()
                if lista:
                    for p in lista:
                        print(f"SKU: {p['sku']} | Nombre: {p['nombre']} | Precio: ${p['precio']:,} | Stock: {p['stock']} | Cat: {p['categoria']}")
                else:
                    print("[INFO] El catálogo está vacío.")
                    
            elif opc == "4":
                print("\n-- ACTUALIZAR PRODUCTO --")
                sku = input("Ingrese SKU del producto: ").strip()
                p = productos_dao.obtener_producto(sku)
                if not p:
                    print("[ERROR] El producto no existe.")
                    continue
                    
                print("Presione ENTER para dejar el valor actual.")
                nombre = input(f"Nombre [{p['nombre']}]: ").strip() or p['nombre']
                descripcion = input(f"Descripción [{p.get('descripcion', '')}]: ").strip() or p.get('descripcion', '')
                
                precio_raw = input(f"Precio [${p['precio']:,}]: ").strip()
                precio = float(precio_raw) if precio_raw else p['precio']
                
                stock_raw = input(f"Stock [{p['stock']}]: ").strip()
                stock = int(stock_raw) if stock_raw else p['stock']
                
                categoria = input(f"Categoría [{p['categoria']}]: ").strip() or p['categoria']
                
                datos_actualizar = {
                    "nombre": nombre,
                    "descripcion": descripcion,
                    "precio": precio,
                    "stock": stock,
                    "categoria": categoria
                }
                
                if productos_dao.actualizar_producto(sku, datos_actualizar):
                    print("[ÉXITO] Producto actualizado en catálogo.")
                else:
                    print("[INFO] No se modificó ningún dato (valores idénticos).")
                    
            elif opc == "5":
                print("\n-- ELIMINAR PRODUCTO --")
                sku = input("Ingrese SKU del producto a eliminar: ").strip()
                confirmar = input(f"¿Está seguro de eliminar el producto '{sku}' del catálogo? (s/n): ").strip().lower()
                if confirmar == "s":
                    if productos_dao.eliminar_producto(sku):
                        print("[ÉXITO] Producto eliminado del catálogo.")
                    else:
                        print("[INFO] No se encontró el producto o no se pudo eliminar.")
                else:
                    print("[INFO] Operación cancelada.")
                    
            elif opc == "0":
                break
            else:
                print("[ERROR] Opción no válida.")
        except AccesoDenegadoError as ade:
            print(f"\n[ACCESO DENEGADO] {str(ade)}")
        except ValueError as ve:
            print(f"\n[ERROR DE VALIDACIÓN] {str(ve)}")
        except Exception as e:
            print(f"\n[ERROR INESPERADO] {str(e)}")


def menu_pedidos():
    """Submenú para operaciones CRUD de Pedidos."""
    while True:
        print("\n=== GESTIÓN DE PEDIDOS ===")
        print("1. Crear nuevo pedido (Descuenta Stock)")
        print("2. Buscar pedido por Número")
        print("3. Listar todos los pedidos")
        print("4. Actualizar estado de pedido (Devuelve stock si se cancela)")
        print("5. Eliminar pedido (Solo Admin - Reintegra Stock)")
        print("0. Volver al menú principal")
        
        opc = input("Seleccione una opción: ").strip()
        
        try:
            if opc == "1":
                print("\n-- REGISTRAR PEDIDO --")
                numero_pedido = input("Número de pedido (ej: PED-100): ").strip()
                cliente_rut = input("RUT del cliente asociado: ").strip()
                
                # Ingreso de items interactivos
                items = []
                print("\nIngrese los productos del pedido:")
                while True:
                    sku = input("  SKU del producto: ").strip()
                    try:
                        cant = int(input("  Cantidad: ").strip())
                    except ValueError:
                        print("  [ERROR] La cantidad debe ser un número entero.")
                        continue
                    
                    items.append({
                        "sku": sku,
                        "cantidad": cant
                    })
                    
                    otro = input("  ¿Desea agregar otro producto? (s/n): ").strip().lower()
                    if otro != "s":
                        break
                
                print("\nDirección de Envío:")
                calle = input("  Calle: ").strip()
                numero = input("  Número: ").strip()
                comuna = input("  Comuna: ").strip()
                ciudad = input("  Ciudad: ").strip()
                
                pedido_data = {
                    "numero_pedido": numero_pedido,
                    "cliente_rut": cliente_rut,
                    "estado": "pendiente",
                    "items": items,
                    "direccion_envio": {
                        "calle": calle,
                        "numero": numero,
                        "comuna": comuna,
                        "ciudad": ciudad
                    }
                }
                
                num_pedido_creado = pedidos_dao.crear_pedido(pedido_data)
                print(f"[ÉXITO] Pedido '{num_pedido_creado}' creado de forma exitosa.")
                # Mostrar el total calculado
                ped = pedidos_dao.obtener_pedido(num_pedido_creado)
                if ped:
                    print(f"        Total calculado del pedido: ${ped['total']:,}")
                
            elif opc == "2":
                print("\n-- BUSCAR PEDIDO --")
                num_ped = input("Ingrese número de pedido (ej: PED-100): ").strip()
                p = pedidos_dao.obtener_pedido(num_ped)
                if p:
                    print("\nDatos del Pedido:")
                    print(f"  Número Pedido: {p['numero_pedido']}")
                    print(f"  RUT Cliente: {p['cliente_rut']}")
                    print(f"  Fecha: {p['fecha_pedido']}")
                    print(f"  Estado: {p['estado'].upper()}")
                    print("  Items:")
                    for it in p['items']:
                        print(f"    - SKU: {it['sku']} | Prod: {it['nombre_producto']} | Cant: {it['cantidad']} | P.Unit: ${it['precio_unitario']:,} | Subtotal: ${it['subtotal']:,}")
                    print(f"  Total: ${p['total']:,}")
                    dir_env = p['direccion_envio']
                    print(f"  Dirección de Despacho: {dir_env['calle']} N°{dir_env['numero']}, {dir_env['comuna']}, {dir_env['ciudad']}")
                else:
                    print("[INFO] No se encontró ningún pedido con ese número.")
                    
            elif opc == "3":
                print("\n-- LISTA DE PEDIDOS --")
                lista = pedidos_dao.listar_pedidos()
                if lista:
                    for p in lista:
                        print(f"N°: {p['numero_pedido']} | Cliente RUT: {p['cliente_rut']} | Total: ${p['total']:,} | Estado: {p['estado'].upper()} | Fecha: {p['fecha_pedido']}")
                else:
                    print("[INFO] No hay pedidos en el sistema.")
                    
            elif opc == "4":
                print("\n-- ACTUALIZAR ESTADO DE PEDIDO --")
                num_ped = input("Ingrese número de pedido a actualizar: ").strip()
                p = pedidos_dao.obtener_pedido(num_ped)
                if not p:
                    print("[ERROR] El pedido no existe.")
                    continue
                    
                print(f"Estado actual: {p['estado']}")
                print("Estados permitidos: pendiente, pagado, despachado, entregado, cancelado")
                nuevo_estado = input("Ingrese nuevo estado: ").strip().lower()
                
                datos_actualizar = {
                    "estado": nuevo_estado,
                    "direccion_envio": p["direccion_envio"]
                }
                
                if pedidos_dao.actualizar_pedido(num_ped, datos_actualizar):
                    print("[ÉXITO] Estado del pedido actualizado.")
                    if nuevo_estado == "cancelado":
                        print("        [INFO] El stock de los productos ha sido reintegrado al catálogo.")
                else:
                    print("[INFO] No se modificó el estado.")
                    
            elif opc == "5":
                print("\n-- ELIMINAR PEDIDO --")
                num_ped = input("Ingrese número de pedido a eliminar: ").strip()
                confirmar = input(f"¿Está seguro de eliminar el pedido {num_ped}? (s/n): ").strip().lower()
                if confirmar == "s":
                    if pedidos_dao.eliminar_pedido(num_ped):
                        print("[ÉXITO] Pedido eliminado del sistema. Stock reintegrado si correspondía.")
                    else:
                        print("[INFO] No se encontró el pedido o no se pudo eliminar.")
                else:
                    print("[INFO] Operación cancelada.")
                    
            elif opc == "0":
                break
            else:
                print("[ERROR] Opción no válida.")
        except AccesoDenegadoError as ade:
            print(f"\n[ACCESO DENEGADO] {str(ade)}")
        except ValueError as ve:
            print(f"\n[ERROR DE VALIDACIÓN] {str(ve)}")
        except Exception as e:
            print(f"\n[ERROR INESPERADO] {str(e)}")


def menu_principal():
    """Ciclo del menú principal una vez autenticado."""
    while True:
        user = obtener_usuario_actual()
        if not user:
            break
            
        print(f"\n==========================================")
        print(f" SISTEMA COMERCIOTECH - SESIÓN ACTIVA")
        print(f" Usuario: {user['nombre']} | Rol: {user['rol'].upper()}")
        print(f"==========================================")
        print("1. Gestionar Clientes")
        print("2. Gestionar Productos (Catálogo)")
        print("3. Gestionar Pedidos (Ventas)")
        print("4. Cargar datos de demostración (Clientes/Productos)")
        print("0. Cerrar Sesión")
        print("------------------------------------------")
        
        opc = input("Seleccione una opción: ").strip()
        
        if opc == "1":
            menu_clientes()
        elif opc == "2":
            menu_productos()
        elif opc == "3":
            menu_pedidos()
        elif opc == "4":
            cargar_datos_demostracion()
        elif opc == "0":
            logout()
            print("\nSesión cerrada. Volviendo a pantalla de login...")
            break
        else:
            print("[ERROR] Opción inválida.")


def iniciar_aplicacion():
    """Pantalla inicial del CLI y loop de login."""
    print("==================================================")
    print("    BIENVENIDO A COMERCIOTECH - PYMONGO CRUD")
    print("     Asignatura: BD No Estructuradas (TI3032)")
    print("==================================================")
    
    # 1. Probar conexión y configuración inicial
    try:
        db = obtener_db()
        print("[CONEXIÓN] Conectado exitosamente a MongoDB.")
        inicializar_usuarios_sistema()
    except Exception as e:
        print(f"\n[CRÍTICO] Falló la conexión inicial a la base de datos.")
        print(f"Detalle del error: {str(e)}")
        print("Asegúrese de configurar el archivo .env y tener MongoDB activo.")
        input("\nPresione ENTER para salir de la aplicación...")
        sys.exit(1)
        
    # 2. Bucle de autenticación
    while True:
        print("\n--- INICIO DE SESIÓN ---")
        username = input("Nombre de usuario (o 'salir'): ").strip()
        if username.lower() == "salir":
            print("\nGracias por usar el sistema ComercioTech. ¡Hasta pronto!")
            break
            
        password = input("Contraseña: ").strip()
        
        try:
            user = login(username, password)
            print(f"\n[ÉXITO] Bienvenido {user['nombre']} ({user['rol'].upper()}).")
            menu_principal()
        except ValueError as ve:
            print(f"[ERROR DE LOGIN] {str(ve)}")
        except Exception as e:
            print(f"[ERROR] No se pudo procesar el inicio de sesión: {str(e)}")


if __name__ == "__main__":
    iniciar_aplicacion()
