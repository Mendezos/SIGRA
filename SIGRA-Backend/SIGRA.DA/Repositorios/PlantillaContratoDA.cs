using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

public class PlantillaContratoDA(IConexionFactory conexionFactory) : IPlantillaContratoDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla; 2601/2627 es el índice único del nombre activo.
    private async Task<T> EjecutarAsync<T>(Func<IDbConnection, Task<T>> accion)
    {
        using var conexion = conexionFactory.CrearConexion();
        try { return await accion(conexion); }
        catch (SqlException ex) when (ex.Number == 50001) { throw new ReglaNegocioException(ex.Message); }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        { throw new ReglaNegocioException("Ya existe una plantilla activa con ese nombre. Use otro nombre."); }
    }

    public async Task<List<PlantillaContratoDto>> ListarAsync(string? texto, int? idCategoria, string? estado) =>
        (await EjecutarAsync(c => c.QueryAsync<PlantillaContratoDto>("sp_PlantillaContrato_Listar",
            new { Texto = texto, IdCategoria = idCategoria, Estado = estado }, commandType: CommandType.StoredProcedure))).ToList();

    public async Task<DetallePlantillaContratoDto?> ObtenerAsync(int idPlantilla, int? version)
    {
        using var conexion = conexionFactory.CrearConexion();
        using var resultados = await conexion.QueryMultipleAsync("sp_PlantillaContrato_Obtener",
            new { IdPlantilla = idPlantilla, Version = version }, commandType: CommandType.StoredProcedure);
        var plantilla = await resultados.ReadFirstOrDefaultAsync<DetallePlantillaContratoDto>();
        if (plantilla is null) return null;
        plantilla.Versiones = (await resultados.ReadAsync<VersionPlantillaContratoDto>()).ToList();
        plantilla.Cambios = (await resultados.ReadAsync<CambioEstadoPlantillaDto>()).ToList();
        return plantilla;
    }

    public Task<int> InsertarAsync(GuardarPlantillaContratoDto dto, int idUsuario) =>
        EjecutarAsync(c => c.ExecuteScalarAsync<int>("sp_PlantillaContrato_Insertar",
            new { dto.Nombre, dto.IdCategoria, dto.Clausulas, dto.Responsabilidades, dto.CondicionesCancelacion, dto.Activa, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure));

    public Task<int> EditarAsync(int idPlantilla, GuardarPlantillaContratoDto dto, int idUsuario) =>
        EjecutarAsync(c => c.ExecuteScalarAsync<int>("sp_PlantillaContrato_Editar",
            new { IdPlantilla = idPlantilla, dto.Clausulas, dto.Responsabilidades, dto.CondicionesCancelacion, dto.Motivo, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure));

    public Task<bool> CambiarEstadoAsync(int idPlantilla, bool activa, string? motivo, int idUsuario) =>
        EjecutarAsync(c => c.ExecuteScalarAsync<bool>("sp_PlantillaContrato_CambiarEstado",
            new { IdPlantilla = idPlantilla, Activa = activa, Motivo = motivo, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure));
}
