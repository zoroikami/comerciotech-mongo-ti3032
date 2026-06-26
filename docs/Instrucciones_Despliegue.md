# Guía de Despliegue Seguro con Dominio y SSL en AWS EC2
## Proyecto: ComercioTech
### Dominio Asignado: `comerciotech.qd.je`

Esta guía detalla los pasos para realizar el despliegue de ComercioTech en la instancia EC2 utilizando el subdominio gratuito registrado en **FreeDomain** y configurando un certificado SSL de confianza de **Let's Encrypt** mediante **Certbot**.

---

## 1. Prerrequisitos en AWS y DNS

Antes de iniciar sesión en tu servidor EC2, debes asegurarte de completar los siguientes pasos en las consolas de administración correspondientes:

### A. Reservar y Asociar una IP Elástica (Elastic IP)
1. Ve a la consola web de **AWS EC2**.
2. En el menú izquierdo, bajo **Network & Security**, selecciona **Elastic IPs**.
3. Haz clic en **Allocate Elastic IP address** y luego en **Allocate**.
4. Selecciona la IP elástica creada, haz clic en **Actions** -> **Associate Elastic IP address**.
5. Selecciona tu instancia EC2 de ComercioTech (Amazon Linux 2023 o Ubuntu) y asóciala.
   * *Nota:* Esto evitará que la IP pública de tu servidor cambie cuando este se apague o reinicie.

### B. Configurar el DNS en FreeDomain
1. Entra a tu panel de administración en [dash.domain.digitalplat.org](https://dash.domain.digitalplat.org/).
2. Localiza tu dominio registrado: `comerciotech.qd.je`.
3. Crea o edita un **registro tipo A**:
   * **Host/Name:** `@` (o déjalo en blanco para el dominio principal).
   * **Value/Target:** Ingresa la **IP Elástica** que reservaste en AWS en el paso anterior.
   * Guarda los cambios.

### C. Configurar el Grupo de Seguridad de AWS (Security Groups)
Asegúrate de que el Grupo de Seguridad de tu instancia EC2 permita el tráfico entrante en los siguientes puertos:
*   **Puerto 22 (SSH):** Para administrar tu servidor.
*   **Puerto 80 (HTTP):** Necesario para la redirección y para que Certbot valide el dominio.
*   **Puerto 443 (HTTPS):** Para el tráfico web seguro y cifrado TLS hacia la aplicación.
*   **Puerto 27017 (MongoDB):** **DEBE** permanecer cerrado al público (solo accesible localmente o desde tu VPC) para cumplir con las políticas de hardening de ciberseguridad.

---

## 2. Preparación del Servidor en AWS EC2

Conéctate a tu instancia EC2 mediante SSH desde tu terminal local:

```bash
# Para Amazon Linux 2023:
ssh -i "tu-llave.pem" ec2-user@tu-ip-elastica

# Para Ubuntu Server:
ssh -i "tu-llave.pem" ubuntu@tu-ip-elastica
```

Una vez dentro de la máquina virtual, sigue estos pasos para instalar y preparar el entorno de ComercioTech:

### A. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/nohinohey.git
cd nohinohey
```

### B. Configurar variables de entorno y base de datos
Copia el archivo `.env.example` para crear tu archivo de producción `.env`:
```bash
cp .env.example .env
```
Edita el archivo `.env` utilizando `nano` o `vi` para configurar los accesos de tu base de datos de producción:
```bash
nano .env
```
*(Asegúrate de que las contraseñas coincidan con las configuradas en tus scripts de inicialización de base de datos).*

### C. Crear el Entorno Virtual e instalar dependencias
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 3. Ejecución del Script de Configuración de SSL y Servicios

Hemos provisto un script de automatización (`setup_ssl.sh`) que detectará el sistema operativo (Amazon Linux 2023 o Ubuntu), instalará Nginx, configurará el proxy inverso, instalará Certbot y registrará el certificado SSL de manera interactiva.

1.  **Dar permisos de ejecución al script:**
    ```bash
    chmod +x scripts/setup_ssl.sh
    ```

2.  **Ejecutar el script con privilegios de administrador (sudo):**
    ```bash
    sudo ./scripts/setup_ssl.sh
    ```

3.  **Seguir las instrucciones en pantalla:**
    *   Ingresa tu correo electrónico cuando **Certbot** te lo solicite (se usará para avisarte sobre la renovación del certificado).
    *   Acepta los términos de servicio (TOS) presionando `Y`.
    *   Decide si deseas compartir tu correo con la EFF (opcional).

El script configurará todo automáticamente. Al finalizar, mostrará un mensaje confirmando que la instalación fue exitosa.

---

## 4. Verificación y Monitoreo del Estado

### A. Verificar en el Navegador
Abre tu navegador e ingresa a:
```text
https://comerciotech.qd.je
```
Deberías ver el panel web de ComercioTech cargando correctamente y un **candado de seguridad (HTTPS)** en la barra de direcciones que indica que la conexión está cifrada.

### B. Comprobar servicios del sistema
Puedes verificar que tanto el proxy de Nginx como tu aplicación Flask estén activos y corriendo sin errores:

```bash
# Verificar estado del servidor web Nginx
sudo systemctl status nginx

# Verificar estado de la aplicación ComercioTech (Flask)
sudo systemctl status comerciotech
```

### C. Lectura de logs en tiempo real
Si la aplicación presenta algún fallo o deseas monitorear las solicitudes HTTP que recibe Flask:
```bash
sudo journalctl -u comerciotech -f
```
