# -*- coding: utf-8 -*-
"""
Módulo DAO para la colección de 'pedidos'.
Implementa CRUD completo, validaciones en Python (incluyendo relación cliente y stock de producto) y RBAC.
"""

import re
from datetime import datetime
from pymongo.errors import WriteError, DuplicateKeyError
from src.conexion import obtener_db
from src.auth import requiere_rol


def validar_pedido(pedido_data, db):
    """
    Valida los datos de un pedido en la capa Python, verificando existencia de cliente,
    existencia de productos, consistencia de precios, subtotales y cálculo de total.
    
    Args:
        pedido_data (dict): Datos del pedido a validar.
        db (Database): Instancia de base de datos PyMongo para validar referencias.
        
    Raises:
        ValueError: Si alguna regla de validación de negocio no se cumple.
    """
    # 1. Campos obligatorios
    campos_requeridos = ["numero_pedido", "cliente_rut", "estado", "items", "direccion_envio"]
    for campo in campos_requeridos:
        if campo not in pedido_data or pedido_data[campo] is None:
            raise ValueError(f"El campo '{campo}' es obligatorio.")

    # 2. Validación formato del número de pedido (ej: PED-1001)
    numero_pedido = str(pedido_data["numero_pedido"]).strip()
    if not re.match(r"^PED-\d+$", numero_pedido):
        raise ValueError("El número de pedido debe comenzar con 'PED-' seguido de números (ej: PED-1001).")

    # 3. Validación de la existencia del cliente referenciado
    cliente_rut = str(pedido_data["cliente_rut"]).strip()
    cliente = db.clientes.find_one({"rut": cliente_rut})
    if not cliente:
        raise ValueError(f"El cliente con RUT '{cliente_rut}' no existe en el sistema.")

    # 4. Validación de estado (Enum permitido)
    estado = str(pedido_data["estado"]).strip()
    estados_permitidos = ["pendiente", "pagado", "despachado", "entregado", "cancelado"]
    if estado not in estados_permitidos:
        raise ValueError(f"El estado '{estado}' no es válido. Valores permitidos: {', '.join(estados_permitidos)}")

    # 5. Validación de Dirección de Envío
    direccion = pedido_data["direccion_envio"]
    if not isinstance(direccion, dict):
        raise ValueError("La dirección de envío debe ser un objeto (diccionario).")
    
    subcampos_direccion = ["calle", "numero", "comuna", "ciudad"]
    for subcampo in subcampos_direccion:
        if subcampo not in direccion or not str(direccion[subcampo]).strip():
            raise ValueError(f"La dirección de envío requiere el subcampo '{subcampo}' y no puede estar vacío.")

    # 6. Validación de Items (mínimo 1 item)
    items = pedido_data["items"]
    if not isinstance(items, list) or len(items) == 0:
        raise ValueError("El pedido debe contener al menos un producto (item).")

    total_calculado = 0
    skus_vistos = set()

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"El item en el índice {idx} debe ser un diccionario.")

        # Verificar campos requeridos en el item
        campos_item = ["sku", "cantidad"]
        for ci in campos_item:
            if ci not in item or item[ci] is None:
                raise ValueError(f"El item {idx} requiere el campo '{ci}'.")

        sku = str(item["sku"]).strip().upper()
        if sku in skus_vistos:
            raise ValueError(f"El producto con SKU '{sku}' está duplicado en el pedido. Incremente la cantidad del item anterior.")
        skus_vistos.add(sku)

        cantidad = item["cantidad"]
        if not isinstance(cantidad, int) or cantidad < 1:
            raise ValueError(f"La cantidad en el item '{sku}' debe ser un entero mayor o igual a 1.")

        # Consultar el producto real en la base de datos
        prod = db.productos.find_one({"sku": sku})
        if not prod:
            raise ValueError(f"El producto con SKU '{sku}' en el item {idx} no existe en el catálogo.")

        # Obtener y verificar precio unitario
        precio_unitario = prod["precio"]
        
        # Calcular subtotal
        subtotal = precio_unitario * cantidad
        
        # Guardar/inyectar datos reales del catálogo para evitar fraudes/errores del cliente
        item["sku"] = sku
        item["nombre_producto"] = prod["nombre"]
        item["precio_unitario"] = precio_unitario
        item["subtotal"] = subtotal
        
        total_calculado += subtotal

    # Establecer el total final
    pedido_data["total"] = total_calculado


