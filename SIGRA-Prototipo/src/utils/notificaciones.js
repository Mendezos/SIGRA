// Reglas puras de la campana de notificaciones (sin React ni red, para poder probarlas aparte).

// Tipos de aviso que reconoce la campana (columna Tipo de Notificacion). Cualquier otro valor se muestra como "General".
export const TIPOS_AVISO = {
    Seguimiento: "Seguimiento",
    Bateria: "Batería",
    ContactoSinVendedor: "Contacto sin vendedor",
    Contrato: "Contrato",
    Frecuencia: "Frecuencia",
    Ticket: "Ticket",
    General: "General",
};

// Tipo normalizado de un aviso. Los avisos antiguos de tickets pueden llegar como "General" con entidad "Ticket".
export function tipoDeAviso(aviso) {
    if (aviso?.tipo && Object.hasOwn(TIPOS_AVISO, aviso.tipo) && aviso.tipo !== "General") return aviso.tipo;
    return aviso?.entidad === "Ticket" ? "Ticket" : "General";
}

// Destino que se abre al pulsar un aviso: { moduleId, tab?, id?, etiqueta } o null si el aviso no lleva enlace.
// La forma { moduleId, tab, id } es la que recibe onNavigate del tablero; el módulo destino abre la pestaña (y el registro, si puede).
const DESTINOS = {
    SeguimientoCRM: { moduleId: "crm", tab: "agenda", etiqueta: "Ir a Mi agenda" },
    RecordatorioBateria: { moduleId: "crm", tab: "baterias", etiqueta: "Ir a Recordatorios de baterías" },
    ContactoInicial: { moduleId: "alquiler", tab: "contactos", etiqueta: "Ir a Contactos iniciales" },
    Ticket: { moduleId: "tickets", etiqueta: "Ir a Tickets de servicio técnico" },
    Contrato: { moduleId: "alquiler", tab: "contratos", etiqueta: "Ir a Contratos" },
    SolicitudFrecuencia: { moduleId: "frecuencias", tab: "solicitudes", etiqueta: "Ir a Solicitudes de frecuencia" },
};

export function destinoDeAviso(aviso) {
    const base = aviso?.entidad ? DESTINOS[aviso.entidad] : null;
    if (!base) return null;
    const destino = { moduleId: base.moduleId, etiqueta: base.etiqueta };
    if (base.tab) destino.tab = base.tab;
    if (aviso.idEntidad !== null && aviso.idEntidad !== undefined) destino.id = aviso.idEntidad;
    return destino;
}

// ¿El usuario puede entrar al módulo destino? Se basa en los permisos de lectura que trae su perfil (idModulo + lectura).
const ID_MODULO = { tickets: 2, alquiler: 3, crm: 9, frecuencias: 11 };

export function puedeAbrirDestino(permisos, destino) {
    if (!destino || !Array.isArray(permisos)) return false;
    const idModulo = ID_MODULO[destino.moduleId];
    return permisos.some((p) => p.idModulo === idModulo && p.lectura);
}

// Texto del contador de la campana: nada si no hay pendientes y "99+" si son muchos.
export function textoContador(sinLeer) {
    if (!sinLeer || sinLeer < 1) return "";
    return sinLeer > 99 ? "99+" : String(sinLeer);
}
