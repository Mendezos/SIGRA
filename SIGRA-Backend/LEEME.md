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
Los controladores de Inventario y Alquiler ya los aplican (`[PermisoModulo(idModulo)]` y `[RolesPermitidos(...)]`,
que comparan los roles sin importar mayúsculas ni tildes).