@requiere_rol(["admin", "vendedor"])
def crear_pedido(pedido_data):
    """
    Registra un nuevo pedido. Verifica stock, reduce el stock disponible en el catálogo
    e inserta el documento de pedido de forma atómica en la transacción implícita.
    Permisos: admin, vendedor.
    
    Args:
        pedido_data (dict): Estructura del pedido a crear.
        
    Returns:
        str: El número de pedido insertado.
        
    Raises:
        ValueError: Si los datos no son válidos, si no hay stock o si el pedido ya existe.
    """
    db = obtener_db()
    
    # 1. Validar reglas de negocio básicas en Python
    validar_pedido(pedido_data, db)
    
    # 2. Verificar stock suficiente de cada item antes de insertar
    for item in pedido_data["items"]:
        sku = item["sku"]
        cant_solicitada = item["cantidad"]
        
        prod = db.productos.find_one({"sku": sku})
        if prod["stock"] < cant_solicitada:
            raise ValueError(
                f"Stock insuficiente para el producto '{prod['nombre']}' (SKU: {sku}). "
                f"Solicitado: {cant_solicitada}, Disponible: {prod['stock']}."
            )

    # 3. Descontar stock e insertar pedido
    for item in pedido_data["items"]:
        sku = item["sku"]
        cant_solicitada = item["cantidad"]
        db.productos.update_one(
            {"sku": sku},
            {"$inc": {"stock": -cant_solicitada}}
        )

    documento = {
        "numero_pedido": pedido_data["numero_pedido"].strip().upper(),
        "cliente_rut": pedido_data["cliente_rut"].strip(),
        "fecha_pedido": datetime.utcnow(),
        "estado": pedido_data["estado"].strip(),
        "items": pedido_data["items"],
        "total": pedido_data["total"],
        "direccion_envio": {
            "calle": pedido_data["direccion_envio"]["calle"].strip(),
            "numero": pedido_data["direccion_envio"]["numero"].strip(),
            "comuna": pedido_data["direccion_envio"]["comuna"].strip(),
            "ciudad": pedido_data["direccion_envio"]["ciudad"].strip()
        }
    }

    try:
        db.pedidos.insert_one(documento)
        return documento["numero_pedido"]
    except DuplicateKeyError:
        # Revertir stock si falló el insert
        for item in pedido_data["items"]:
            db.productos.update_one(
                {"sku": item["sku"]},
                {"$inc": {"stock": item["cantidad"]}}
            )
        raise ValueError(f"Ya existe un pedido registrado con el número '{documento['numero_pedido']}'.")
    except WriteError as e:
        # Revertir stock si falló la validación
        for item in pedido_data["items"]:
            db.productos.update_one(
                {"sku": item["sku"]},
                {"$inc": {"stock": item["cantidad"]}}
            )
        error_msg = e.details.get("errmsg", str(e))
        raise ValueError(
            f"Error de validación en la base de datos de MongoDB: "
            f"El pedido no cumple con el esquema. Detalle: {error_msg}"
        )


@requiere_rol(["admin", "vendedor"])
def obtener_pedido(numero_pedido):
    """
    Busca un pedido por su identificador único.
    Permisos: admin, vendedor.
    
    Args:
        numero_pedido (str): Número identificador del pedido.
        
    Returns:
        dict: Documento del pedido o None si no se encuentra.
    """
    db = obtener_db()
    return db.pedidos.find_one({"numero_pedido": numero_pedido.strip().upper()})


@requiere_rol(["admin", "vendedor"])
def listar_pedidos():
    """
    Retorna todos los pedidos en el sistema.
    Permisos: admin, vendedor.
    
    Returns:
        list: Lista de documentos de pedidos.
    """
    db = obtener_db()
    return list(db.pedidos.find({}))


