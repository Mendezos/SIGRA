using SIGRA.Abstracciones.Dtos;

namespace SIGRA.Abstracciones.Interfaces.InterfacesDA;

public interface IPlantillaContratoDA
{
    Task<List<PlantillaContratoDto>> ListarAsync(string? texto, int? idCategoria, string? estado);
    Task<DetallePlantillaContratoDto?> ObtenerAsync(int idPlantilla, int? version);
    Task<int> InsertarAsync(GuardarPlantillaContratoDto dto, int idUsuario);
    Task<int> EditarAsync(int idPlantilla, GuardarPlantillaContratoDto dto, int idUsuario);
    Task<bool> CambiarEstadoAsync(int idPlantilla, bool activa, string? motivo, int idUsuario);
}
