using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using SIGRA.Abstracciones.Conexion;

namespace SIGRA.DA.Conexion;

public class ConexionFactory : IConexionFactory
{
    private readonly string _cadenaConexion;

    public ConexionFactory(IConfiguration configuracion)
    {
        _cadenaConexion = configuracion.GetConnectionString("SIGRA")
            ?? throw new InvalidOperationException("No se encontro la cadena de conexion 'SIGRA' en la configuracion.");
    }

    public IDbConnection CrearConexion() => new SqlConnection(_cadenaConexion);
}