# -*- coding: utf-8 -*-
"""
Módulo de conexión segura a MongoDB.
Gestiona el ciclo de vida de MongoClient utilizando variables de entorno.
"""

import os
import logging
# pyrefly: ignore [missing-import]
from pymongo import MongoClient
# pyrefly: ignore [missing-import]
from pymongo.errors import ConnectionFailure, OperationFailure, ConfigurationError
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Configurar el registro de logs básico
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno desde el archivo .env
load_dotenv()


def obtener_cliente_mongo():
    """
    Crea y retorna un MongoClient autenticado basado en variables de entorno.
    Maneja excepciones de conexión de manera segura sin exponer la contraseña.
    
    Returns:
        MongoClient: Instancia del cliente de MongoDB conectada.
        
    Raises:
        ConnectionFailure: Si no es posible establecer la conexión.
        ConfigurationError: Si hay errores en las variables de configuración.
    """
    host = os.getenv("MONGO_HOST", "localhost")
    port = os.getenv("MONGO_PORT", "27017")
    user = os.getenv("MONGO_USER")
    password = os.getenv("MONGO_PASS")
    db_name = os.getenv("MONGO_DB_NAME", "comerciotech")
    auth_source = os.getenv("MONGO_AUTH_SOURCE", "admin")
    
    # Soporte para URI personalizada (ej: Atlas) o construcción local
    custom_uri = os.getenv("MONGO_URI")
    
    if custom_uri:
        connection_uri = custom_uri
        # Ocultar contraseña para logs seguros
        if "@" in connection_uri:
            parts = connection_uri.split("@")
            prefix = parts[0].split("://")
            scheme = prefix[0]
            credentials = prefix[1].split(":")
            user_log = credentials[0]
            masked_uri = f"{scheme}://{user_log}:******@{parts[1]}"
        else:
            masked_uri = connection_uri
        logger.info(f"Conectando a MongoDB usando URI: {masked_uri}")
    else:
        # Construcción de URI local con autenticación si existe usuario
        if user and password:
            connection_uri = f"mongodb://{user}:{password}@{host}:{port}/{db_name}?authSource={auth_source}"
            masked_uri = f"mongodb://{user}:******@{host}:{port}/{db_name}?authSource={auth_source}"
        else:
            connection_uri = f"mongodb://{host}:{port}/{db_name}"
            masked_uri = connection_uri
        logger.info(f"Conectando a MongoDB: {masked_uri}")

    try:
        # Conexión con un timeout de 5 segundos para evitar bloqueos prolongados
        client = MongoClient(connection_uri, serverSelectionTimeoutMS=5000)
        
        # El comando admin ping fuerza la conexión y verificación de credenciales de inmediato.
        client.admin.command("ping")
        logger.info("Conexión exitosa a MongoDB verificada mediante ping.")
        return client
        
    except (ConnectionFailure, ConfigurationError) as e:
        logger.error(f"Error de conexión o configuración en MongoDB: {str(e)}")
        raise ConnectionFailure(
            "No se pudo conectar a la base de datos de MongoDB. "
            "Verifique que el servidor esté activo y que el host/puerto sean correctos."
        )
    except OperationFailure as e:
        logger.error(f"Error de autenticación u operación en MongoDB: {str(e)}")
        raise ConnectionFailure(
            "Error de autenticación. Verifique que las credenciales (usuario y contraseña) "
            "en el archivo .env sean válidas para la base de datos especificada."
        )
    except Exception as e:
        logger.error(f"Error inesperado al conectar a MongoDB: {str(e)}")
        raise ConnectionFailure(f"Error inesperado de conexión: {str(e)}")


def obtener_db():
    """
    Obtiene una referencia a la base de datos configurada en las variables de entorno.
    
    Returns:
        Database: Instancia de la base de datos de PyMongo.
    """
    db_name = os.getenv("MONGO_DB_NAME", "comerciotech")
    client = obtener_cliente_mongo()
    return client[db_name]
