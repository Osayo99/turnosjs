# Descripcion del Sistema

Turnosjs es una aplicacion web de gestion de colas y atencion al cliente construida con Node.js, Express, MongoDB y Socket.IO.
Permite a multiples agencias operar de forma independiente con los siguientes modulos:

Kiosco de tickets: Los clientes seleccionan su tramite e imprimen su turno.
Monitor de sala: Pantalla TV que muestra la cola en tiempo real con voz sintetizada.
Ventanilla / Staff: Interfaz del ejecutivo para llamar, atender y finalizar tickets.
Jefatura: Panel de supervision en tiempo real, gestion de personal y auditorias.
Super Admin: Control global de agencias, usuarios y configuracion de exportacion.
Exportacion a Google Sheets: Los tickets finalizados se envian automaticamente a una hoja de calculo configurada por agencia.


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
4 - Instalar Git y clonar el repositorio
5 - Instalar dependencias del proyecto
6 - Configurar variables de entorno
7 - Crear el usuario Super Admin
8 - Configurar PM2 para ejecucion en produccion
9 - Configurar Nginx como proxy inverso (opcional pero recomendado)
10 - Configuracion de Google Sheets

# 1 - Actualizar el Servidor
Conectese al servidor via SSH y ejecute:

```bash
bashsudo apt update && sudo apt upgrade -y