@requiere_rol(["admin", "vendedor"])
def actualizar_pedido(numero_pedido, datos_actualizados):
    """
    Actualiza parcialmente los datos de un pedido (por ejemplo, cambiar su estado).
    Si el estado cambia a 'cancelado', se reintegra el stock al catálogo.
    Permisos: admin, vendedor.
    
    Args:
        numero_pedido (str): Número del pedido a actualizar.
        datos_actualizados (dict): Diccionario con los campos modificados.
        
    Returns:
        bool: True si el pedido fue modificado, False de lo contrario.
        
    Raises:
        ValueError: Si el pedido no existe o los datos no cumplen con las reglas.
    """
    db = obtener_db()
    num_ped_upper = numero_pedido.strip().upper()
    
    pedido_existente = db.pedidos.find_one({"numero_pedido": num_ped_upper})
    if not pedido_existente:
        raise ValueError(f"No se encontró ningún pedido con el número '{num_ped_upper}'.")

    # Combinar datos
    pedido_combinado = {**pedido_existente, **datos_actualizados}
    if "_id" in pedido_combinado:
        del pedido_combinado["_id"]

    # Validar integridad
    validar_pedido(pedido_combinado, db)

    # Lógica especial de cancelación: si pasa de NO cancelado a 'cancelado', devolver stock
    estado_anterior = pedido_existente["estado"]
    nuevo_estado = pedido_combinado["estado"]
    
    if estado_anterior != "cancelado" and nuevo_estado == "cancelado":
        # Reintegrar stock
        for item in pedido_existente["items"]:
            db.productos.update_one(
                {"sku": item["sku"]},
                {"$inc": {"stock": item["cantidad"]}}
            )
            
    # Lógica contraria: si pasa de 'cancelado' a otro estado, intentar descontar stock si hay disponible
    elif estado_anterior == "cancelado" and nuevo_estado != "cancelado":
        # Validar y descontar stock
        for item in pedido_existente["items"]:
            sku = item["sku"]
            cant = item["cantidad"]
            prod = db.productos.find_one({"sku": sku})
            if prod["stock"] < cant:
                raise ValueError(
                    f"No se puede reactivar el pedido. Stock insuficiente para '{prod['nombre']}'. "
                    f"Requerido: {cant}, Disponible: {prod['stock']}."
                )
        # Si todos tienen stock, descontar
        for item in pedido_existente["items"]:
            db.productos.update_one(
                {"sku": item["sku"]},
                {"$inc": {"stock": -item["cantidad"]}}
            )

    set_data = {
        "estado": nuevo_estado,
        "total": pedido_combinado["total"],
        "direccion_envio": {
            "calle": pedido_combinado["direccion_envio"]["calle"].strip(),
            "numero": pedido_combinado["direccion_envio"]["numero"].strip(),
            "comuna": pedido_combinado["direccion_envio"]["comuna"].strip(),
            "ciudad": pedido_combinado["direccion_envio"]["ciudad"].strip()
        }
    }

    try:
        resultado = db.pedidos.update_one({"numero_pedido": num_ped_upper}, {"$set": set_data})
        return resultado.modified_count > 0
    except WriteError as e:
        error_msg = e.details.get("errmsg", str(e))
        raise ValueError(
            f"Error de validación en la base de datos de MongoDB: "
            f"La actualización infringe el esquema. Detalle: {error_msg}"
        )


@requiere_rol("admin")
def eliminar_pedido(numero_pedido):
    """
    Elimina un pedido del sistema. Si el pedido NO estaba cancelado, reintegra su stock.
    Permisos: Únicamente admin.
    
    Args:
        numero_pedido (str): Número del pedido a eliminar.
        
    Returns:
        bool: True si fue eliminado, False si no existía.
    """
    db = obtener_db()
    num_ped_upper = numero_pedido.strip().upper()
    
    pedido = db.pedidos.find_one({"numero_pedido": num_ped_upper})
    if not pedido:
        return False
        
    # Reintegrar stock si no estaba cancelado (los cancelados ya reintegraron el stock)
    if pedido["estado"] != "cancelado":
        for item in pedido["items"]:
            db.productos.update_one(
                {"sku": item["sku"]},
                {"$inc": {"stock": item["cantidad"]}}
            )

    resultado = db.pedidos.delete_one({"numero_pedido": num_ped_upper})
    return resultado.deleted_count > 0
