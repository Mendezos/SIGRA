using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class AuditoriaDA : IAuditoriaDA
{
    private readonly IConexionFactory _conexionFactory;

    public AuditoriaDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task RegistrarAsync(int? idUsuario, string modulo, string entidad, int? idEntidad, string accion, string? detalle = null)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Auditoria_Insertar",
            new { IdUsuario = idUsuario, Modulo = modulo, Entidad = entidad, IdEntidad = idEntidad, Accion = accion, Detalle = detalle },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<List<AuditoriaModel>> ObtenerRecientesPorUsuarioAsync(int idUsuario, int top = 20)
    {
        using var conexion = _conexionFactory.CrearConexion();
        var resultado = await conexion.QueryAsync<AuditoriaModel>(
            "sp_Auditoria_ObtenerRecientesPorUsuario",
            new { IdUsuario = idUsuario, Top = top },
            commandType: CommandType.StoredProcedure);
        return resultado.ToList();
    }
}
