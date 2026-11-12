using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

// CRMGPSC-025 y T-02: recordatorios de baterías y servicio de recordatorios
public interface ICrmRecordatoriosDA
{
    Task<List<BateriaModeloDto>> ListarModelosAsync();

    Task<List<RecordatorioBateriaDto>> ListarAsync(string? estado, int? idVendedor, string? cliente, DateTime? desde, DateTime? hasta);

    Task<RecordatorioBateriaDto?> ObtenerAsync(int idRecordatorio);

    /// <summary>Registra la compra y cierra, en la misma transacción, los recordatorios abiertos de la misma batería (cambio anticipado).</summary>
    Task<(int IdRecordatorio, List<int> Cerrados)> RegistrarAsync(int idCliente, int? idContactoEmpresa, int? idFactura, string? numeroFactura,
        int? idModelo, string? modeloBateria, int cantidad, DateTime fechaCompra, int idVendedor, int idUsuario);

    /// <summary>true = se registró la atención; false = el recordatorio ya estaba Atendido o Cerrado y no se modificó.</summary>
    Task<bool> AtenderAsync(int idRecordatorio, string medio, string resultado, string? observacion, string? proximoPaso, int idUsuario);

    Task<List<BateriaFacturaResultadoDto>> RegistrarDesdeFacturaAsync(int idFactura, int? idUsuario);

    Task<ResumenProcesoRecordatoriosDto> ProcesarAsync();

    Task<ResumenRecordatoriosDto> ObtenerResumenAsync(int idUsuario);
}
