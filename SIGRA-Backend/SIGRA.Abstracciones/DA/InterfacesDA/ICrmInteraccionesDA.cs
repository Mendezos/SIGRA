using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

// CRMGPSC-013 y 014: notas, interacciones e historial comercial
public interface ICrmInteraccionesDA
{
    Task<InteraccionRegistradaDto> RegistrarInteraccionAsync(string tipoEmpresa, int idEmpresa, int idUsuario, string tipo, DateTime fecha,
        string descripcion, string? resultado, string? proximoPaso, int? idContactoEmpresa, int? idCotizacion);

    Task<NotaRegistradaDto> RegistrarNotaAsync(string tipoEmpresa, int idEmpresa, int idUsuario, string categoria, string texto, string visibilidad);

    Task<List<CrmCotizacionEmpresaDto>> ListarCotizacionesAsync(string tipoEmpresa, int idEmpresa);

    /// <summary>Devuelve movimientos, autores y total sin filtros; los datos de la empresa los completa el flujo.</summary>
    Task<HistorialComercialDto> ListarHistorialAsync(string tipoEmpresa, int idEmpresa, int idUsuario, string? tipoMovimiento,
        DateTime? desde, DateTime? hasta, int? idAutor);
}
