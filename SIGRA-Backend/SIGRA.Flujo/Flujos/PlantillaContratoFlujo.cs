using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

// GCFS-001 a GCFS-004: plantillas de contrato con versiones.
public class PlantillaContratoFlujo(IPlantillaContratoDA da, IAuditoriaDA auditoriaDA) : IPlantillaContratoFlujo
{
    private const string Modulo = "Alquiler";
    private const int LimiteTexto = 20000;

    private static string? Limpio(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();

    public Task<List<PlantillaContratoDto>> ListarAsync(string? texto, int? idCategoria, string? estado)
    {
        estado = Limpio(estado);
        if (estado is not null && estado is not ("Activa" or "Inactiva"))
            throw new ReglaNegocioException("El estado indicado no es válido.");
        return da.ListarAsync(Limpio(texto), idCategoria, estado);
    }

    public async Task<DetallePlantillaContratoDto> ObtenerAsync(int idPlantilla, int? version) =>
        await da.ObtenerAsync(idPlantilla, version)
            ?? throw new ReglaNegocioException(version is null ? "La plantilla indicada no fue encontrada." : "La versión indicada de la plantilla no existe.");

    // Valida los campos obligatorios y devuelve todos los faltantes juntos, para resaltarlos en el formulario.
    private static void Validar(GuardarPlantillaContratoDto dto, bool nueva)
    {
        dto.Nombre = Limpio(dto.Nombre);
        dto.Clausulas = Limpio(dto.Clausulas);
        dto.Responsabilidades = Limpio(dto.Responsabilidades);
        dto.CondicionesCancelacion = Limpio(dto.CondicionesCancelacion);
        dto.Motivo = Limpio(dto.Motivo);

        var faltantes = new List<string>();
        if (nueva && dto.Nombre is null) faltantes.Add("el nombre");
        if (dto.Clausulas is null) faltantes.Add("las cláusulas");
        if (dto.Responsabilidades is null) faltantes.Add("las responsabilidades del cliente");
        if (!nueva && dto.Motivo is null) faltantes.Add("el motivo del cambio");
        if (faltantes.Count > 0)
            throw new ReglaNegocioException("Faltan datos obligatorios: " + string.Join(", ", faltantes) + ".");

        if (nueva && dto.Nombre!.Length is < 3 or > 120)
            throw new ReglaNegocioException("El nombre debe tener entre 3 y 120 caracteres.");
        if (dto.Motivo?.Length > 300)
            throw new ReglaNegocioException("El motivo no puede superar los 300 caracteres.");
        if (dto.Clausulas!.Length > LimiteTexto || dto.Responsabilidades!.Length > LimiteTexto || dto.CondicionesCancelacion?.Length > LimiteTexto)
            throw new ReglaNegocioException($"Cada sección admite como máximo {LimiteTexto} caracteres.");
    }

    public async Task<DetallePlantillaContratoDto> RegistrarAsync(GuardarPlantillaContratoDto dto, int idUsuario)
    {
        Validar(dto, nueva: true);
        var id = await da.InsertarAsync(dto, idUsuario);
        await auditoriaDA.RegistrarAsync(idUsuario, Modulo, "PlantillaContrato", id, "PLANTILLA_REGISTRADA", $"{dto.Nombre}: versión 1");
        return await ObtenerAsync(id, null);
    }

    public async Task<DetallePlantillaContratoDto> EditarAsync(int idPlantilla, GuardarPlantillaContratoDto dto, int idUsuario)
    {
        Validar(dto, nueva: false);
        var version = await da.EditarAsync(idPlantilla, dto, idUsuario);
        await auditoriaDA.RegistrarAsync(idUsuario, Modulo, "PlantillaContrato", idPlantilla, "PLANTILLA_EDITADA", $"Versión {version}. {dto.Motivo}");
        return await ObtenerAsync(idPlantilla, null);
    }

    public async Task<ResultadoPlantillaContratoDto> CambiarEstadoAsync(int idPlantilla, CambiarEstadoPlantillaDto dto, int idUsuario)
    {
        dto.Motivo = Limpio(dto.Motivo);
        if (!dto.Activa && dto.Motivo is null)
            throw new ReglaNegocioException("Ingrese el motivo para desactivar la plantilla.");
        if (dto.Motivo?.Length > 300)
            throw new ReglaNegocioException("El motivo no puede superar los 300 caracteres.");

        var cambio = await da.CambiarEstadoAsync(idPlantilla, dto.Activa, dto.Motivo, idUsuario);
        if (cambio)
            await auditoriaDA.RegistrarAsync(idUsuario, Modulo, "PlantillaContrato", idPlantilla,
                dto.Activa ? "PLANTILLA_REACTIVADA" : "PLANTILLA_DESACTIVADA", dto.Motivo);

        var plantilla = await ObtenerAsync(idPlantilla, null);
        return new ResultadoPlantillaContratoDto
        {
            Plantilla = plantilla,
            Mensaje = cambio
                ? (dto.Activa ? "La plantilla se reactivó y ya se puede usar en contratos nuevos." : "La plantilla se desactivó. Los contratos que ya la usan no cambian.")
                : $"No hubo cambios: la plantilla ya está {(plantilla.Activa ? "activa" : "inactiva")}."
        };
    }
}
