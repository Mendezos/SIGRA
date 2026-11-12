using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.DA.Repositorios;

// CRMGPSC-019 a 021: conversión de prospectos, responsable comercial y perfil del cliente
public class CrmClientesDA(IConexionFactory factory) : ICrmClientesDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla.
    private const int CodigoReglaNegocio = 50001;

    public async Task<List<ClienteCrmDto>> ListarClientesAsync(string? texto, int? idVendedor, string? estado)
    {
        using var c = factory.CrearConexion();
        return (await c.QueryAsync<ClienteCrmDto>("sp_CrmCliente_Listar", new { Texto = texto, IdVendedor = idVendedor, Estado = estado },
            commandType: CommandType.StoredProcedure)).ToList();
    }

    public async Task<PerfilClienteDto?> ObtenerPerfilAsync(int idCliente, int idUsuario)
    {
        using var c = factory.CrearConexion();
        using var r = await c.QueryMultipleAsync("sp_CrmCliente_Perfil", new { IdCliente = idCliente, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
        var cliente = await r.ReadFirstOrDefaultAsync<ClienteEmpresaDto>();
        if (cliente is null) return null;

        return new PerfilClienteDto
        {
            Cliente = cliente,
            Contactos = { Items = (await r.ReadAsync<ProspectoContactoDto>()).ToList() },
            Responsables = { Items = (await r.ReadAsync<ResponsableCambioDto>()).ToList() },
            Ventas = { Items = (await r.ReadAsync<VentaClienteDto>()).ToList() },
            Equipos = { Items = (await r.ReadAsync<EquipoClienteDto>()).ToList() },
            Contratos = { Items = (await r.ReadAsync<ContratoClienteDto>()).ToList() },
            Frecuencias = { Items = (await r.ReadAsync<FrecuenciaClienteDto>()).ToList() },
            Tickets = { Items = (await r.ReadAsync<TicketClienteDto>()).ToList() },
            Facturas = { Items = (await r.ReadAsync<FacturaClienteDto>()).ToList() },
            Cotizaciones = { Items = (await r.ReadAsync<ProspectoCotizacionDto>()).ToList() },
            Notas = { Items = (await r.ReadAsync<ProspectoNotaDto>()).ToList() },
            Interacciones = { Items = (await r.ReadAsync<ProspectoInteraccionDto>()).ToList() },
            Seguimientos = { Items = (await r.ReadAsync<ProspectoSeguimientoDto>()).ToList() },
        };
    }

    public async Task<int> ConvertirProspectoAsync(int idProspecto, int? idClienteExistente, string producto, int cantidad, decimal monto, string moneda, DateTime fecha, int idUsuario)
    {
        using var c = factory.CrearConexion();
        try
        {
            return await c.ExecuteScalarAsync<int>("sp_CrmProspecto_Convertir", new
            {
                IdProspecto = idProspecto, IdUsuario = idUsuario, IdClienteExistente = idClienteExistente,
                Producto = producto, Cantidad = cantidad, Monto = monto, Moneda = moneda, Fecha = fecha.Date
            }, commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio) { throw new ReglaNegocioException(ex.Message); }
    }

    public async Task<AsignarResponsableResultadoDto> AsignarResponsableAsync(string tipo, int idEmpresa, int idVendedor, string? motivo, int idUsuario)
    {
        using var c = factory.CrearConexion();
        try
        {
            var fila = await c.QuerySingleAsync<(bool Cambio, int? IdVendedorAnterior, int SeguimientosMovidos)>("sp_CrmResponsable_Asignar",
                new { Tipo = tipo, IdEmpresa = idEmpresa, IdVendedor = idVendedor, Motivo = motivo, IdUsuario = idUsuario }, commandType: CommandType.StoredProcedure);
            return new AsignarResponsableResultadoDto { Cambio = fila.Cambio, IdVendedorAnterior = fila.IdVendedorAnterior, SeguimientosMovidos = fila.SeguimientosMovidos };
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio) { throw new ReglaNegocioException(ex.Message); }
    }
}
