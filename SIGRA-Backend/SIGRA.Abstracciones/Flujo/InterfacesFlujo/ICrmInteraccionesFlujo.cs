using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

// CRMGPSC-013 y 014: notas, interacciones e historial comercial
public interface ICrmInteraccionesFlujo
{
    Task<InteraccionRegistradaDto> RegistrarInteraccionAsync(RegistrarInteraccionDto dto, int idUsuario);
    Task<NotaRegistradaDto> RegistrarNotaAsync(RegistrarNotaDto dto, int idUsuario);
    Task<List<CrmCotizacionEmpresaDto>> ListarCotizacionesAsync(string? tipoEmpresa, int? idEmpresa);
    Task<HistorialComercialDto> ObtenerHistorialAsync(string? tipoEmpresa, int? idEmpresa, string? tipoMovimiento,
        DateTime? desde, DateTime? hasta, int? idAutor, int idUsuario);
}
