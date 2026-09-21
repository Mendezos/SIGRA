using Dapper;
using Microsoft.AspNetCore.Mvc;
using SIGRA.Abstracciones.Conexion;

namespace SIGRA.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PingController : ControllerBase
{
    private readonly IConexionFactory _conexionFactory;

    public PingController(IConexionFactory conexionFactory)
    {
        _conexionFactory = conexionFactory;
    }

    // GET api/ping/db
    [HttpGet("db")]
    public async Task<IActionResult> ProbarConexionBaseDatos()
    {
        using var conexion = _conexionFactory.CrearConexion();
        var totalRoles = await conexion.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Rol");
        return Ok(new { conectado = true, totalRoles });
    }
}