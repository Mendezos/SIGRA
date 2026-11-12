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

    public async Task EditarAsync(int idCliente, EditarClienteDto dto)
    {
        using var c = factory.CrearConexion();
        c.Open();
        using var transaction = c.BeginTransaction();
        var existe = await c.ExecuteScalarAsync<int?>(
            "SELECT IdCliente FROM dbo.Cliente WHERE IdCliente = @idCliente",
            new { idCliente }, transaction);
        if (existe is null) throw new ReglaNegocioException("El cliente indicado no existe.");

        var duplicado = await c.ExecuteScalarAsync<int?>(
            """
            SELECT TOP 1 IdCliente
            FROM dbo.Cliente
            WHERE IdCliente <> @idCliente
              AND (Empresa = @Empresa OR (@Correo IS NOT NULL AND Correo = @Correo))
            """,
            new { idCliente, dto.Empresa, dto.Correo }, transaction);
        if (duplicado is not null)
            throw new ReglaNegocioException("Ya existe otro cliente con la misma empresa o correo.");

        await c.ExecuteAsync(
            """
            UPDATE dbo.Cliente
            SET Empresa = @Empresa, Contacto = @Contacto, Correo = @Correo,
                Telefono = @Telefono, Sector = @Sector, Direccion = @Direccion,
                TamanoFlota = @TamanoFlota
            WHERE IdCliente = @idCliente
            """, new
            {
                idCliente,
                dto.Empresa,
                dto.Contacto,
                dto.Correo,
                dto.Telefono,
                dto.Sector,
                dto.Direccion,
                dto.TamanoFlota
            }, transaction);
        transaction.Commit();
    }

    public async Task<(bool Cambio, List<string> Obligaciones)> CambiarEstadoAsync(
        int idCliente, bool activo, string? motivo, int idUsuario)
    {
        using var c = factory.CrearConexion();
        c.Open();
        using var transaction = c.BeginTransaction();
        var estado = await c.QuerySingleOrDefaultAsync<(bool Activo, string? Motivo)>(
            "SELECT Activo, MotivoInactivacion AS Motivo FROM dbo.Cliente WHERE IdCliente = @idCliente",
            new { idCliente }, transaction);
        if (estado == default) throw new ReglaNegocioException("El cliente indicado no existe.");
        if (estado.Activo == activo) return (false, new List<string>());

        var obligaciones = new List<string>();
        if (!activo)
        {
            var contratos = await c.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM dbo.Contrato WHERE IdCliente = @idCliente AND Estado = 'Activo'",
                new { idCliente }, transaction);
            if (contratos > 0) obligaciones.Add($"{contratos} contrato(s) activo(s)");

            var facturas = await c.ExecuteScalarAsync<int>(
                """
                SELECT COUNT(1) FROM dbo.Factura
                WHERE IdCliente = @idCliente AND EstadoCobro IN ('Pendiente', 'Parcial', 'Vencida')
                """, new { idCliente }, transaction);
            if (facturas > 0) obligaciones.Add($"{facturas} factura(s) con cobro pendiente");

            if (obligaciones.Count > 0) return (false, obligaciones);
            if (string.IsNullOrWhiteSpace(motivo))
                throw new ReglaNegocioException("Indique el motivo de la desactivación.");
        }

        await c.ExecuteAsync(
            """
            UPDATE dbo.Cliente
            SET Activo = @activo,
                MotivoInactivacion = CASE WHEN @activo = 1 THEN NULL ELSE @motivo END,
                FechaInactivacion = CASE WHEN @activo = 1 THEN NULL ELSE SYSUTCDATETIME() END,
                IdUsuarioInactiva = CASE WHEN @activo = 1 THEN NULL ELSE @idUsuario END
            WHERE IdCliente = @idCliente
            """,
            new { idCliente, activo, motivo, idUsuario }, transaction);
        transaction.Commit();
        return (true, obligaciones);
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
