# Backend del Sistema de Gestión de Inventario

Este proyecto corresponde al backend del sistema de inventario desarrollado para el Trabajo Práctico de Investigación Operativa 2025. Está construido con Node.js, Express y Prisma ORM, y utiliza una base de datos PostgreSQL.

---

## 🚀 Requisitos Previos

Antes de comenzar, asegurate de tener instalado:

- [Node.js](https://nodejs.org/) versión 16 o superior
- [PostgreSQL](https://www.postgresql.org/) versión 13 o superior
- npm versión 8 o superior

---

## 🛠️ Configuración de la base de datos

1. Instalar PostgreSQL en tu sistema.

2. Crear una base de datos llamada:

```sql
CREATE DATABASE inventario;
```
## 📦 Instalación del proyecto
Cloná el repositorio o descargalo:

```bash
git clone https://github.com/TuteSeta/FullStockBack.git
cd FullStockBack
```
Instalá las dependencias:
```bash
npm install
```

Configurá el archivo .env con la URL de conexión a tu base de datos:

```bash
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/inventario"
```
Reemplazá usuario y contraseña por los datos reales de tu entorno.

Generá los estados iniciales requeridos para las órdenes de compra:

```bash
node src/seedEstadosOrden.js
```

## ▶️ Ejecución del servidor
Para iniciar el entorno de desarrollo:

```bash
node src/server.js
```

El backend estará disponible en: http://localhost:3001

## 📁 Endpoints disponibles
El backend expone una API REST con las siguientes rutas principales:

/api/articulos

/api/proveedores

/api/proveedor-articulos

/api/ordenes

/api/ordenes-detalle

/api/ventas

/api/venta-detalle

🛠️ Tecnologías utilizadas

Express.js

Prisma ORM

PostgreSQL

Zod (validación de datos)