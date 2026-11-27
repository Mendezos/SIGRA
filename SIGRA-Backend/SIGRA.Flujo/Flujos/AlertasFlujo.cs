using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// DAR-003, 018 y 019: cada usuario ve las alertas de los módulos que puede consultar y atiende las de los módulos donde puede
// registrar o modificar. Atender exige una nota de seguimiento.
public class AlertasFlujo(IAlertasDA da, IUsuarioDA usuarios, IRolPermisoDA permisos) : IAlertasFlujo
{
    private const int ModuloDashboard = 5;
    private const string RolAdministrador = "Administrador del sistema";

    private async Task<(bool Admin, Dictionary<int, PermisoModuloDto> Permisos)> AccesoAsync(int idUsuario)
    {
        var u = await usuarios.ObtenerPorIdAsync(idUsuario) ?? throw new AccesoDenegadoException("La cuenta ya no está activa.");
        var admin = string.Equals(u.NombreRol, RolAdministrador, StringComparison.OrdinalIgnoreCase);
        var mapa = admin ? new Dictionary<int, PermisoModuloDto>() : (await permisos.ObtenerPorRolAsync(u.IdRol)).ToDictionary(p => p.IdModulo);
        if (!admin && !(mapa.TryGetValue(ModuloDashboard, out var panel) && panel.Lectura))
            throw new AccesoDenegadoException("No tiene permiso para consultar las alertas del dashboard.");
        return (admin, mapa);
    }

    private static bool Puede(bool admin, Dictionary<int, PermisoModuloDto> mapa, int modulo) => admin || (mapa.TryGetValue(modulo, out var p) && p.Lectura);

    private static bool PuedeAtender(bool admin, Dictionary<int, PermisoModuloDto> mapa, int modulo) =>
        admin || (mapa.TryGetValue(modulo, out var p) && p.Lectura && (p.Escritura || p.Edicion));

    public async Task<ListadoAlertasDto> ListarAsync(int idUsuario)
    {
        var (admin, mapa) = await AccesoAsync(idUsuario);
        var todo = await da.ListarAsync();
        var visibles = todo.Alertas.Where(a => Puede(admin, mapa, a.IdModulo)).ToList();
        foreach (var a in visibles) a.PuedeAtender = PuedeAtender(admin, mapa, a.IdModulo);
        return new ListadoAlertasDto { Alertas = visibles, Atendidas = todo.Atendidas.Where(a => Puede(admin, mapa, a.IdModulo)).ToList() };
    }

    public async Task<ListadoAlertasDto> AtenderAsync(AtenderAlertaUnificadaDto dto, int idUsuario)
    {
        var nota = dto.Nota?.Trim();
        if (string.IsNullOrEmpty(nota))
            throw new ValidacionException("Escriba una nota de seguimiento para atender la alerta.", new List<string> { "Nota de seguimiento" });
        if (nota.Length > 500) throw new ReglaNegocioException("La nota no puede superar los 500 caracteres.");

        var actual = await ListarAsync(idUsuario);
        var alerta = actual.Alertas.FirstOrDefault(a => a.Clave == dto.Clave)
            ?? throw new ReglaNegocioException("La alerta ya no está activa. Actualice el listado.");
        if (!alerta.PuedeAtender) throw new AccesoDenegadoException("No tiene permiso para atender alertas de ese módulo.");

        await da.AtenderAsync(alerta.Clave, alerta.IdModulo, alerta.Titulo, nota, idUsuario);
        return await ListarAsync(idUsuario);
    }

    public async Task<List<VistaFavoritaDto>> ListarVistasAsync(int idUsuario)
    {
        await AccesoAsync(idUsuario);
        return await da.ListarVistasAsync(idUsuario);
    }

    public async Task<List<VistaFavoritaDto>> GuardarVistaAsync(GuardarVistaDto dto, int idUsuario)
    {
        await AccesoAsync(idUsuario);
        var nombre = dto.Nombre?.Trim();
        if (string.IsNullOrEmpty(nombre)) throw new ValidacionException("Escriba un nombre para la vista.", new List<string> { "Nombre" });
        if (nombre.Length > 60) throw new ReglaNegocioException("El nombre de la vista no puede superar los 60 caracteres.");
        var filtros = dto.Filtros ?? "";
        if (filtros.Length is 0 or > 400) throw new ReglaNegocioException("Seleccione al menos un filtro antes de guardar la vista.");
        await da.GuardarVistaAsync(idUsuario, nombre, filtros);
        return await da.ListarVistasAsync(idUsuario);
    }

    public async Task<List<VistaFavoritaDto>> EliminarVistaAsync(int idVista, int idUsuario)
    {
        await AccesoAsync(idUsuario);
        await da.EliminarVistaAsync(idUsuario, idVista);
        return await da.ListarVistasAsync(idUsuario);
    }
}
