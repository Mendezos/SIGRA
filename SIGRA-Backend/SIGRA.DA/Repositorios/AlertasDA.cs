using System.Data;
using Dapper;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

// DAR-003, 018 y 019: alertas unificadas y vistas favoritas
public class AlertasDA(IConexionFactory factory) : IAlertasDA
{
    public async Task<ListadoAlertasDto> ListarAsync()
    {
        using var c = factory.CrearConexion();
        using var r = await c.QueryMultipleAsync("sp_Alertas_Unificadas", commandType: CommandType.StoredProcedure);
        return new ListadoAlertasDto
        {
            Alertas = (await r.ReadAsync<AlertaDto>()).ToList(),
            Atendidas = (await r.ReadAsync<AlertaAtendidaDto>()).ToList(),
        };
    }

    public async Task AtenderAsync(string clave, int idModulo, string titulo, string nota, int idUsuario)
    {
        using var c = factory.CrearConexion();
        await c.ExecuteAsync(
            """
            INSERT INTO dbo.AlertaAtencion (Clave, IdModulo, Titulo, Nota, IdUsuario)
            SELECT @clave, @idModulo, @titulo, @nota, @idUsuario
            WHERE NOT EXISTS (SELECT 1 FROM dbo.AlertaAtencion WHERE Clave = @clave)
            """, new { clave, idModulo, titulo, nota, idUsuario });
    }

    public async Task<List<VistaFavoritaDto>> ListarVistasAsync(int idUsuario)
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<VistaFavoritaDto>(
            "SELECT IdVista, Nombre, Filtros FROM dbo.AlertaVistaFavorita WHERE IdUsuario = @idUsuario ORDER BY Nombre", new { idUsuario })).ToList();
    }

    public async Task GuardarVistaAsync(int idUsuario, string nombre, string filtros)
    {
        using var c = factory.CrearConexion();
        // Guardar con un nombre que ya existe actualiza esa vista.
        await c.ExecuteAsync(
            """
            UPDATE dbo.AlertaVistaFavorita SET Filtros = @filtros WHERE IdUsuario = @idUsuario AND Nombre = @nombre;
            IF @@ROWCOUNT = 0
                INSERT INTO dbo.AlertaVistaFavorita (IdUsuario, Nombre, Filtros) VALUES (@idUsuario, @nombre, @filtros);
            """, new { idUsuario, nombre, filtros });
    }

    public async Task EliminarVistaAsync(int idUsuario, int idVista)
    {
        using var c = factory.CrearConexion();
        await c.ExecuteAsync("DELETE FROM dbo.AlertaVistaFavorita WHERE IdVista = @idVista AND IdUsuario = @idUsuario", new { idVista, idUsuario });
    }
}
