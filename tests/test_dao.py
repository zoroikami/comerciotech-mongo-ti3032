# -*- coding: utf-8 -*-
"""
Módulo de pruebas unitarias y de integración para la capa DAO y RBAC de ComercioTech.
Utiliza 'mongomock' para emular la base de datos de MongoDB en memoria.
Asignatura: Bases de Datos No Estructuradas (TI3032).
"""

import unittest
from unittest.mock import patch
from datetime import datetime
import mongomock

# Módulos de ComercioTech
from src.auth import (
    login, logout, obtener_usuario_actual, hash_password,
    AccesoDenegadoError, _usuario_actual
)
import src.auth
from src import auth
from src.dao import clientes_dao, productos_dao, pedidos_dao


class TestComercioTech(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Inicializa la base de datos mock y parcha los módulos de conexión."""
        cls.db_mock = mongomock.MongoClient().comerciotech
        
        # Parches para redirigir la base de datos en todos los namespaces
        cls.patchers = [
            patch("src.conexion.obtener_db", return_value=cls.db_mock),
            patch("src.auth.obtener_db", return_value=cls.db_mock),
            patch("src.dao.clientes_dao.obtener_db", return_value=cls.db_mock),
            patch("src.dao.productos_dao.obtener_db", return_value=cls.db_mock),
            patch("src.dao.pedidos_dao.obtener_db", return_value=cls.db_mock)
        ]
        
        for p in cls.patchers:
            p.start()
        
        # Inicializar usuarios de prueba en la base de datos mock
        cls.db_mock.usuarios.insert_many([
            {
                "username": "admin_test",
                "password": hash_password("pass123"),
                "rol": "admin",
                "nombre": "Administrador de Pruebas"
            },
            {
                "username": "vendedor_test",
                "password": hash_password("vende123"),
                "rol": "vendedor",
                "nombre": "Vendedor de Pruebas"
            }
        ])

    @classmethod
    def tearDownClass(cls):
        """Detiene los parches de conexión."""
        for p in cls.patchers:
            p.stop()

    def setUp(self):
        """Limpia las colecciones de negocio antes de cada prueba y cierra sesión."""
        logout()
        self.db_mock.clientes.delete_many({})
        self.db_mock.productos.delete_many({})
        self.db_mock.pedidos.delete_many({})

    # ==========================================
    # 1. Pruebas de Autenticación y RBAC
    # ==========================================
    def test_login_exitoso(self):
        """Verifica que un usuario pueda iniciar sesión con credenciales correctas."""
        user = login("admin_test", "pass123")
        self.assertIsNotNone(user)
        self.assertEqual(user["username"], "admin_test")
        self.assertEqual(user["rol"], "admin")
        self.assertEqual(obtener_usuario_actual()["username"], "admin_test")

    def test_login_fallido_usuario_inexistente(self):
        """Verifica que el login falle ante un usuario inexistente."""
        with self.assertRaises(ValueError):
            login("no_existe", "pass123")

    def test_login_fallido_clave_incorrecta(self):
        """Verifica que el login falle ante una contraseña incorrecta."""
        with self.assertRaises(ValueError):
            login("admin_test", "clave_mala")

    def test_logout(self):
        """Verifica que cerrar sesión limpie el estado global."""
        login("admin_test", "pass123")
        logout()
        self.assertIsNone(obtener_usuario_actual())

    def test_rbac_denegado_sin_login(self):
        """Verifica que se deniegue el acceso si no hay sesión iniciada."""
        # Intentar crear un cliente sin iniciar sesión debe lanzar AccesoDenegadoError
        cliente = {
            "rut": "11111111-1",
            "nombre": "Test",
            "email": "test@test.cl",
            "telefono": "123",
            "direccion": {"calle": "A", "numero": "1", "comuna": "C", "ciudad": "C"}
        }
        with self.assertRaises(AccesoDenegadoError):
            clientes_dao.crear_cliente(cliente)

    # ==========================================
    # 2. Pruebas de Clientes DAO
    # ==========================================
    def test_crear_cliente_exitoso(self):
        """Verifica la inserción de un cliente con datos válidos (Rol Vendedor)."""
        login("vendedor_test", "vende123")  # Vendedor tiene acceso a crear clientes
        cliente = {
            "rut": "12345678-9",
            "nombre": "Claudio Valdés",
            "email": "claudio@correo.cl",
            "telefono": "+56987654321",
            "direccion": {
                "calle": "San Martín",
                "numero": "234",
                "comuna": "Concepción",
                "ciudad": "Concepción"
            }
        }
        rut = clientes_dao.crear_cliente(cliente)
        self.assertEqual(rut, "12345678-9")
        
        # Validar persistencia en base de datos mock
        guardado = self.db_mock.clientes.find_one({"rut": "12345678-9"})
        self.assertIsNotNone(guardado)
        self.assertEqual(guardado["nombre"], "Claudio Valdés")
        self.assertIsInstance(guardado["fecha_registro"], datetime)

    def test_crear_cliente_error_validacion_email(self):
        """Verifica que la capa Python aborte la inserción con emails inválidos."""
        login("admin_test", "pass123")
        cliente_invalido = {
            "rut": "12345678-9",
            "nombre": "Claudio Valdés",
            "email": "email_invalido.com",  # Formato incorrecto
            "telefono": "123456",
            "direccion": {"calle": "A", "numero": "1", "comuna": "B", "ciudad": "C"}
        }
        with self.assertRaises(ValueError) as ctx:
            clientes_dao.crear_cliente(cliente_invalido)
        self.assertIn("correo electrónico", str(ctx.exception))

    def test_eliminar_cliente_rbac(self):
        """Verifica que la eliminación de clientes esté restringida a Admin."""
        # 1. Crear un cliente preliminar
        login("admin_test", "pass123")
        cliente = {
            "rut": "12345678-9",
            "nombre": "Test",
            "email": "test@correo.cl",
            "telefono": "123",
            "direccion": {"calle": "A", "numero": "1", "comuna": "B", "ciudad": "C"}
        }
        clientes_dao.crear_cliente(cliente)
        
        # 2. Intentar eliminar con rol 'vendedor' (debe lanzar error)
        login("vendedor_test", "vende123")
        with self.assertRaises(AccesoDenegadoError):
            clientes_dao.eliminar_cliente("12345678-9")
            
        # 3. Eliminar con rol 'admin' (debe tener éxito)
        login("admin_test", "pass123")
        eliminado = clientes_dao.eliminar_cliente("12345678-9")
        self.assertTrue(eliminado)

    # ==========================================
    # 3. Pruebas de Productos DAO
    # ==========================================
    def test_productos_crud_restriccion_vendedor(self):
        """Verifica que un vendedor no pueda crear ni actualizar productos."""
        login("vendedor_test", "vende123")
        prod = {
            "sku": "PROD-001",
            "nombre": "Mouse",
            "precio": 5000,
            "stock": 10,
            "categoria": "Accesorios"
        }
        # Crear denegado para vendedor
        with self.assertRaises(AccesoDenegadoError):
            productos_dao.crear_producto(prod)

    def test_crear_producto_exitoso_y_error_negativos(self):
        """Verifica creación de producto por admin y validación de stock no negativo."""
        login("admin_test", "pass123")
        prod_bueno = {
            "sku": "PROD-OK",
            "nombre": "Monitor Gamer",
            "precio": 190000,
            "stock": 5,
            "categoria": "Pantallas"
        }
        sku = productos_dao.crear_producto(prod_bueno)
        self.assertEqual(sku, "PROD-OK")

        # Intentar insertar con stock negativo
        prod_malo = {
            "sku": "PROD-NEG",
            "nombre": "Teclado",
            "precio": 15000,
            "stock": -2,  # Negativo inválido
            "categoria": "Accesorios"
        }
        with self.assertRaises(ValueError) as ctx:
            productos_dao.crear_producto(prod_malo)
        self.assertIn("stock", str(ctx.exception).lower())

    # ==========================================
    # 4. Pruebas de Pedidos DAO y Stock
    # ==========================================
    def test_flujo_pedido_descuenta_y_devuelve_stock(self):
        """Verifica el flujo del pedido: descuenta stock al crearse y lo devuelve al cancelarse."""
        login("admin_test", "pass123")
        
        # 1. Crear cliente y producto
        clientes_dao.crear_cliente({
            "rut": "12345678-9",
            "nombre": "Juan Pérez",
            "email": "juan@correo.cl",
            "telefono": "123",
            "direccion": {"calle": "A", "numero": "1", "comuna": "B", "ciudad": "C"}
        })
        productos_dao.crear_producto({
            "sku": "PROD-STOCK",
            "nombre": "Pendrive 64GB",
            "precio": 10000,
            "stock": 20,
            "categoria": "Almacenamiento"
        })

        # 2. Crear pedido solicitando 5 unidades (Stock debe bajar a 15)
        pedido = {
            "numero_pedido": "PED-1",
            "cliente_rut": "12345678-9",
            "estado": "pendiente",
            "items": [
                {"sku": "PROD-STOCK", "cantidad": 5}
            ],
            "direccion_envio": {"calle": "A", "numero": "1", "comuna": "B", "ciudad": "C"}
        }
        pedidos_dao.crear_pedido(pedido)
        
        # Verificar stock disminuido
        p = productos_dao.obtener_producto("PROD-STOCK")
        self.assertEqual(p["stock"], 15)

        # 3. Cancelar pedido (Stock debe reintegrarse a 20)
        pedidos_dao.actualizar_pedido("PED-1", {"estado": "cancelado"})
        p = productos_dao.obtener_producto("PROD-STOCK")
        self.assertEqual(p["stock"], 20)


if __name__ == "__main__":
    unittest.main()
