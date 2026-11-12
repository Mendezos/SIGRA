# Publicación de SIGRA en Azure

Guía corta para publicar la rama `main`. El sistema tiene tres piezas: la base de datos (SQL Server), la API (.NET 8) y el frontend (React con Vite).

## 1. Base de datos (Azure SQL)
1. En el portal de Azure cree un servidor y una base de datos SQL llamada `SIGRA`. Permita el acceso de su equipo en el firewall del servidor.
2. Desde su computadora, en `SIGRA-Backend/SIGRA.BD` (necesita Node y `sqlcmd`):

```bash
node Sincronizar-BD.cjs --servidor TUSERVIDOR.database.windows.net --base SIGRA --usuario USUARIO --password CLAVE
```

   - Crea todas las tablas, vistas, procedimientos y los datos iniciales (roles, módulos, cuentas base). Se puede repetir sin problema.
   - Sin `--usuario` usa la autenticación de Windows (solo para SQL Server local).
   - También carga los datos de ejemplo del Sprint 3 (prospectos, facturas, etc.). Si no los quiere en producción, avise para separarlos.

## 2. API (App Service con .NET 8)
Publicar el proyecto `SIGRA-Backend/SIGRA.API`. Configuración en **Configuración > Variables de entorno** (el doble guion bajo reemplaza los dos puntos):

| Variable | Valor |
|---|---|
| `ConnectionStrings__SIGRA` | cadena de conexión de Azure SQL (`Server=tcp:TUSERVIDOR.database.windows.net,1433;Database=SIGRA;User ID=...;Password=...;Encrypt=True;`) |
| `Jwt__Secreto` | una llave aleatoria de al menos 32 caracteres (no dejar la de ejemplo) |
| `Cors__Origenes__0` | la dirección pública del frontend, por ejemplo `https://sigra-xxxx.azurestaticapps.net` |
| `Frontend__BaseUrl` | la misma dirección del frontend (la usan los enlaces de correos) |
| `Encuestas__UrlBase` | la misma dirección del frontend |
| `SendGrid__Activado` | `false` mientras no exista la clave de SendGrid (los correos no se envían, el sistema sigue funcionando) |
| `SendGrid__ApiKey` y `SendGrid__FromEmail` | solo cuando se active el envío de correos |

La API escucha en `/api`. Verifique con `https://TUAPI.azurewebsites.net/api/ping` (responde 401, es normal: significa que está viva).

## 3. Frontend (Static Web Apps o cualquier hosting estático)
```bash
cd SIGRA-Prototipo
# Windows PowerShell:  $env:VITE_API_URL="https://TUAPI.azurewebsites.net/api"
VITE_API_URL=https://TUAPI.azurewebsites.net/api npm run build
```
Publicar la carpeta `dist`. Importante: configurar que cualquier ruta devuelva `index.html` (en Static Web Apps, un `staticwebapp.config.json` con `navigationFallback` a `/index.html`), porque el enlace público de las encuestas es `/encuestas/responder/<token>`.

## 4. Primer ingreso
Las cuentas base y sus contraseñas iniciales están en el Excel de verificación. **Cambie las contraseñas** de las cuentas que se vayan a usar en público (Administración > Cuentas).

## Notas
- Los PDF firmados de los contratos se guardan en la base de datos (no necesita almacenamiento aparte; máximo 10 MB cada uno).
- Los servicios en segundo plano (contratos por vencer, recordatorios del CRM) corren dentro de la API: el App Service debe tener **Always On** activado para que sigan trabajando.
- Para probar localmente con datos de demostración existe `SIGRA-Backend/SIGRA.BD/Preparar-Demo.cjs`.
