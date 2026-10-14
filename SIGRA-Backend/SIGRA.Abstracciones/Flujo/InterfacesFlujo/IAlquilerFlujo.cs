using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IAlquilerFlujo
{
    Task<List<VendedorDto>> ListarVendedoresAsync();
    Task<SugerenciaContactoDto> ObtenerSugerenciaContactoAsync(string empresa);
    Task<RegistrarContactoResultadoDto> RegistrarContactoAsync(RegistrarContactoDto dto, int idUsuario);
    Task<List<ContactoDto>> ListarContactosAsync(int? idVendedor);
    Task<DetalleContactoDto> ObtenerContactoAsync(int idContacto);
    Task<DetalleContactoDto> ReasignarContactoAsync(int idContacto, ReasignarContactoDto dto, int idUsuario);

    Task<List<ClienteDto>> ListarClientesAsync();
    Task<List<EquipoDisponibleDto>> ListarEquiposParaContratoAsync();
    Task<DetalleContratoDto> RegistrarContratoAsync(RegistrarContratoDto dto, int? idVendedor, int idUsuario);
    Task<List<ContratoDto>> ListarContratosAsync(string? texto, string? estado);
    Task<DetalleContratoDto> ObtenerContratoAsync(int idContrato);
    Task<DetalleContratoDto> AgregarRadioAContratoAsync(AgregarRadioDto dto, int idUsuario);
    Task<DetalleContratoDto> GuardarAccesoriosContratoAsync(int idContrato, GuardarAccesoriosContratoDto dto, int idUsuario, bool esAdministrador);

    Task<List<RadioDto>> ListarRadiosAsync(string? texto);
    Task<RadioDto> ObtenerRadioPorSerieAsync(string numeroSerie);

    Task<DetalleContratoDto> RenovarContratoAsync(int idContrato, RenovarContratoDto dto, int idUsuario, bool esAdministrador);
    Task<DetalleContratoDto> CancelarContratoAsync(int idContrato, CancelarContratoDto dto, int idUsuario);
    Task<List<RenovacionDto>> ListarRenovacionesAsync(int idContrato, int idUsuario, bool esAdministrador);
    Task<List<AuditoriaContratoDto>> ListarAuditoriaContratoAsync(int idContrato);
    Task<ResultadoProcesoVencimientosDto> ProcesarVencimientosAsync();

    Task<List<RadioDto>> ListarRadiosConBateriaPorCambiarAsync();
    Task<List<CambioBateriaDto>> ListarBateriasAsync(int idRadio);
    Task<RadioDto> RegistrarCambioBateriaAsync(RegistrarBateriaDto dto, int idUsuario);

    Task<List<RepetidoraDto>> ListarRepetidorasAsync(string? texto, bool? facturable);
    Task<RepetidoraDto> ObtenerRepetidoraPorSerieAsync(string numeroSerie);
    Task<ChecklistRepetidoraDto> ObtenerChecklistAsync(string numeroSerie);
    Task<ChecklistRepetidoraDto> GuardarChecklistAsync(string numeroSerie, GuardarChecklistDto dto, int idUsuario);
    Task<List<DocumentoRepetidoraDto>> ListarDocumentosAsync(string numeroSerie);
    Task<DocumentoRepetidoraDto> AdjuntarDocumentoAsync(string numeroSerie, SubirDocumentoDto dto, int idUsuario);
    Task<DocumentoArchivoDto> ObtenerDocumentoAsync(int idDocumento);
    Task<List<BitacoraMantenimientoDto>> ObtenerBitacoraRepetidoraAsync(string numeroSerie);
    Task<RepetidoraDto> GuardarFichaRepetidoraAsync(GuardarFichaRepetidoraDto dto, bool esEdicion, int idUsuario);
}
