using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IAlquilerDA
{
    // Contactos iniciales (CARR-001)
    Task<List<VendedorDto>> ListarVendedoresAsync();
    Task<VendedorDto?> ObtenerSiguienteVendedorCascadaAsync();
    Task<VendedorDto?> ObtenerVendedorPrevioAsync(string empresa);
    Task<ContactoRecienteDto?> ObtenerContactoRecienteAsync(string empresa);
    Task<int> InsertarContactoAsync(string empresa, string? contacto, string medio, string dato, string? motivo,
        int? idVendedor, string? motivoAsignacion, int idUsuario);
    Task<List<ContactoDto>> ListarContactosAsync(int? idVendedor);
    Task<List<ContactoHistorialDto>> ObtenerHistorialContactoAsync(int idContacto);
    Task<bool> ExisteContactoAsync(int idContacto);
    Task ReasignarContactoAsync(int idContacto, int idVendedor, int idUsuario, string motivo);

    // Contratos (CARR-002, CARR-014)
    Task<List<ClienteDto>> ListarClientesAsync();
    Task<List<EquipoDisponibleDto>> ListarEquiposParaContratoAsync();
    Task<int> InsertarContratoAsync(string empresa, DateTime fechaInicio, DateTime fechaVencimiento, decimal montoMensual,
        string? condiciones, int? idVendedor, IEnumerable<int> idsEquipo, int idUsuario);
    Task<List<ContratoDto>> ListarContratosAsync(string? texto, string? estado);
    Task<ContratoDto?> ObtenerContratoAsync(int idContrato);
    Task<List<ContratoEquipoDto>> ListarEquiposDeContratoAsync(int idContrato);
    Task AgregarEquipoAContratoAsync(int idContrato, int idEquipo, DateTime fechaAsignacion, int idUsuario);

    // Fichas de radios (CARR-006)
    Task<List<RadioDto>> ListarRadiosAsync(string? texto, string? numeroSerie);
    Task<bool> TieneContratoActivoAsync(int idEquipo);

    // Fichas técnicas de repetidoras (CARR-009)
    Task<List<RepetidoraDto>> ListarRepetidorasAsync(string? texto, bool? facturable);
    Task<RepetidoraDto?> ObtenerRepetidoraPorSerieAsync(string numeroSerie);
    Task<(List<RequisitoChecklistDto> Requisitos, VerificacionChecklistDto? Ultima, List<VerificacionChecklistDto> Historial)> ObtenerChecklistAsync(int idEquipo);
    Task GuardarChecklistAsync(int idEquipo, IEnumerable<int> idsCumplidos, string? observaciones, int idUsuario);
    Task<List<DocumentoRepetidoraDto>> ListarDocumentosAsync(int idEquipo);
    Task<DocumentoArchivoDto?> ObtenerDocumentoAsync(int idDocumento);
    Task<int> InsertarDocumentoAsync(int idEquipo, string tipoDocumento, string nombreDocumento, string nombreArchivo,
        string tipoContenido, byte[] contenido, int idUsuario);
    Task<List<BitacoraMantenimientoDto>> ListarBitacoraRepetidoraAsync(int idEquipo);
    Task GuardarFichaRepetidoraAsync(int idEquipo, string frecuencia, string frecuenciaRecepcion, string potencia,
        string? accesorios, string direccionInstalacion, string? coordenadasGps, string clasificacion, int idUsuario);
}
