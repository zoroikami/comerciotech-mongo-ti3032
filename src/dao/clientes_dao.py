# -*- coding: utf-8 -*-
"""
Módulo DAO para la colección de 'clientes'.
Implementa el CRUD, validaciones en capa Python y control de acceso (RBAC).
"""

import re
from datetime import datetime
from pymongo.errors import WriteError, DuplicateKeyError
from src.conexion import obtener_db
from src.auth import requiere_rol


def validar_cliente(cliente_data):
    """
    Valida la estructura y formato de los datos de un cliente en la capa Python.
    
    Args:
        cliente_data (dict): Diccionario con los datos del cliente.
        
    Raises:
        ValueError: Si los datos no cumplen con los formatos requeridos.
    """
    # 1. Campos obligatorios
    campos_requeridos = ["rut", "nombre", "email", "telefono", "direccion"]
    for campo in campos_requeridos:
        if campo not in cliente_data or cliente_data[campo] is None:
            raise ValueError(f"El campo '{campo}' es obligatorio.")

    # 2. Validación de RUT (Formato: 12345678-9 o 1234567-K)
    rut = str(cliente_data["rut"]).strip()
    if not re.match(r"^\d{7,8}-[\dkK]$", rut):
        raise ValueError("El RUT debe tener un formato válido sin puntos y con guión (ej: 12345678-9).")

    # 3. Validación de Nombre (mínimo 2 caracteres)
    nombre = str(cliente_data["nombre"]).strip()
    if len(nombre) < 2:
        raise ValueError("El nombre completo debe tener al menos 2 caracteres.")

    # 4. Validación de Email (Regex estándar)
    email = str(cliente_data["email"]).strip()
    email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_regex, email):
        raise ValueError("El correo electrónico ingresado no tiene un formato válido.")

    # 5. Validación de Teléfono (no vacío)
    telefono = str(cliente_data["telefono"]).strip()
    if not telefono:
        raise ValueError("El teléfono no puede estar vacío.")

    # 6. Validación de Dirección
    direccion = cliente_data["direccion"]
    if not isinstance(direccion, dict):
        raise ValueError("La dirección debe ser un objeto (diccionario).")
    
    subcampos_direccion = ["calle", "numero", "comuna", "ciudad"]
    for subcampo in subcampos_direccion:
        if subcampo not in direccion or not str(direccion[subcampo]).strip():
            raise ValueError(f"La dirección requiere el subcampo '{subcampo}' y no puede estar vacío.")


@requiere_rol(["admin", "vendedor"])
def crear_cliente(cliente_data):
    """
    Inserta un nuevo cliente en la base de datos tras validar los datos.
    Permisos: admin, vendedor.
    
    Args:
        cliente_data (dict): Diccionario con los datos del cliente.
        
    Returns:
        str: El RUT del cliente insertado.
        
    Raises:
        ValueError: Si los datos no son válidos o si el cliente ya existe.
    """
    validar_cliente(cliente_data)
    
    db = obtener_db()
    
    # Asegurar que se guarde la fecha actual de registro
    documento = {
        "rut": cliente_data["rut"].strip(),
        "nombre": cliente_data["nombre"].strip(),
        "email": cliente_data["email"].strip().lower(),
        "telefono": cliente_data["telefono"].strip(),
        "direccion": {
            "calle": cliente_data["direccion"]["calle"].strip(),
            "numero": cliente_data["direccion"]["numero"].strip(),
            "comuna": cliente_data["direccion"]["comuna"].strip(),
            "ciudad": cliente_data["direccion"]["ciudad"].strip()
        },
        "fecha_registro": datetime.utcnow()
    }

    try:
        db.clientes.insert_one(documento)
        return documento["rut"]
    except DuplicateKeyError:
        raise ValueError(f"Ya existe un cliente registrado con el RUT o Email provisto.")
    except WriteError as e:
        # Captura excepciones de validación $jsonSchema de MongoDB
        error_msg = e.details.get("errmsg", str(e))
        raise ValueError(
            f"Error de validación en la base de datos de MongoDB: "
            f"Los datos no cumplen con el esquema de la colección. Detalle: {error_msg}"
        )


