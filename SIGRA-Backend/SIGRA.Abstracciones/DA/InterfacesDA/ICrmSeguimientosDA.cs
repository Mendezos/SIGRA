using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

// CRMGPSC-015 a 018 y 024: seguimientos, agenda y contactos periódicos
public interface ICrmSeguimientosDA
{
    /// <summary>Marca como Atrasados los seguimientos Pendientes cuya fecha ya pasó y devuelve la agenda con los filtros indicados.</summary>
    Task<List<CrmSeguimientoDto>> ListarAsync(CrmSeguimientoFiltro filtro);
    /// <summary>El seguimiento con su historial; null si no existe.</summary>
    Task<CrmSeguimientoDto?> ObtenerAsync(int idSeguimiento);
    Task<int> CrearAsync(string tipoEmpresa, int idEmpresa, int? idContactoEmpresa, string tipo, DateTime fechaHora, string motivo,
        string prioridad, int idResponsable, int idUsuario);
    Task ReprogramarAsync(int idSeguimiento, DateTime nuevaFechaHora, string motivo, int idUsuario);
    /// <summary>true = se completó; false = ya estaba cerrado y no se cambió nada.</summary>
    Task<bool> CompletarAsync(int idSeguimiento, DateTime fechaReal, string resultado, string? observaciones, string? proximoPaso, int idUsuario);
    /// <summary>true = se canceló; false = ya estaba cerrado y no se cambió nada.</summary>
    Task<bool> CancelarAsync(int idSeguimiento, string motivo, int idUsuario);

    Task<List<CrmSerieDto>> ListarSeriesAsync(int? idResponsable, string? estado, string? texto);
    /// <summary>La serie con todos sus seguimientos; null si no existe.</summary>
    Task<CrmSerieDetalleDto?> ObtenerSerieAsync(int idSerie);
    Task<int> CrearSerieAsync(string tipoEmpresa, int idEmpresa, int? idContactoEmpresa, string periodicidad, DateTime fechaInicial,
        TimeSpan hora, string tipo, string motivo, string prioridad, int idResponsable, int idUsuario);
    /// <summary>Aplicado = false si la serie ya estaba cancelada.</summary>
    Task<(bool Aplicado, int SeguimientosCancelados)> CancelarSerieAsync(int idSerie, string motivo, int idUsuario);
}
