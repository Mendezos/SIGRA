
﻿// Datos y esquemas de los módulos funcionales del Sistema Integral de Gestión Radifax.

// Los datos son de ejemplo ("quemados"), tal y como se acordó con el docente: este curso
// cubre análisis y modelado de requerimientos, no la implementación final con backend real.
// Cada módulo referencia las historias de usuario del documento AN01 (código entre paréntesis).


export const CLIENTS = [
    "Hotel Los Sueños",
    "ICT",
    "Bomberos de Costa Rica",
    "Marina Pez Vela",
    "Refinadora Costarricense",
    "Autobuses San José",
    "Condominios Trejos Montealegre",
    "Cooperativa de Taxis Alajuela",
];

export const INVENTORY_LOCATIONS = [
    "Bodega San José",
    "Taller Radifax",
    "Hotel Los Sueños",
    "Bomberos de Costa Rica",
    "ICT",
    "Marina Pez Vela",
    "Autobuses San José",
    "Refinadora Costarricense",
];

export const EQUIPMENT_MODELS = [
    { modelo: "Motorola CP200", tipo: "Radio portátil" },
    { modelo: "Kenwood TK-3170", tipo: "Radio portátil" },
    { modelo: "Kenwood TK-3401", tipo: "Radio portátil" },
    { modelo: "Repetidora UHF-40", tipo: "Repetidora" },
];

export const ROLES = ["Administrador del sistema", "Gerente", "Coordinador técnico", "Técnico", "Vendedor / Ejecutivo de cuenta"];