@requiere_rol(["admin", "vendedor"])
def obtener_cliente(rut):
    """
    Busca un cliente por su RUT.
    Permisos: admin, vendedor.
    
    Args:
        rut (str): RUT del cliente a buscar.
        
    Returns:
        dict: Documento del cliente o None si no se encuentra.
    """
    db = obtener_db()
    return db.clientes.find_one({"rut": rut.strip()})


@requiere_rol(["admin", "vendedor"])
def listar_clientes():
    """
    Retorna todos los clientes registrados.
    Permisos: admin, vendedor.
    
    Returns:
        list: Lista de documentos de clientes.
    """
    db = obtener_db()
    return list(db.clientes.find({}))


@requiere_rol(["admin", "vendedor"])
def actualizar_cliente(rut, datos_actualizados):
    """
    Actualiza parcialmente los datos de un cliente existente.
    Permisos: admin, vendedor.
    
    Args:
        rut (str): RUT del cliente a modificar.
        datos_actualizados (dict): Diccionario con los campos a actualizar.
        
    Returns:
        bool: True si el registro fue actualizado, False en caso contrario.
        
    Raises:
        ValueError: Si los datos a actualizar no cumplen con las validaciones.
    """
    db = obtener_db()
    cliente_existente = db.clientes.find_one({"rut": rut.strip()})
    if not cliente_existente:
        raise ValueError(f"No se encontró ningún cliente registrado con el RUT {rut}.")

    # Combinar los datos existentes con los actualizados para realizar una validación completa
    cliente_combinado = {**cliente_existente, **datos_actualizados}
    # Evitar validar el id de mongo
    if "_id" in cliente_combinado:
        del cliente_combinado["_id"]
        
    validar_cliente(cliente_combinado)

    # Preparar el documento de actualización
    set_data = {
        "nombre": cliente_combinado["nombre"].strip(),
        "email": cliente_combinado["email"].strip().lower(),
        "telefono": cliente_combinado["telefono"].strip(),
        "direccion": {
            "calle": cliente_combinado["direccion"]["calle"].strip(),
            "numero": cliente_combinado["direccion"]["numero"].strip(),
            "comuna": cliente_combinado["direccion"]["comuna"].strip(),
            "ciudad": cliente_combinado["direccion"]["ciudad"].strip()
        }
    }

    try:
        resultado = db.clientes.update_one({"rut": rut.strip()}, {"$set": set_data})
        return resultado.modified_count > 0
    except DuplicateKeyError:
        raise ValueError("No se pudo actualizar. El nuevo correo electrónico ya está registrado por otro cliente.")
    except WriteError as e:
        error_msg = e.details.get("errmsg", str(e))
        raise ValueError(
            f"Error de validación en la base de datos de MongoDB: "
            f"La actualización no cumple con el esquema. Detalle: {error_msg}"
        )


@requiere_rol("admin")
def eliminar_cliente(rut):
    """
    Elimina un cliente por su RUT.
    Permisos: Únicamente admin.
    
    Args:
        rut (str): RUT del cliente a eliminar.
        
    Returns:
        bool: True si el cliente fue eliminado, False si no existía.
    """
    db = obtener_db()
    
    # Adicionalmente, podríamos verificar si el cliente tiene pedidos asociados.
    # Si tiene pedidos, no deberíamos permitir eliminarlo o deberíamos advertir.
    pedidos_asociados = db.pedidos.count_documents({"cliente_rut": rut.strip()})
    if pedidos_asociados > 0:
        raise ValueError(
            f"No se puede eliminar el cliente porque posee {pedidos_asociados} "
            f"pedido(s) relacionado(s) en el sistema. Elimine o cancele los pedidos primero."
        )
        
    resultado = db.clientes.delete_one({"rut": rut.strip()})
    return resultado.deleted_count > 0
