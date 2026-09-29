using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using SIGRA.Abstracciones.Modelos;
using System.Data;

namespace SIGRA.DA.Repositorios;

public class UsuarioDA : IUsuarioDA
{
    private readonly IConexionFactory _conexionFactory;

    public UsuarioDA(IConexionFactory conexionFactory) => _conexionFactory = conexionFactory;

    public async Task<UsuarioModel?> ObtenerPorCorreoAsync(string correo)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleOrDefaultAsync<UsuarioModel>(
            "sp_Usuario_ObtenerPorCorreo", new { Correo = correo }, commandType: CommandType.StoredProcedure);
    }

    public async Task<UsuarioModel?> ObtenerPorIdAsync(int idUsuario)
    {
        using var conexion = _conexionFactory.CrearConexion();
        return await conexion.QuerySingleOrDefaultAsync<UsuarioModel>(
            "sp_Usuario_ObtenerPorId", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
    }

    public async Task RegistrarLoginExitosoAsync(int idUsuario)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Usuario_RegistrarLoginExitoso", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
    }

    public async Task<(int IntentosFallidos, bool CuentaBloqueada, DateTime? BloqueadoHasta)> RegistrarLoginFallidoAsync(int idUsuario, int maxIntentos, int minutosBloqueo)
    {
        using var conexion = _conexionFactory.CrearConexion();
        var resultado = await conexion.QuerySingleAsync(
            "sp_Usuario_RegistrarLoginFallido",
            new { IdUsuario = idUsuario, MaxIntentosFallidos = maxIntentos, DuracionBloqueoMinutos = minutosBloqueo },
            commandType: CommandType.StoredProcedure);

        return ((int)resultado.IntentosFallidos, (bool)resultado.CuentaBloqueada, (DateTime?)resultado.BloqueadoHasta);
    }

    public async Task DesbloquearCuentaAsync(int idUsuario)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Usuario_DesbloquearCuenta", new { IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
    }

    public async Task ActualizarPasswordHashAsync(int idUsuario, string passwordHash)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Usuario_ActualizarPasswordHash",
            new { IdUsuario = idUsuario, PasswordHash = passwordHash },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<List<UsuarioModel>> ObtenerBloqueadosAsync()
    {
        using var conexion = _conexionFactory.CrearConexion();
        var resultado = await conexion.QueryAsync<UsuarioModel>(
            "sp_Usuario_ObtenerBloqueados", commandType: CommandType.StoredProcedure);
        return resultado.ToList();
    }

    public async Task ActualizarPerfilAsync(int idUsuario, string nombre, string? telefono, string? foto)
    {
        using var conexion = _conexionFactory.CrearConexion();
        await conexion.ExecuteAsync(
            "sp_Usuario_ActualizarPerfil",
            new { IdUsuario = idUsuario, Nombre = nombre, Telefono = telefono, Foto = foto },
            commandType: CommandType.StoredProcedure);
    }
}
