export function getInitials(nombre) {
    if (!nombre) return "??";
    const partes = nombre.trim().split(/\s+/);
    const primeras = partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
    return primeras.join("") || "??";
}

export function buildUser(perfil) {
    return {
        idUsuario: perfil.idUsuario,
        name: perfil.nombre,
        correo: perfil.correo,
        role: perfil.rol,
        initials: getInitials(perfil.nombre),
        permisos: perfil.permisos ?? [],
    };
}
