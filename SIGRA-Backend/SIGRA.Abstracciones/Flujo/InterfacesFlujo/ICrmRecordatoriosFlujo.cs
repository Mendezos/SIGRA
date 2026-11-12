using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

// CRMGPSC-025 y T-02: recordatorios de baterías y servicio de recordatorios
public interface ICrmRecordatoriosFlujo
{
    Task<List<BateriaModeloDto>> ListarModelosAsync();

    Task<List<RecordatorioBateriaDto>> ListarAsync(string? estado, int? idVendedor, string? cliente, DateTime? desde, DateTime? hasta);

    Task<RecordatorioBateriaDto> ObtenerAsync(int idRecordatorio);

    Task<BateriaRegistroResultadoDto> RegistrarAsync(RegistrarCompraBateriaDto dto, int idUsuario);

    Task<BateriaAtencionResultadoDto> AtenderAsync(int idRecordatorio, AtenderBateriaDto dto, int idUsuario);

    /// <summary>Lo llama el módulo de facturación al emitir una factura: crea un recordatorio por cada batería facturada (idempotente).</summary>
    Task<List<BateriaFacturaResultadoDto>> RegistrarDesdeFacturaAsync(int idFactura, int? idUsuario);

    /// <summary>Una vuelta del servicio de recordatorios (seguimientos, series, baterías). idUsuario = quien la dispara a mano; null = proceso automático.</summary>
    Task<ResumenProcesoRecordatoriosDto> ProcesarAsync(int? idUsuario = null);

    Task<ResumenRecordatoriosDto> ObtenerResumenAsync(int idUsuario);
}
