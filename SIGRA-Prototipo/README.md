# SIGRA – Frontend

Interfaz web del Sistema Integral de Gestión Radifax, hecha con React 19, Vite, Tailwind CSS y recharts (gráficos).

## Correrlo en su computadora

Necesita Node.js y la API corriendo (vea `SIGRA-Backend/LEEME.md`).

```bash
cd SIGRA-Prototipo
npm install
npm run dev      # http://localhost:5173
npm run lint     # revisión del código
npm run build    # versión para publicar, en la carpeta dist
```

La dirección de la API se toma de `VITE_API_URL`: `.env` apunta a la API local (`http://localhost:5044/api`) y
`.env.production` a la API publicada en Azure. Para publicar vea `PUBLICACION-AZURE.md` en la raíz del repositorio.

## Organización

| Carpeta | Contenido |
|---|---|
| `src/pages` | Pantallas de entrada: inicio de sesión, panel principal, restablecer contraseña y responder encuesta (pública) |
| `src/components` | Una carpeta por módulo (`inventario`, `alquiler`, `frecuencias`, `tickets`, `contratos`, `crm`, `dashboard`, `inicio`) y los componentes compartidos (`DataTable`, `Modal`, `RecordForm`, `ui.jsx`) |
| `src/components/charts` | Piezas de gráficos compartidas (`Tablero.jsx`: tarjeta con vista de tabla, indicador con comparación, evolución, barras apiladas, composición y medidor) y la paleta validada (`paleta.js`) que usan todos los gráficos |
| `src/services` | Un servicio por recurso de la API, todos sobre `apiClient.js` (agrega el token y maneja los errores) |

Los botones y pestañas se muestran según los permisos del rol que define el administrador en *Roles y permisos*.
