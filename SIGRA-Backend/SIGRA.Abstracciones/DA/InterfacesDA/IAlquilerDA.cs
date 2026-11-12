using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Modelos;

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
    Task<int> InsertarContratoAsync(DatosContratoModel datos, IEnumerable<int> idsEquipo, IEnumerable<AccesorioContratoItemDto> accesorios, int idUsuario);
    Task EditarContratoBorradorAsync(int idContrato, DatosContratoModel datos, IEnumerable<int> idsEquipo, IEnumerable<AccesorioContratoItemDto> accesorios);
    Task ActivarContratoAsync(int idContrato, DateTime fechaFirma, DateTime? fechaInicioReal, string nombreArchivo, byte[] contenido, int idUsuario);
    Task<List<DocumentoContratoDto>> ListarDocumentosDeContratoAsync(int idContrato);
    Task<ArchivoContratoDto?> ObtenerDocumentoDeContratoAsync(int idContrato, int idDocumento);
    Task<List<ContratoDto>> ListarContratosAsync(FiltroContratosDto filtro);
    Task<ContratoDto?> ObtenerContratoAsync(int idContrato);
    Task<List<ContratoEquipoDto>> ListarEquiposDeContratoAsync(int idContrato);
    Task<List<ContratoAccesorioDto>> ListarAccesoriosDeContratoAsync(int idContrato);
    Task GuardarAccesoriosDeContratoAsync(int idContrato, IEnumerable<AccesorioContratoItemDto> accesorios);
    Task AgregarEquipoAContratoAsync(int idContrato, int idEquipo, DateTime fechaAsignacion, int idUsuario);

    // Fichas de radios (CARR-006)
    Task<List<RadioDto>> ListarRadiosAsync(string? texto, string? numeroSerie, bool soloBateriaPorCambiar = false);
    Task<bool> TieneContratoActivoAsync(int idEquipo);

    // Renovación, cancelación, auditoría y alertas de contratos (CARR-003, 004, 005, 015)
    Task<List<RenovacionDto>> ListarRenovacionesAsync(int idContrato);
    Task CancelarContratoAsync(int idContrato, CancelarContratoDto datos, int idUsuario);
    Task<List<AuditoriaContratoDto>> ListarAuditoriaContratoAsync(int idContrato);
    Task<int> MarcarContratosVencidosAsync();
    Task<List<AlertaContratoDto>> ListarAlertasPendientesAsync();
    Task RegistrarAlertaAsync(int idContrato, string tipo);
    Task<List<AdministradorDto>> ListarAdministradoresAsync();

    // Baterías de radios (CARR-007, 008)
    Task<List<CambioBateriaDto>> ListarBateriasAsync(int idRadio);
    Task RegistrarBateriaAsync(int idRadio, string numeroSerieBateria, DateTime fechaCambio, int idUsuario);

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
