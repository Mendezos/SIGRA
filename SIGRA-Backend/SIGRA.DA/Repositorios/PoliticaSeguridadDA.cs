using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class PoliticaSeguridadDA : IPoliticaSeguridadDA
{
    private readonly IConexionFactory _conexionFactory;

    public PoliticaSeguridadDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task<PoliticaSeguridadModel?> ObtenerActivaAsync()
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleOrDefaultAsync<PoliticaSeguridadModel>(
            "sp_PoliticaSeguridad_ObtenerActiva", commandType: CommandType.StoredProcedure);
    }

    public async Task<PoliticaSeguridadModel> CrearVersionAsync(PoliticaSeguridadModel nueva)
    {
        using var conexion = _conexionFactory.CrearConexion();
        try
        {
            return await conexion.QuerySingleAsync<PoliticaSeguridadModel>(
                "sp_PoliticaSeguridad_CrearVersion",
                new
                {
                    nueva.MinutosInactividad,
                    nueva.MaxIntentosFallidos,
                    nueva.LongitudMinimaPassword,
                    nueva.MinutosBloqueo,
                    nueva.VigenciaEnlaceMinutos,
                    IdUsuarioCreador = nueva.IdUsuarioCreador
                },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number == 547)
        {
            throw new ValidacionException("Uno o más valores no cumplen las reglas permitidas por la base de datos.", new List<string> { ex.Message });
        }
    }
}
