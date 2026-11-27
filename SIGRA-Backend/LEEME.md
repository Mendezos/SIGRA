# SIGRA – Backend: cómo dejarlo funcionando en su computadora

## 1. Base de datos

Deja una base `SIGRA` igual a lo que define el repositorio (tablas, columnas, restricciones, procedimientos,
migraciones y datos de prueba). Se puede correr las veces que haga falta.

```bash
cd SIGRA-Backend/SIGRA.BD
node Sincronizar-BD.cjs --servidor "localhost\SQLEXPRESS" --base SIGRA --crear
```

- `--servidor`: su instancia de SQL Server (`localhost` si es la instancia por defecto).
- `--crear`: crea la base si no existe.
- `--sin-semillas`: no ejecuta los datos de prueba.
- Requiere Node.js y `sqlcmd`.

Cuentas de prueba (contraseña entre paréntesis):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@radifaxcr.com | Admin#2026 |
| Gerente | adriana.mora@radifaxcr.com | Gerencia#2026 |
| Coordinador técnico | maria.ceciliano@radifaxcr.com | Coord#2026 |
| Técnico | ricardo.infante@radifaxcr.com | RadifaxCR2026 |
| Vendedor | kimberly.sanchez@radifaxcr.com | Ventas#2026 |
| Recepcionista | recepcion@radifaxcr.com | Ventas#2026 |
| Técnico (segundo) | tomas.diaz@radifaxcr.com | RadifaxCR2026 |

### Datos de demostración (opcional)

Con la API corriendo, carga datos coherentes de los módulos de Inventario, Alquiler, Frecuencias y Tickets (equipos, contratos en
todos los estados, baterías, repuestos, repetidoras con ficha y checklist, solicitudes de frecuencia, boletas y garantías) y, con la
etapa `demo`, registros extra de CRM y facturación (vendedora, prospectos, cotizaciones y una encuesta con enlace conocido).
Se puede ejecutar varias veces sin duplicar nada.

```bash
cd SIGRA-Backend/SIGRA.BD
node Cargar-DatosDemo.cjs                  # todo
node Cargar-DatosDemo.cjs --solo tickets   # una etapa: inventario, contratos, baterias, repetidoras, contactos, frecuencias, tickets, stock, demo
```

Para preparar una presentación sin tocar su base de trabajo, `Preparar-Demo.cjs` recrea una base aparte (`SIGRA_demo`), la
sincroniza, levanta la API en el puerto 5044 y carga todos los datos. Conviene correrlo el día antes, porque varios estados
(contratos por vencer, seguimientos atrasados, recordatorios) dependen de la fecha de hoy.

```bash
node Preparar-Demo.cjs              # recrea SIGRA_demo y deja la API corriendo
node Preparar-Demo.cjs --iniciar    # vuelve a levantar la API sin recrear nada
node Preparar-Demo.cjs --detener    # detiene la API de la demostración
```

Usa las cuentas de prueba de esta guía. Las series de los datos de demostración empiezan con SN-61 (CP200), SN-62 (TK-3170),
SN-63 (TK-3401), SN-64 (móviles DGM4100) y SN-78 (repetidoras SLR 1000).

## 2. Conexión a SQL Server

El archivo `appsettings.json` trae la conexión a la instancia por defecto (`localhost`). Si su SQL Server usa
otra instancia (por ejemplo `localhost\SQLEXPRESS`), no edite los archivos del repositorio:

1. Copie `SIGRA.API/appsettings.Local.example.json` como `SIGRA.API/appsettings.Local.json`.
2. Ajuste la conexión dentro de ese archivo.

`appsettings.Local.json` está en `.gitignore`, así que cada integrante tiene el suyo y no se sube a Git.

## 3. Correr la API y las pruebas

```bash
cd SIGRA-Backend/SIGRA.API
dotnet run                      # http://localhost:5044
```

```bash
dotnet test SIGRA-Backend/SIGRA.Pruebas/SIGRA.Pruebas.csproj
dotnet test SIGRA-Backend/SIGRA.Tests/SIGRA.Tests.csproj
```

## 4. Permisos por rol

Cada módulo se protege con los permisos que el administrador define en *Usuarios y accesos > Roles y permisos*
(tabla `RolPermiso`): Lectura para consultar, Escritura para crear, Edición para modificar y Eliminación para borrar.
Los aplican con `[PermisoModulo(idModulo)]` y `[RolesPermitidos(...)]`, que comparan los roles sin importar mayúsculas ni tildes,
los controladores de estos módulos:

| Módulo | Id | Controladores |
|---|---|---|
| Usuarios y accesos | 1 | Cuentas, Rol, Modulo, PoliticaSeguridad |
| Alquiler | 3 | Alquiler |
| Inventario | 4 | Inventario |
| Dashboard y reportes | 5 | Dashboard |
| Contratos y facturación | 7 | PlantillasContrato, Encuestas |
| CRM | 9 | CrmProspectos, CrmClientes, CrmInteracciones, CrmSeguimientos, CrmRecordatorios, CrmCatalogos, CrmAuditoria |
| Frecuencias | 11 | Frecuencias |

El módulo de Tickets valida el mismo permiso dentro de su flujo. Facturas, notas de crédito y cotizaciones, por ahora, solo exigen
una sesión iniciada (la política general de la API), sin revisar el permiso del módulo. Si el administrador cambia un permiso en *Roles y permisos*, se aplica en la
siguiente petición, sin volver a iniciar sesión; los botones de cada pantalla también se ocultan según ese permiso.

## 5. Fechas en hora de Costa Rica

El servidor de Azure trabaja en hora UTC, así que "hoy" puede cambiar de día antes que en Costa Rica. Para comparar con la
fecha de hoy use `FechaCostaRica` (en `SIGRA.Abstracciones/Utilidades`) en C# y `dbo.fn_HoyCR()` en SQL, nunca
`DateTime.Today`, `DateTime.Now` ni `GETDATE()` directamente.

## 6. Publicación

El sistema está publicado en Azure (API en App Service, base en Azure SQL y frontend en Static Web Apps, que se vuelve a
publicar solo con el flujo de GitHub Actions). Los pasos y variables de entorno están en `PUBLICACION-AZURE.md`, en la raíz del
repositorio.
