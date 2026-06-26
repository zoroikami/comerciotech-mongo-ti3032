#!/bin/bash
# ==============================================================================
# Script de automatización de despliegue y SSL para ComercioTech en AWS EC2
# Soporta: Amazon Linux 2023 y Ubuntu Server
# Dominio: comerciotech.qd.je
# ==============================================================================

# Colores para salida en consola
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== INICIANDO CONFIGURACIÓN DE INFRAESTRUCTURA PARA COMERCIOTECH ===${NC}"

# 1. Detectar Sistema Operativo
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    echo -e "[INFO] Sistema operativo detectado: ${GREEN}$OS${NC}"
else
    echo -e "${RED}[ERROR] No se pudo detectar el sistema operativo. Saliendo...${NC}"
    exit 1
fi

# 2. Instalar Nginx y dependencias de Certbot según el SO
if [ "$OS" = "amzn" ] || [ "$OS" = "amazonlinux" ]; then
    echo -e "[INFO] Instalando dependencias en Amazon Linux 2023..."
    sudo dnf update -y
    sudo dnf install -y nginx python3 augeas-libs

    # Instalar Certbot en un entorno virtual aislado (Recomendación oficial para AL2023)
    echo -e "[INFO] Instalando Certbot vía Python venv en /opt/certbot..."
    sudo python3 -m venv /opt/certbot/
    sudo /opt/certbot/bin/pip install --upgrade pip
    sudo /opt/certbot/bin/pip install certbot certbot-nginx
    # Crear enlace simbólico
    if [ ! -f /usr/bin/certbot ]; then
        sudo ln -s /opt/certbot/bin/certbot /usr/bin/certbot
    fi

elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo -e "[INFO] Instalando dependencias en Ubuntu..."
    sudo apt update
    sudo apt install -y nginx certbot python3-certbot-nginx
    
    # Detener Apache si está activo para liberar el puerto 80
    if systemctl is-active --quiet apache2; then
        echo -e "[INFO] Apache (apache2) está activo en el puerto 80. Deteniendo y desactivando para dar espacio a Nginx..."
        sudo systemctl stop apache2
        sudo systemctl disable apache2
    fi
else
    echo -e "${RED}[ERROR] Sistema operativo no soportado por este script automatizado. Soporte solo para Amazon Linux y Ubuntu.${NC}"
    exit 1
fi

# 3. Configurar Nginx como Proxy Inverso
echo -e "[INFO] Configurando Nginx para comerciotech.qd.je..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NGINX_CONF_SOURCE="$SCRIPT_DIR/nginx_comerciotech.conf"

if [ ! -f "$NGINX_CONF_SOURCE" ]; then
    echo -e "${RED}[ERROR] No se encuentra el archivo $NGINX_CONF_SOURCE${NC}"
    exit 1
fi

if [ "$OS" = "amzn" ] || [ "$OS" = "amazonlinux" ]; then
    sudo cp "$NGINX_CONF_SOURCE" /etc/nginx/conf.d/comerciotech.conf
else
    # Configuración específica de rutas en Ubuntu
    sudo cp "$NGINX_CONF_SOURCE" /etc/nginx/sites-available/comerciotech.conf
    sudo ln -sf /etc/nginx/sites-available/comerciotech.conf /etc/nginx/sites-enabled/
    # Remover el sitio por defecto de Nginx si existe
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Validar y reiniciar Nginx
sudo nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[ÉXITO] Configuración de Nginx válida.${NC}"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    echo -e "${RED}[ERROR] La configuración de Nginx no es válida. Revisa los archivos copiados.${NC}"
    exit 1
fi

# 3.5 Crear Entorno Virtual e Instalar Dependencias si no existe
if [ ! -d "$REPO_DIR/venv" ]; then
    echo -e "[INFO] No se encontró el entorno virtual. Creándolo e instalando dependencias..."
    python3 -m venv "$REPO_DIR/venv"
    "$REPO_DIR/venv/bin/pip" install --upgrade pip
    "$REPO_DIR/venv/bin/pip" install -r "$REPO_DIR/requirements.txt"
fi

# 4. Configurar e iniciar el Servicio Systemd de la Aplicación Flask
echo -e "[INFO] Configurando el servicio de la aplicación (systemd)..."
SERVICE_SOURCE="$SCRIPT_DIR/comerciotech.service"

if [ ! -f "$SERVICE_SOURCE" ]; then
    echo -e "${RED}[ERROR] No se encuentra el archivo $SERVICE_SOURCE${NC}"
    exit 1
fi

# Obtener usuario propietario de la carpeta y la ruta absoluta del repositorio para reemplazar dinámicamente
REAL_USER=$(stat -c '%U' "$REPO_DIR")
echo -e "[INFO] Detectado usuario propietario del repositorio: ${GREEN}$REAL_USER${NC}"
echo -e "[INFO] Detectada ruta del repositorio: ${GREEN}$REPO_DIR${NC}"

# Copiar servicio a archivo temporal para modificarlo sin alterar el repositorio
TEMP_SERVICE=$(mktemp)
cp "$SERVICE_SOURCE" "$TEMP_SERVICE"

sed -i "s|User=ec2-user|User=$REAL_USER|g" "$TEMP_SERVICE"
sed -i "s|WorkingDirectory=/home/ec2-user/nohinohey|WorkingDirectory=$REPO_DIR|g" "$TEMP_SERVICE"
sed -i "s|ExecStart=/home/ec2-user/nohinohey/venv/bin/python src/app.py|ExecStart=$REPO_DIR/venv/bin/python src/app.py|g" "$TEMP_SERVICE"
sed -i "s|EnvironmentFile=/home/ec2-user/nohinohey/.env|EnvironmentFile=$REPO_DIR/.env|g" "$TEMP_SERVICE"

sudo cp "$TEMP_SERVICE" /etc/systemd/system/comerciotech.service
rm -f "$TEMP_SERVICE"

sudo systemctl daemon-reload
sudo systemctl restart comerciotech
sudo systemctl enable comerciotech

echo -e "${GREEN}[ÉXITO] Servicio systemd 'comerciotech' configurado e iniciado.${NC}"

# 5. Obtener e instalar certificado SSL usando Certbot
echo -e "[INFO] Iniciando el proceso de obtención de certificado SSL con Certbot..."
echo -e "${GREEN}Por favor, introduce tu correo electrónico y acepta los términos cuando se te solicite.${NC}"

# Ejecución interactiva de Certbot para permitir al estudiante ingresar su correo
sudo certbot --nginx -d comerciotech.qd.je

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=== CONFIGURACIÓN COMPLETADA CON ÉXITO ===${NC}"
    echo -e "Tu sitio seguro ya está listo en: ${GREEN}https://comerciotech.qd.je${NC}"
else
    echo -e "${RED}[ADVERTENCIA] Certbot no pudo completar el registro SSL.${NC}"
    echo -e "Asegúrate de que el DNS de 'comerciotech.qd.je' apunte correctamente a la IP pública de esta instancia."
fi

