# -*- coding: utf-8 -*-
"""
Módulo DAO para la colección de 'productos'.
Implementa el CRUD, validaciones en capa Python y control de acceso (RBAC).
"""

import re
from pymongo.errors import WriteError, DuplicateKeyError
from src.conexion import obtener_db
from src.auth import requiere_rol


def validar_producto(producto_data):
    """
    Valida la estructura y formato de los datos de un producto en la capa Python.
    
    Args:
        producto_data (dict): Diccionario con los datos del producto.
        
    Raises:
        ValueError: Si los datos no cumplen con las validaciones de tipo, valor o formato.
    """
    # 1. Campos obligatorios
    campos_requeridos = ["sku", "nombre", "precio", "stock", "categoria"]
    for campo in campos_requeridos:
        if campo not in producto_data or producto_data[campo] is None:
            raise ValueError(f"El campo '{campo}' es obligatorio.")

    # 2. Validación de SKU (Formato alfanumérico + guiones, mínimo 3 caracteres)
    sku = str(producto_data["sku"]).strip()
    if not re.match(r"^[a-zA-Z0-9-]+$", sku) or len(sku) < 3:
        raise ValueError("El SKU debe ser alfanumérico (letras, números y guiones) y tener al menos 3 caracteres.")

    # 3. Validación de Nombre (mínimo 2 caracteres)
    nombre = str(producto_data["nombre"]).strip()
    if len(nombre) < 2:
        raise ValueError("El nombre comercial del producto debe tener al menos 2 caracteres.")

    # 4. Validación de Precio (número no negativo)
    precio = producto_data["precio"]
    if not isinstance(precio, (int, float)):
        raise ValueError("El precio debe ser un valor numérico.")
    if precio < 0:
        raise ValueError("El precio no puede ser un valor negativo.")

    # 5. Validación de Stock (entero no negativo)
    stock = producto_data["stock"]
    if not isinstance(stock, int):
        raise ValueError("El stock debe ser un número entero.")
    if stock < 0:
        raise ValueError("El stock disponible no puede ser negativo.")

    # 6. Validación de Categoría (no vacía)
    categoria = str(producto_data["categoria"]).strip()
    if not categoria:
        raise ValueError("La categoría del producto es obligatoria.")


@requiere_rol("admin")
def crear_producto(producto_data):
    """
    Inserta un nuevo producto en la base de datos tras validar los datos.
    Permisos: Únicamente admin.
    
    Args:
        producto_data (dict): Datos del nuevo producto.
        
    Returns:
        str: El SKU del producto creado.
        
    Raises:
        ValueError: Si la validación falla o el SKU ya existe.
    """
    validar_producto(producto_data)
    
    db = obtener_db()
    
    # Preparar el documento limpio
    documento = {
        "sku": producto_data["sku"].strip().upper(),
        "nombre": producto_data["nombre"].strip(),
        "descripcion": producto_data.get("descripcion", "").strip(),
        "precio": float(producto_data["precio"]),
        "stock": int(producto_data["stock"]),
        "categoria": producto_data["categoria"].strip()
    }

    try:
        db.productos.insert_one(documento)
        return documento["sku"]
    except DuplicateKeyError:
        raise ValueError(f"Ya existe un producto registrado con el SKU '{documento['sku']}'.")
    except WriteError as e:
        error_msg = e.details.get("errmsg", str(e))
        raise ValueError(
            f"Error de validación en la base de datos de MongoDB: "
            f"El producto no cumple con el esquema. Detalle: {error_msg}"
        )


@requiere_rol(["admin", "vendedor"])
def obtener_producto(sku):
    """
    Busca un producto por su SKU.
    Permisos: admin, vendedor.
    
    Args:
        sku (str): SKU del producto a buscar.
        
    Returns:
        dict: Documento del producto o None si no se encuentra.
    """
    db = obtener_db()
    return db.productos.find_one({"sku": sku.strip().upper()})


@requiere_rol(["admin", "vendedor"])
def listar_productos():
    """
    Retorna todos los productos del catálogo.
    Permisos: admin, vendedor.
    
    Returns:
        list: Lista de documentos de productos.
    """
    db = obtener_db()
    return list(db.productos.find({}))


@requiere_rol("admin")
def actualizar_producto(sku, datos_actualizados):
    """
    Actualiza parcialmente los datos de un producto.
    Permisos: Únicamente admin.
    
    Args:
        sku (str): SKU del producto a actualizar.
        datos_actualizados (dict): Diccionario con los campos a modificar.
        
    Returns:
        bool: True si el producto fue modificado, False de lo contrario.
        
    Raises:
        ValueError: Si los datos no cumplen con las validaciones.
    """
    db = obtener_db()
    sku_upper = sku.strip().upper()
    
    producto_existente = db.productos.find_one({"sku": sku_upper})
    if not producto_existente:
        raise ValueError(f"No se encontró ningún producto con el SKU '{sku_upper}'.")

    # Combinar existentes y actualizados para validación de tipo y valores
    producto_combinado = {**producto_existente, **datos_actualizados}
    if "_id" in producto_combinado:
        del producto_combinado["_id"]

    validar_producto(producto_combinado)

    # Preparar campos a actualizar
    set_data = {
        "nombre": producto_combinado["nombre"].strip(),
        "descripcion": producto_combinado.get("descripcion", "").strip(),
        "precio": float(producto_combinado["precio"]),
        "stock": int(producto_combinado["stock"]),
        "categoria": producto_combinado["categoria"].strip()
    }

    try:
        resultado = db.productos.update_one({"sku": sku_upper}, {"$set": set_data})
        return resultado.modified_count > 0
    except WriteError as e:
        error_msg = e.details.get("errmsg", str(e))
        raise ValueError(
            f"Error de validación en la base de datos de MongoDB: "
            f"La actualización del producto infringe el esquema. Detalle: {error_msg}"
        )


@requiere_rol("admin")
def eliminar_producto(sku):
    """
    Elimina un producto del catálogo.
    Permisos: Únicamente admin.
    
    Args:
        sku (str): SKU del producto a eliminar.
        
    Returns:
        bool: True si fue eliminado, False si no existía.
        
    Raises:
        ValueError: Si el producto está asociado a un pedido activo.
    """
    db = obtener_db()
    sku_upper = sku.strip().upper()
    
    # Validar si el producto está referenciado en algún pedido
    pedidos_asociados = db.pedidos.count_documents({"items.sku": sku_upper})
    if pedidos_asociados > 0:
        raise ValueError(
            f"No se puede eliminar el producto porque está referenciado en {pedidos_asociados} "
            f"pedido(s) histórico(s). Considere dejar el stock en 0 si ya no se vende."
        )

    resultado = db.productos.delete_one({"sku": sku_upper})
    return resultado.deleted_count > 0
