# -*- coding: utf-8 -*-
"""
Módulo de autenticación y control de acceso basado en roles (RBAC).
Asignatura: Bases de Datos No Estructuradas (TI3032).
"""

import functools
import hashlib
from src.conexion import obtener_db


class AccesoDenegadoError(Exception):
    """Excepción lanzada cuando un usuario no tiene permisos para una operación."""
    pass


# Estado global de la sesión actual del usuario
_usuario_actual = None


def obtener_usuario_actual():
    """
    Retorna el usuario actualmente autenticado en la sesión.
    
    Returns:
        dict: Diccionario del usuario o None si no hay sesión activa.
    """
    global _usuario_actual
    return _usuario_actual


def hash_password(password):
    """
    Genera un hash SHA-256 para almacenar o comparar contraseñas.
    
    Args:
        password (str): Contraseña en texto plano.
        
    Returns:
        str: Hash hexadecimal.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def login(username, password):
    """
    Autentica a un usuario consultando la colección 'usuarios' en MongoDB.
    
    Args:
        username (str): Nombre de usuario.
        password (str): Contraseña en texto plano.
        
    Returns:
        dict: Datos del usuario autenticado si es exitoso.
        
    Raises:
        ValueError: Si las credenciales son incorrectas o no existe la base de datos.
    """
    global _usuario_actual
    try:
        db = obtener_db()
        # Buscar usuario en la colección 'usuarios'
        user_doc = db.usuarios.find_one({"username": username})
        
        if not user_doc:
            raise ValueError("Usuario no encontrado.")
            
        # Verificar contraseña hashed
        pwd_hash = hash_password(password)
        if user_doc["password"] != pwd_hash:
            raise ValueError("Contraseña incorrecta.")
            
        _usuario_actual = {
            "username": user_doc["username"],
            "rol": user_doc["rol"],
            "nombre": user_doc.get("nombre", username)
        }
        return _usuario_actual
    except Exception as e:
        if isinstance(e, ValueError):
            raise e
        raise ConnectionError(f"No se pudo conectar para autenticar: {str(e)}")


def logout():
    """Cierra la sesión del usuario actual."""
    global _usuario_actual
    _usuario_actual = None


def requiere_rol(roles_permitidos):
    """
    Decorador para restringir el acceso a funciones DAO basadas en el rol del usuario.
    
    Args:
        roles_permitidos (list o str): Rol o lista de roles que tienen permitido ejecutar la función.
        
    Returns:
        function: Función decorada.
        
    Raises:
        AccesoDenegadoError: Si el usuario no está autenticado o no posee un rol autorizado.
    """
    if isinstance(roles_permitidos, str):
        roles_permitidos = [roles_permitidos]

    def decorador(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            global _usuario_actual
            if not _usuario_actual:
                raise AccesoDenegadoError("Operación denegada: Debe iniciar sesión primero.")
                
            rol_usuario = _usuario_actual.get("rol")
            if rol_usuario not in roles_permitidos:
                raise AccesoDenegadoError(
                    f"Acceso denegado: El rol '{rol_usuario}' no tiene permisos para "
                    f"realizar esta operación. Se requiere uno de: {', '.join(roles_permitidos)}."
                )
            return func(*args, **kwargs)
        return wrapper
    return decorador
