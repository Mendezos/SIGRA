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

    Task<List<RadioDto>> ListarRadiosAsync(string? texto);
    Task<RadioDto> ObtenerRadioPorSerieAsync(string numeroSerie);
}
