using System.Data;

namespace SIGRA.Abstracciones.Conexion;

public interface IConexionFactory
{
    IDbConnection CrearConexion();
}