export const MODULES = [
    {
        id: "usuarios",
        label: "Usuarios y accesos",
        subtitle: "Cuentas, roles y permisos internos (GUA-001 a GUA-018)",
        metrics: [
            { label: "Usuarios activos", value: "11" },
            { label: "Roles definidos", value: "5" },
            { label: "Sesiones hoy", value: "7" },
        ],

        metricsRoles: ["Administrador del sistema", "Gerente"],

        tabs: [
            {
                key: "cuentas",
                label: "Cuentas",
                columns: [
                    { key: "nombre", label: "Nombre" },
                    { key: "rol", label: "Rol" },
                    { key: "correo", label: "Correo" },
                    { key: "estado", label: "Estado" },
                ],
                fields: [
                    { key: "nombre", label: "Nombre completo", type: "text", required: true },
                    { key: "correo", label: "Correo corporativo", type: "email", required: true },
                    { key: "telefono", label: "Teléfono", type: "tel" },
                    {
                        key: "rol",
                        label: "Rol",
                        type: "select",
                        options: ["Administrador del sistema", "Gerente", "Coordinador técnico", "Técnico", "Vendedor / Ejecutivo de cuenta"],
                    },
                    { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
                ],
                seed: [
                    { id: "USR-001", nombre: "Ricardo Infante", rol: "Técnico", correo: "ricardo.infante@radifaxcr.com", telefono: "8842-1167", estado: "Activo" },
                    { id: "USR-002", nombre: "Kimberly Sánchez", rol: "Vendedor / Ejecutivo de cuenta", correo: "kimberly.sanchez@radifaxcr.com", telefono: "8811-2290", estado: "Activo" },
                    { id: "USR-003", nombre: "María Fernanda Ceciliano", rol: "Coordinador técnico", correo: "mariafernanda.ceciliano@radifaxcr.com", telefono: "8712-4456", estado: "Activo" },
                    { id: "USR-004", nombre: "Tomás Díaz", rol: "Técnico", correo: "tomas.diaz@radifaxcr.com", telefono: "8734-9021", estado: "Activo" },
                    { id: "USR-005", nombre: "Henry Ortiz", rol: "Vendedor / Ejecutivo de cuenta", correo: "henry.ortiz@radifaxcr.com", telefono: "8899-3312", estado: "Inactivo" },
                    { id: "USR-006", nombre: "Adriana Mora Quirós", rol: "Gerente", correo: "adriana.mora@radifaxcr.com", telefono: "2232-7832", estado: "Activo" },
                ],
            },
            {
                key: "roles",
                label: "Roles y permisos",
                columns: [
                    { key: "id", label: "Rol" },
                    { key: "usuarios", label: "Usuarios" },
                    { key: "permisos", label: "Permisos" },
                    { key: "estado", label: "Estado" },
                ],
                fields: [
                    { key: "id", label: "Nombre del rol", type: "text", required: true },
                    { key: "descripcion", label: "Descripción", type: "textarea" },
                    { key: "permisos", label: "Permisos autorizados", type: "textarea" },
                    { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
                ],
                seed: [
                    { id: "Administrador del sistema", descripcion: "Acceso total a todos los módulos y configuración.", usuarios: "2", permisos: "Usuarios: crear/editar/desactivar · Roles: definir permisos · Auditoría: consultar", estado: "Activo" },
                    { id: "Gerente", descripcion: "Visualiza reportes y aprueba operaciones críticas.", usuarios: "1", permisos: "Dashboard: ver · Reportes: exportar · Contratos: aprobar", estado: "Activo" },
                    { id: "Coordinador técnico", descripcion: "Asigna boletas y giras, supervisa técnicos.", usuarios: "1", permisos: "Tickets: asignar/cerrar · Giras: crear/cerrar · Dashboard técnico: ver", estado: "Activo" },
                    { id: "Técnico", descripcion: "Ejecuta mantenimientos y reparaciones en campo.", usuarios: "2", permisos: "Tickets: ver asignados/cerrar · Inventario: consultar · Giras: ejecutar", estado: "Activo" },
                    { id: "Vendedor / Ejecutivo de cuenta", descripcion: "Gestiona prospectos, cotizaciones y contratos.", usuarios: "2", permisos: "CRM: gestionar · Contratos: crear · Frecuencias: solicitar", estado: "Activo" },
                ],
            },
        ],
    },
    {
        id: "tickets",
        label: "Tickets de servicio técnico",
        subtitle: "Boletas de mantenimiento y reparación (GTST-001 a GTST-022)",
        metrics: [
            { label: "Boletas abiertas", value: "14" },
            { label: "En taller", value: "6" },
            { label: "Cerradas este mes", value: "52" },
        ],
        columns: [
            { key: "id", label: "Boleta" },
            { key: "cliente", label: "Cliente" },
            { key: "tecnico", label: "Técnico" },
            { key: "tipoServicio", label: "Tipo de servicio" },
            { key: "estado", label: "Estado" },
        ],
        fields: [
            { key: "cliente", label: "Cliente", type: "text", required: true },
            { key: "equipo", label: "Equipo / número de serie", type: "text" },
            { key: "tipoServicio", label: "Tipo de servicio", type: "select", options: ["Mantenimiento preventivo", "Reparación", "Revisión general", "Garantía"] },
            { key: "tecnico", label: "Técnico asignado", type: "select", options: ["Ricardo Infante", "Tomás Díaz", "Sin asignar"] },
            { key: "fechaIngreso", label: "Fecha de ingreso", type: "date" },
            { key: "estado", label: "Estado", type: "select", options: ["Recibida", "Asignada", "En proceso", "En espera de repuesto", "Cerrada"] },
            { key: "hallazgos", label: "Hallazgos / notas técnicas", type: "textarea" },
        ],
        seed: [
            { id: "BOL-00187", cliente: "Hotel Los Sueños", equipo: "SN-88214", tipoServicio: "Reparación", tecnico: "Ricardo Infante", fechaIngreso: "2026-07-18", estado: "En proceso", hallazgos: "Batería no retiene carga, pendiente repuesto." },
            { id: "BOL-00186", cliente: "ICT", equipo: "SN-77002", tipoServicio: "Mantenimiento preventivo", tecnico: "Tomás Díaz", fechaIngreso: "2026-07-10", estado: "Cerrada", hallazgos: "Limpieza general, sin hallazgos relevantes." },
            { id: "BOL-00185", cliente: "Bomberos de Costa Rica", equipo: "SN-88213", tipoServicio: "Revisión general", tecnico: "Ricardo Infante", fechaIngreso: "2026-07-22", estado: "Asignada", hallazgos: "" },
            { id: "BOL-00184", cliente: "Marina Pez Vela", equipo: "SN-90011", tipoServicio: "Reparación", tecnico: "Sin asignar", fechaIngreso: "2026-07-23", estado: "Recibida", hallazgos: "" },
            { id: "BOL-00183", cliente: "Refinadora Costarricense", equipo: "SN-90020", tipoServicio: "Reparación", tecnico: "Tomás Díaz", fechaIngreso: "2026-07-15", estado: "En espera de repuesto", hallazgos: "Requiere placa de RF importada." },
            { id: "BOL-00182", cliente: "Autobuses San José", equipo: "SN-90032", tipoServicio: "Garantía", tecnico: "Ricardo Infante", fechaIngreso: "2026-07-05", estado: "Cerrada", hallazgos: "Reemplazo bajo garantía de fábrica." },
        ],
    },
    {
        id: "alquiler",
        label: "Alquiler de radios y repetidoras",
        subtitle: "Contratos de alquiler y control de baterías (CARR-001 a CARR-015)",
        metrics: [
            { label: "Contratos activos", value: "38" },
            { label: "Por vencer (30 días)", value: "5" },
            { label: "Baterías por cambiar", value: "9" },
        ],
        columns: [
            { key: "id", label: "Contrato" },
            { key: "cliente", label: "Cliente" },
            { key: "equipos", label: "Equipos" },
            { key: "vence", label: "Vence" },
            { key: "estado", label: "Estado" },
        ],
        fields: [
            { key: "cliente", label: "Cliente", type: "text", required: true },

            { key: "equipos", label: "Equipos incluidos", type: "equipment" },

            { key: "fechaInicio", label: "Fecha de inicio", type: "date" },
            { key: "vence", label: "Fecha de vencimiento", type: "date" },
            { key: "estado", label: "Estado", type: "select", options: ["Activo", "Por vencer", "Vencido", "Cancelado"] },
        ],
        seed: [
            { id: "CT-0042", cliente: "Hotel Los Sueños", equipos: "12 radios", fechaInicio: "2025-09-15", vence: "2026-09-15", estado: "Activo" },
            { id: "CT-0041", cliente: "Bomberos de Costa Rica", equipos: "3 repetidoras", fechaInicio: "2025-08-02", vence: "2026-08-02", estado: "Por vencer" },
            { id: "CT-0039", cliente: "ICT", equipos: "8 radios", fechaInicio: "2025-11-30", vence: "2026-11-30", estado: "Activo" },
            { id: "CT-0038", cliente: "Marina Pez Vela", equipos: "6 radios, 1 repetidora", fechaInicio: "2025-06-10", vence: "2026-06-10", estado: "Vencido" },
            { id: "CT-0037", cliente: "Refinadora Costarricense", equipos: "20 radios", fechaInicio: "2025-05-01", vence: "2027-05-01", estado: "Activo" },
        ],
    },
    {
        id: "inventario",
        label: "Inventario de equipos",
        subtitle: "Catálogo de radios, repetidoras y accesorios (INVE-001 a INVE-011)",
        metrics: [
            { label: "Equipos totales", value: "214" },
            { label: "Disponibles", value: "61" },
            { label: "En taller", value: "6" },
        ],
        columns: [
            { key: "id", label: "Serie" },
            { key: "modelo", label: "Modelo" },
            { key: "categoria", label: "Categoría" },
            { key: "estado", label: "Estado" },
        ],
        fields: [

            { key: "serie", label: "Número de serie", type: "text", required: true },
            { key: "modelo", label: "Modelo", type: "text", required: true },
            { key: "categoria", label: "Categoría", type: "select", options: ["Radio portátil", "Repetidora", "Accesorio"] },
            { key: "estado", label: "Estado", type: "select", options: ["Disponible", "Alquilado", "En mantenimiento", "Dado de baja"] },
            { key: "ubicacion", label: "Ubicación actual", type: "select", options: INVENTORY_LOCATIONS },

        ],
        seed: [
            { id: "SN-88213", modelo: "Motorola CP200", categoria: "Radio portátil", estado: "Disponible", ubicacion: "Bodega San José" },
            { id: "SN-88214", modelo: "Kenwood TK-3170", categoria: "Radio portátil", estado: "Alquilado", ubicacion: "Hotel Los Sueños" },
            { id: "SN-77002", modelo: "Repetidora UHF-40", categoria: "Repetidora", estado: "En mantenimiento", ubicacion: "Taller Radifax" },
            { id: "SN-90011", modelo: "Motorola CP200", categoria: "Radio portátil", estado: "En mantenimiento", ubicacion: "Taller Radifax" },
            { id: "SN-90032", modelo: "Kenwood TK-3401", categoria: "Radio portátil", estado: "Alquilado", ubicacion: "Autobuses San José" },
            { id: "AC-00541", modelo: "Batería Li-Ion KNB-45", categoria: "Accesorio", estado: "Disponible", ubicacion: "Bodega San José" },
        ],
    },
    {
        id: "dashboard",
        label: "Dashboard y reportes",

        subtitle: "Mis informes y paneles — indicadores y reportes según tu rol (DAR-001 a DAR-011)",

        metrics: [
            { label: "Ingresos del mes", value: "₡4.2M" },
            { label: "Alertas activas", value: "12" },
            { label: "Tickets abiertos", value: "14" },
        ],

        metricsRoles: ["Administrador del sistema", "Gerente", "Coordinador técnico"],
        allowCreate: false,

        columns: [
            { key: "id", label: "Reporte" },
            { key: "periodo", label: "Período" },
            { key: "formato", label: "Formato" },
            { key: "estado", label: "Estado" },
        ],
        fields: [
            { key: "tipo", label: "Tipo de reporte", type: "select", options: ["Contratos por vencer", "Servicios facturados", "Bitácora de tickets", "Valorización de inventario", "Frecuencias próximas a vencer"] },
            { key: "periodo", label: "Período", type: "text" },
            { key: "formato", label: "Formato", type: "select", options: ["PDF", "Excel"] },

            { key: "estado", label: "Estado", type: "select", options: ["Generado", "Compartido"] },
        ],
        seed: [
            { id: "Contratos por vencer", periodo: "Julio 2026", formato: "PDF", estado: "Generado", rolesVisibles: ["Gerente", "Administrador del sistema", "Vendedor / Ejecutivo de cuenta"] },
            { id: "Servicios facturados", periodo: "Julio 2026", formato: "Excel", estado: "Compartido", rolesVisibles: ["Gerente", "Administrador del sistema"] },
            { id: "Bitácora de tickets", periodo: "Junio 2026", formato: "PDF", estado: "Generado", rolesVisibles: ["Coordinador técnico", "Administrador del sistema", "Técnico"] },
            { id: "Valorización de inventario", periodo: "Q2 2026", formato: "Excel", estado: "Generado", rolesVisibles: ["Gerente", "Administrador del sistema"] },
            { id: "Frecuencias próximas a vencer", periodo: "Agosto 2026", formato: "PDF", estado: "Compartido", rolesVisibles: ["Vendedor / Ejecutivo de cuenta", "Administrador del sistema"] },

        ],
    },
    {
        id: "ia",
        label: "Agente de inteligencia artificial",

        subtitle: "Historial y control del asistente — solo Administrador del sistema (AIA-001 a AIA-011)",
        adminOnly: true,

        metrics: [
            { label: "Consultas hoy", value: "23" },
            { label: "Resueltas automáticamente", value: "19" },
            { label: "Escaladas", value: "4" },
        ],
        columns: [
            { key: "id", label: "Consulta" },
            { key: "usuario", label: "Usuario" },
            { key: "tipo", label: "Tipo" },
            { key: "estado", label: "Resultado" },
        ],
        fields: [
            { key: "id", label: "Consulta", type: "text", required: true },
            { key: "usuario", label: "Usuario", type: "text" },
            { key: "tipo", label: "Tipo", type: "select", options: ["Consulta en lenguaje natural", "Clasificación de ticket", "Resumen automático", "Alerta de anomalía"] },
            { key: "estado", label: "Resultado", type: "select", options: ["Resuelto", "Escalado", "Pendiente"] },
        ],
        seed: [
            { id: "Contratos que vencen este mes", usuario: "Kimberly Sánchez", tipo: "Consulta en lenguaje natural", estado: "Resuelto" },
            { id: "Resumen de boleta BOL-00187", usuario: "Ricardo Infante", tipo: "Resumen automático", estado: "Resuelto" },
            { id: "Clasificación de ticket nuevo BOL-00184", usuario: "Sistema", tipo: "Clasificación de ticket", estado: "Escalado" },
            { id: "Cliente con 3 fallas repetidas en el mes", usuario: "Sistema", tipo: "Alerta de anomalía", estado: "Pendiente" },
            { id: "Reporte de facturación del trimestre", usuario: "Adriana Mora Quirós", tipo: "Consulta en lenguaje natural", estado: "Resuelto" },
        ],
    },
    {
        id: "contratos",
        label: "Contratos y facturación",
        subtitle: "Plantillas, contratos, facturas y notas de crédito (GCFS-001 a GCFS-019)",
        metrics: [
            { label: "Facturado este mes", value: "₡3.1M" },
            { label: "En garantía", value: "3" },
            { label: "Pagos pendientes", value: "2" },
        ],

        metricsRoles: ["Administrador del sistema", "Gerente", "Vendedor / Ejecutivo de cuenta"],

        tabs: [
            {
                key: "facturas",
                label: "Facturas",
                columns: [
                    { key: "id", label: "Factura" },
                    { key: "cliente", label: "Cliente" },
                    { key: "monto", label: "Monto" },
                    { key: "estado", label: "Estado" },
                ],
                fields: [
                    { key: "cliente", label: "Cliente", type: "text", required: true },
                    { key: "concepto", label: "Concepto", type: "select", options: ["Venta de equipo", "Servicio técnico", "Alquiler"] },
                    { key: "monto", label: "Monto (₡)", type: "text" },
                    { key: "fecha", label: "Fecha de emisión", type: "date" },
                    { key: "estado", label: "Estado de cobro", type: "select", options: ["Cobrada", "Pendiente", "Vencida", "Anulada"] },
                ],
                seed: [
                    { id: "FA-01188", cliente: "Hotel Los Sueños", concepto: "Alquiler", monto: "₡185,000", fecha: "2026-07-05", estado: "Cobrada" },
                    { id: "FA-01187", cliente: "ICT", concepto: "Servicio técnico", monto: "₡92,500", fecha: "2026-07-12", estado: "Pendiente" },
                    { id: "FA-01186", cliente: "Bomberos de Costa Rica", concepto: "Venta de equipo", monto: "₡410,000", fecha: "2026-07-01", estado: "Cobrada" },
                    { id: "FA-01185", cliente: "Marina Pez Vela", concepto: "Alquiler", monto: "₡64,000", fecha: "2026-06-20", estado: "Vencida" },
                    { id: "FA-01184", cliente: "Refinadora Costarricense", concepto: "Servicio técnico", monto: "₡38,000", fecha: "2026-06-15", estado: "Cobrada" },
                ],
            },
            {
                key: "notasCredito",
                label: "Notas de crédito",
                columns: [
                    { key: "id", label: "Nota de crédito" },
                    { key: "factura", label: "Factura asociada" },
                    { key: "cliente", label: "Cliente" },
                    { key: "monto", label: "Monto" },
                    { key: "estado", label: "Estado" },
                ],
                fields: [
                    { key: "factura", label: "Factura asociada", type: "text", required: true },
                    { key: "cliente", label: "Cliente", type: "text" },
                    { key: "motivo", label: "Motivo", type: "textarea" },
                    { key: "monto", label: "Monto (₡)", type: "text" },
                    { key: "estado", label: "Estado", type: "select", options: ["Aplicada", "Pendiente", "Anulada"] },
                ],
                seed: [
                    { id: "NC-0032", factura: "FA-01185", cliente: "Marina Pez Vela", motivo: "Ajuste por días no utilizados del alquiler.", monto: "₡12,000", estado: "Aplicada" },
                    { id: "NC-0031", factura: "FA-01182", cliente: "ICT", motivo: "Corrección de monto facturado por error de digitación.", monto: "₡5,500", estado: "Pendiente" },
                ],
            },
            {
                key: "plantillas",
                label: "Plantillas de contrato",
                columns: [
                    { key: "id", label: "Plantilla" },
                    { key: "tipo", label: "Tipo" },
                    { key: "actualizada", label: "Última actualización" },
                    { key: "estado", label: "Estado" },
                ],
                fields: [
                    { key: "id", label: "Nombre de la plantilla", type: "text", required: true },
                    { key: "tipo", label: "Tipo de alquiler", type: "select", options: ["Radios portátiles", "Repetidoras", "Mixto"] },
                    { key: "actualizada", label: "Última actualización", type: "date" },
                    { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
                ],
                seed: [
                    { id: "Plantilla estándar - Radios", tipo: "Radios portátiles", actualizada: "2026-03-10", estado: "Activo" },
                    { id: "Plantilla estándar - Repetidoras", tipo: "Repetidoras", actualizada: "2026-02-18", estado: "Activo" },
                    { id: "Plantilla corporativa mixta", tipo: "Mixto", actualizada: "2025-11-05", estado: "Inactivo" },
                ],
            },
        ],
    },
    {
        id: "giras",
        label: "Giras y planificación de rutas",
        subtitle: "Planificación de visitas de mantenimiento y ventas (GGPR-001 a GGPR-017)",
        metrics: [
            { label: "Giras este mes", value: "9" },
            { label: "En curso", value: "1" },
            { label: "Boletas generadas", value: "27" },
        ],
        columns: [
            { key: "id", label: "Gira" },
            { key: "tecnico", label: "Técnico" },
            { key: "clientes", label: "Clientes" },

            { key: "vehiculo", label: "Vehículo" },
            { key: "costoEstimado", label: "Costo estimado" },

            { key: "estado", label: "Estado" },
        ],
        fields: [
            { key: "tecnico", label: "Técnico asignado", type: "select", options: ["Ricardo Infante", "Tomás Díaz"] },

            { key: "clientes", label: "Clientes a visitar", type: "multiselect", options: CLIENTS },
            { key: "fecha", label: "Fecha programada", type: "date" },
            { key: "vehiculo", label: "Vehículo asignado (placa)", type: "text" },
            { key: "costoEstimado", label: "Costo aproximado de la gira (₡)", type: "text" },

            { key: "tipo", label: "Tipo de gira", type: "select", options: ["Regular", "Express"] },
            { key: "estado", label: "Estado", type: "select", options: ["Programada", "En proceso", "Cerrada", "Cancelada"] },
        ],
        seed: [

            { id: "GIR-014", tecnico: "Tomás Díaz", clientes: "Hotel Los Sueños, ICT, Bomberos de Costa Rica, Marina Pez Vela", vehiculo: "SJB-4521", costoEstimado: "₡38,500", fecha: "2026-07-27", tipo: "Regular", estado: "En proceso" },
            { id: "GIR-013", tecnico: "Ricardo Infante", clientes: "Refinadora Costarricense, Autobuses San José, Condominios Trejos Montealegre", vehiculo: "CL-118732", costoEstimado: "₡22,000", fecha: "2026-07-20", tipo: "Regular", estado: "Cerrada" },
            { id: "GIR-012", tecnico: "Tomás Díaz", clientes: "Hotel Los Sueños, ICT, Bomberos de Costa Rica, Marina Pez Vela, Cooperativa de Taxis Alajuela", vehiculo: "SJB-4521", costoEstimado: "₡41,200", fecha: "2026-07-13", tipo: "Regular", estado: "Cerrada" },
            { id: "GIR-011", tecnico: "Ricardo Infante", clientes: "Bomberos de Costa Rica", vehiculo: "CL-118732", costoEstimado: "₡9,800", fecha: "2026-07-10", tipo: "Express", estado: "Cerrada" },
            { id: "GIR-010", tecnico: "Tomás Díaz", clientes: "Marina Pez Vela, Refinadora Costarricense", vehiculo: "SJB-4521", costoEstimado: "₡17,300", fecha: "2026-08-03", tipo: "Regular", estado: "Programada" },

        ],
    },
    {
        id: "crm",
        label: "CRM y prospectos",
        subtitle: "Prospectos, cotizaciones y seguimiento comercial (CRMGPSC-001 a CRMGPSC-026)",
        metrics: [
            { label: "Prospectos activos", value: "17" },
            { label: "Cotizaciones en curso", value: "6" },
            { label: "Convertidos este mes", value: "3" },
        ],
        columns: [
            { key: "id", label: "Prospecto" },
            { key: "vendedor", label: "Vendedor" },
            { key: "estado", label: "Estado" },
            { key: "proximoSeguimiento", label: "Próximo seguimiento" },
        ],
        fields: [
            { key: "id", label: "Nombre del prospecto", type: "text", required: true },
            { key: "vendedor", label: "Vendedor asignado", type: "select", options: ["Kimberly Sánchez", "Henry Ortiz", "Alejandro Arias"] },
            { key: "estado", label: "Estado", type: "select", options: ["Nuevo", "Cotización enviada", "En negociación", "Convertido", "Descartado"] },
            { key: "proximoSeguimiento", label: "Próximo seguimiento", type: "date" },
        ],
        seed: [
            { id: "Marina Pez Vela", vendedor: "Kimberly Sánchez", estado: "Cotización enviada", proximoSeguimiento: "2026-08-01" },
            { id: "Refinadora Costarricense", vendedor: "Henry Ortiz", estado: "En negociación", proximoSeguimiento: "2026-07-30" },
            { id: "Autobuses San José", vendedor: "Alejandro Arias", estado: "Nuevo", proximoSeguimiento: "2026-07-29" },
            { id: "Condominios Trejos Montealegre", vendedor: "Kimberly Sánchez", estado: "Convertido", proximoSeguimiento: "—" },
            { id: "Cooperativa de Taxis Alajuela", vendedor: "Henry Ortiz", estado: "Descartado", proximoSeguimiento: "—" },
        ],
    },
    {

        id: "clientes",
        label: "Clientes",
        subtitle: "Empresas cliente activas de Radifax — distinto del CRM de prospectos (GUA / módulo transversal)",
        metrics: [
            { label: "Clientes activos", value: "8" },
            { label: "Con contrato vigente", value: "5" },
            { label: "Nuevos este trimestre", value: "2" },
        ],
        columns: [
            { key: "id", label: "Empresa" },
            { key: "contacto", label: "Contacto" },
            { key: "telefono", label: "Teléfono" },
            { key: "estado", label: "Estado" },
        ],
        fields: [
            { key: "id", label: "Nombre de la empresa", type: "text", required: true },
            { key: "contacto", label: "Contacto principal", type: "text" },
            { key: "correo", label: "Correo", type: "email" },
            { key: "telefono", label: "Teléfono", type: "tel" },
            { key: "equiposActivos", label: "Equipos activos", type: "text" },
            { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
        ],
        seed: [
            { id: "Hotel Los Sueños", contacto: "Laura Jiménez", correo: "compras@losSuenosResort.com", telefono: "2630-4000", equiposActivos: "12 radios", estado: "Activo" },
            { id: "ICT", contacto: "Esteban Rojas", correo: "logistica@ict.go.cr", telefono: "2299-5800", equiposActivos: "8 radios", estado: "Activo" },
            { id: "Bomberos de Costa Rica", contacto: "Cap. Luis Salazar", correo: "operaciones@bomberos.go.cr", telefono: "2210-3232", equiposActivos: "3 repetidoras", estado: "Activo" },
            { id: "Marina Pez Vela", contacto: "Andrea Solís", correo: "info@marinapezvela.com", telefono: "2777-0000", equiposActivos: "6 radios, 1 repetidora", estado: "Activo" },
            { id: "Refinadora Costarricense", contacto: "Mario Chacón", correo: "compras@recope.go.cr", telefono: "2545-9200", equiposActivos: "20 radios", estado: "Activo" },
            { id: "Autobuses San José", contacto: "Vinicio Araya", correo: "flota@autobusessj.cr", telefono: "2222-1010", equiposActivos: "5 radios", estado: "Activo" },
            { id: "Condominios Trejos Montealegre", contacto: "Silvia Ureña", correo: "administracion@trejosmontealegre.cr", telefono: "2289-1122", equiposActivos: "2 radios", estado: "Inactivo" },
            { id: "Cooperativa de Taxis Alajuela", contacto: "Franklin Mora", correo: "coopetaxis@alajuela.cr", telefono: "2441-3030", equiposActivos: "—", estado: "Inactivo" },
        ],
    },
    {

        id: "frecuencias",
        label: "Frecuencias de radio",
        subtitle: "Trámites y control de radiofrecuencias ante el gobierno (RCFR-001 a RCFR-010)",
        metrics: [
            { label: "Frecuencias vigentes", value: "22" },
            { label: "Por renovar (6 meses)", value: "4" },
            { label: "En trámite", value: "2" },
        ],
        columns: [
            { key: "cliente", label: "Cliente" },
            { key: "id", label: "Frecuencia" },
            { key: "vence", label: "Vence" },
            { key: "estado", label: "Estado" },
        ],
        fields: [
            { key: "cliente", label: "Cliente", type: "text", required: true },
            { key: "id", label: "Frecuencia (MHz)", type: "text", required: true },
            { key: "fechaOtorgamiento", label: "Fecha de otorgamiento", type: "date" },
            { key: "vence", label: "Fecha de vencimiento", type: "date" },
            { key: "estado", label: "Estado", type: "select", options: ["Vigente", "Por renovar", "En trámite", "Vencida"] },
        ],
        seed: [
            { id: "462.550 MHz", cliente: "Hotel Los Sueños", fechaOtorgamiento: "2021-12-01", vence: "2026-12-01", estado: "Vigente" },
            { id: "154.100 MHz", cliente: "Bomberos de Costa Rica", fechaOtorgamiento: "2022-03-01", vence: "2027-03-01", estado: "Vigente" },
            { id: "467.750 MHz", cliente: "ICT", fechaOtorgamiento: "2021-09-01", vence: "2026-09-01", estado: "Por renovar" },
            { id: "451.200 MHz", cliente: "Marina Pez Vela", fechaOtorgamiento: "2020-06-01", vence: "2026-06-01", estado: "Vencida" },
            { id: "470.325 MHz", cliente: "Refinadora Costarricense", fechaOtorgamiento: "2026-07-01", vence: "—", estado: "En trámite" },
        ],
    },
];

export const STATUS_STYLES = {

    positive: ["Activo", "Cerrada", "Disponible", "Cobrada", "Resuelto", "Vigente", "Convertido", "Generado", "Compartido", "Completado", "Aplicada"],
    warning: ["Por vencer", "En proceso", "Asignada", "En trámite", "Pendiente", "Recibida", "Programada", "Cotización enviada", "En negociación", "Nuevo", "En espera de repuesto"],
    negative: ["Vencido", "Vencida", "Cancelado", "Cancelada", "Inactivo", "Escalado", "Anulada", "Descartado", "Dado de baja"],
};

export const NOTIFICATIONS_BY_ROLE = {
    "Técnico": [
        "Se te asignó la boleta BOL-00185 (Bomberos de Costa Rica).",
        "La gira GIR-014 inicia mañana — revisá los clientes asignados.",
        "Batería de SN-88214 (Hotel Los Sueños) próxima a cambio.",
    ],
    "Coordinador técnico": [
        "3 boletas sin técnico asignado esta semana.",
        "La gira GIR-014 está en curso — 1 de 4 clientes visitados.",
        "BOL-00183 lleva más de 5 días en espera de repuesto.",
    ],
    "Vendedor / Ejecutivo de cuenta": [
        "El prospecto Refinadora Costarricense no tiene seguimiento hace 5 días.",
        "Cotización de Marina Pez Vela por vencer.",
        "Frecuencia 467.750 MHz (ICT) está por renovar.",
    ],
    "Gerente": [
        "El contrato CT-0041 vence en 6 días (Bomberos de Costa Rica).",
        "Reporte de facturación mensual ya está disponible.",
        "2 facturas pendientes de cobro por más de 30 días.",
    ],
    "Administrador del sistema": [
        "El usuario Henry Ortiz fue desactivado.",
        "2 consultas del agente de IA fueron escaladas hoy.",
        "Respaldo automático de base de datos completado.",
    ],
};

