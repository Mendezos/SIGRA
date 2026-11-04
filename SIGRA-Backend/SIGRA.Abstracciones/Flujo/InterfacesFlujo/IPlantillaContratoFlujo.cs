using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Flujo;

public interface IPlantillaContratoFlujo
{
    Task<List<PlantillaContratoDto>> ListarAsync(string? texto, int? idCategoria, string? estado);
    Task<DetallePlantillaContratoDto> ObtenerAsync(int idPlantilla, int? version);
    Task<DetallePlantillaContratoDto> RegistrarAsync(GuardarPlantillaContratoDto dto, int idUsuario);
    Task<DetallePlantillaContratoDto> EditarAsync(int idPlantilla, GuardarPlantillaContratoDto dto, int idUsuario);
    Task<ResultadoPlantillaContratoDto> CambiarEstadoAsync(int idPlantilla, CambiarEstadoPlantillaDto dto, int idUsuario);
}
