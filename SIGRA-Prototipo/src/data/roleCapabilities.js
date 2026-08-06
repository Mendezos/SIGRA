const ALL_MODULES = [
    "usuarios",
    "tickets",
    "alquiler",
    "inventario",
    "dashboard",
    "ia",
    "contratos",
    "giras",
    "crm",
    "clientes",
    "frecuencias",
];

const FULL_ACTIONS = {
    view: true,
    create: true,
    edit: true,
    deactivate: true,
};

const VIEW_ONLY = {
    view: true,
    create: false,
    edit: false,
    deactivate: false,
};

const NO_ACCESS = {
    view: false,
    create: false,
    edit: false,
    deactivate: false,
};

export const ROLE_CAPABILITIES = {
    "Administrador del sistema": {
        moduleIds: ALL_MODULES,
        fullAccess: true,
        canGenerateTicket: true,
        canAssignTechnician: true,
        canRescheduleGiras: true,
        quickModules: ["usuarios", "tickets", "dashboard"],
        reportTypes: [
            "Contratos por vencer",
            "Servicios facturados",
            "Bitácora de tickets",
            "Carga de trabajo por técnico",
            "Giras y mantenimientos",
            "Valorización de inventario",
            "Frecuencias próximas a vencer",
            "Seguimiento de prospectos",
        ],
    },

    Gerente: {
        moduleIds: [
            "usuarios",
            "tickets",
            "alquiler",
            "inventario",
            "dashboard",
            "contratos",
            "giras",
            "crm",
            "clientes",
            "frecuencias",
        ],
        canGenerateTicket: false,
        canAssignTechnician: false,
        canRescheduleGiras: false,
        quickModules: ["dashboard", "contratos", "inventario"],
        reportTypes: [
            "Contratos por vencer",
            "Servicios facturados",
            "Valorización de inventario",
        ],
        moduleActions: {},
    },

    "Coordinador técnico": {
        moduleIds: [
            "tickets",
            "alquiler",
            "inventario",
            "dashboard",
            "giras",
            "clientes",
        ],
        canGenerateTicket: true,
        canAssignTechnician: true,
        canRescheduleGiras: true,
        quickModules: ["tickets", "giras", "inventario"],
        reportTypes: [
            "Bitácora de tickets",
            "Carga de trabajo por técnico",
            "Giras y mantenimientos",
        ],
        moduleActions: {
            tickets: {
                create: true,
                edit: true,
                deactivate: true,
            },
            inventario: {
                create: true,
                edit: true,
            },
            giras: {
                create: true,
                edit: true,
                deactivate: true,
            },
        },
    },

    Técnico: {
        moduleIds: [
            "tickets",
            "alquiler",
            "inventario",
            "dashboard",
            "giras",
        ],
        canGenerateTicket: true,
        canAssignTechnician: false,
        canRescheduleGiras: false,
        quickModules: ["tickets", "inventario", "alquiler"],
        reportTypes: [
            "Mis tickets asignados",
            "Inventario y baterías",
        ],
        moduleActions: {
            tickets: {
                create: true,
                edit: true,
            },
            inventario: {
                create: true,
                edit: true,
            },
        },
    },

    "Vendedor / Ejecutivo de cuenta": {
        moduleIds: [
            "alquiler",
            "dashboard",
            "contratos",
            "giras",
            "crm",
            "clientes",
            "frecuencias",
        ],
        canGenerateTicket: false,
        canAssignTechnician: false,
        canRescheduleGiras: false,
        quickModules: ["crm", "contratos", "frecuencias"],
        reportTypes: [
            "Contratos por vencer",
            "Frecuencias próximas a vencer",
            "Seguimiento de prospectos",
        ],
        moduleActions: {
            alquiler: {
                create: true,
                edit: true,
            },
            contratos: {
                create: true,
                edit: true,
            },
            crm: {
                create: true,
                edit: true,
                deactivate: true,
            },
            clientes: {
                create: true,
                edit: true,
            },
            frecuencias: {
                create: true,
                edit: true,
            },
        },
    },
};

export function getRoleCapabilities(role) {
    return (
        ROLE_CAPABILITIES[role] ?? {
            moduleIds: [],
            quickModules: [],
            reportTypes: [],
            canGenerateTicket: false,
            canAssignTechnician: false,
            canRescheduleGiras: false,
            moduleActions: {},
        }
    );
}

export function canAccessModule(role, moduleId) {
    return getRoleCapabilities(role).moduleIds.includes(moduleId);
}

export function getModulePermissions(role, moduleId) {
    const capabilities = getRoleCapabilities(role);

    if (!capabilities.moduleIds.includes(moduleId)) {
        return NO_ACCESS;
    }

    if (capabilities.fullAccess) {
        return FULL_ACTIONS;
    }

    return {
        ...VIEW_ONLY,
        ...(capabilities.moduleActions?.[moduleId] ?? {}),
    };
}

export function getReportTypes(role) {
    return getRoleCapabilities(role).reportTypes;
}

export function getQuickModuleIds(role) {
    return getRoleCapabilities(role).quickModules;
}

export function canGenerateTicket(role) {
    return getRoleCapabilities(role).canGenerateTicket;
}

export function canAssignTechnician(role) {
    return getRoleCapabilities(role).canAssignTechnician;
}

export function canRescheduleGiras(role) {
    return getRoleCapabilities(role).canRescheduleGiras;
}