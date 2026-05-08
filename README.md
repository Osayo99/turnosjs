# Descripcion del Sistema

Turnosjs es una aplicacion web de gestion de colas y atencion al cliente construida con Node.js, Express, MongoDB y Socket.IO.
Permite a multiples agencias operar de forma independiente con los siguientes modulos:

Kiosco de tickets: Los clientes seleccionan su tramite e imprimen su turno.
Monitor de sala: Pantalla TV que muestra la cola en tiempo real con voz sintetizada.
Ventanilla / Staff: Interfaz del ejecutivo para llamar, atender y finalizar tickets.
Jefatura: Panel de supervision en tiempo real, gestion de personal y auditorias.
Super Admin: Control global de agencias, usuarios y configuracion de exportacion.
Exportacion a Google Sheets: Los tickets finalizados se envian automaticamente a una hoja de calculo configurada por agencia.

<img width="1517" height="740" alt="image" src="https://github.com/user-attachments/assets/93cd2e55-1dac-4f8a-b473-45f827034650" />
<img width="1532" height="763" alt="image" src="https://github.com/user-attachments/assets/62433b85-6c1d-47d6-838f-ad2a6cb310bd" />
<img width="1517" height="782" alt="image" src="https://github.com/user-attachments/assets/7c7346b3-6890-41cf-8678-93956fbfe2e0" />
<img width="1522" height="790" alt="image" src="https://github.com/user-attachments/assets/18c2a2bc-c3ca-4e0e-a862-0a9837683131" />
<img width="1522" height="802" alt="image" src="https://github.com/user-attachments/assets/71dd6480-ab0b-43c5-a823-70a1a43ab985" />
<img width="1512" height="675" alt="image" src="https://github.com/user-attachments/assets/88548c44-496f-408e-b333-e43041265437" />


# Requisitos Previos
Antes de comenzar, asegurese de contar con lo siguiente:

* Un servidor con Ubuntu 22.04 LTS o superior.
* Acceso a la terminal con privilegios de sudo.
* El repositorio del proyecto disponible (Git o archivo comprimido).
* Una cuenta de Google para configurar Google Apps Script.

# Indice de Instalacion

1 - Actualizar el servidor
2 - Instalar Node.js
3 - Instalar MongoDB
4 - Clonar el repositorio e instalar dependencias del proyecto
5 - Configurar variables de entorno
6 - Crear el usuario Super Admin
7 - Configurar PM2 para ejecucion en produccion
9 - Configuracion de Google Sheets

# 1 - Actualizar el Servidor
Conectese al servidor via SSH y ejecute:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

# 2 - Instalar Node.js

```bash
curl -fsSL [https://deb.nodesource.com/setup_18.x](https://deb.nodesource.com/setup_18.x) | sudo -E bash -
sudo apt install -y nodejs
```

# 3 - Instalar MongoDB
Siga las instrucciones oficiales para instalar MongoDB en Ubuntu. Se recomienda seguir esta guia: https://www.datacamp.com/es/tutorial/install-mongodb-on-ubuntu
Una vez instalado, inicie el servicio:
No es necesario crear una base de datos, Mongoose la creara automaticamente.

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

# 4 - Clonar el Repositorio e Instalar Paquetes de Node
Elija la ubicacion donde se clonara el repositorio y ejecute los siguientes comandos.

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_DIRECTORIO>
sudo apt install npm
npm install
```

# 5 - Configurar Variables de Entorno
Cree un archivo .env en la raíz del proyecto:

```bash
nano .env
```

Agregue las siguientes lineas al archivo:
- development para pruebas sobre HTTP
- production para produccion solo HTTPS

```bash
PORT=3000
JWT_SECRET=clave_secreta_aqui
MONGO_URI=mongodb://127.0.0.1:27017/anda_turnos
NODE_ENV=development
```

# 6 - Crear el usuario Super Admin
Ejecute el script de creación del Super Administrador inicial desde la raiz del proyecto:

```bash
node crearAdmin.js
```
Esto creará un usuario administrador por defecto, asegurese de cambiar la clave una vez ingrese al sistema, y elimine o mueve al archivo crearAdmin.js a un lugar seguro fuera del proyecto:

Usuario: superanda
Clave: 123

# 7 - Ejecutar en Producción con PM2
Se recomienda usar PM2 para mantener la aplicación corriendo en segundo plano, esto se ejecuta en la raiz del proyecto:
```bash
sudo npm install -g pm2
pm2 start server.js --name "anda-turnos"
pm2 save
pm2 startup
```

# 8 - Integración con Google Sheets
El sistema permite exportar automáticamente los tickets finalizados a una hoja de cálculo de Google Sheets.

## 1. Preparar la Hoja de Cálculo
Cree una nueva hoja de cálculo en Google Sheets.
No es necesario agregar encabezados manualmente; el script lo hará la primera vez.

## 2. Configurar el Google Apps Script
Dentro de su hoja de cálculo, vaya a Extensiones > Apps Script.
<img width="812" height="410" alt="image" src="https://github.com/user-attachments/assets/56d45a21-490a-4425-bd4d-340e62510ffa" />

Copie y pegue el contenido íntegro del archivo googlesheets_script.gs incluido en este repositorio.
Haga clic en el icono del disco (Guardar) y asígnele un nombre (ej. Exportador ANDA).
<img width="1172" height="621" alt="image" src="https://github.com/user-attachments/assets/14c22cbb-1a77-4c6b-b371-d2b0391125bf" />


## 3. Desplegar como Aplicación Web
Haga clic en el botón azul Implementar > Nueva implementación.
<img width="576" height="387" alt="image" src="https://github.com/user-attachments/assets/e41c4216-0eef-44cc-8e18-8ec9262a92d8" />

Seleccione el tipo Aplicación web.
Ejecutar como: Yo (su correo).
Quién tiene acceso: Cualquier persona (esto es vital para que el servidor Node pueda enviar los datos sin login manual).
Haga clic en Implementar.

<img width="808" height="635" alt="image" src="https://github.com/user-attachments/assets/79224049-1d67-446a-8b6f-1d869fdb9139" />

Copie la URL de la aplicación web generada (termina en /exec).

## 4. Configurar en el Panel Admin
Inicie sesión en la aplicación como Super Admin (/admin.html).
En la lista de sucursales, haga clic en el icono de gráfico (📊).
<img width="835" height="382" alt="image" src="https://github.com/user-attachments/assets/12ade0a3-c9ab-4d88-abcc-4393c421bedb" />

Pegue la URL de Google Apps Script en el campo de Webhook.
Seleccione la frecuencia de exportación (ej. cada 5 minutos o cada hora).
<img width="552" height="395" alt="image" src="https://github.com/user-attachments/assets/abbd60d4-1220-4179-8ecf-81db49ee25e5" />

Guarde la configuración.
