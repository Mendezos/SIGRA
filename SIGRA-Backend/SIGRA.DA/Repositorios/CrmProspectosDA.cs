using Dapper;
using Microsoft.Data.SqlClient;
using SIGRA.Abstracciones.Conexion;
using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;
using System.Data;

namespace SIGRA.DA.Repositorios;

// CRMGPSC-001 a 007: prospectos y contactos de empresa
public class CrmProspectosDA(IConexionFactory factory) : ICrmProspectosDA
{
    // Los SP lanzan THROW 50001 cuando una regla de negocio falla (por ejemplo, un duplicado o un prospecto en estado final).
    private const int CodigoReglaNegocio = 50001;

    private async Task<List<T>> ConsultarAsync<T>(string sp, object? parametros = null)
    {
        using var c = factory.CrearConexion();
        try
        {
            return (await c.QueryAsync<T>(sp, parametros, commandType: CommandType.StoredProcedure)).ToList();
        }
        catch (SqlException ex) when (ex.Number == CodigoReglaNegocio)
        {
            throw new ReglaNegocioException(ex.Message);
        }
    }

    private async Task<T?> PrimeroAsync<T>(string sp, object? parametros = null) => (await ConsultarAsync<T>(sp, parametros)).FirstOrDefault();

    private async Task<T> UnicoAsync<T>(string sp, object parametros) =>
        (await ConsultarAsync<T>(sp, parametros)).FirstOrDefault() ?? throw new InvalidOperationException($"El procedimiento {sp} no devolvió resultados.");

    // ---------- Prospectos ----------
    public Task<List<ProspectoDto>> ListarProspectosAsync(string? empresa, string? sector, string? fuente, string? estado, int? idVendedor, DateTime? fechaDesde, DateTime? fechaHasta) =>
        ConsultarAsync<ProspectoDto>("sp_CrmProspecto_Listar", new
        {
            Empresa = empresa,
            Sector = sector,
            Fuente = fuente,
            Estado = estado,
            IdVendedor = idVendedor,
            FechaDesde = fechaDesde?.Date,
            FechaHasta = fechaHasta?.Date
        });

    public Task<ProspectoDto?> ObtenerProspectoAsync(int idProspecto) =>
        PrimeroAsync<ProspectoDto>("sp_CrmProspecto_Obtener", new { IdProspecto = idProspecto });

    public async Task<ProspectoDetalleDto?> ObtenerDetalleProspectoAsync(int idProspecto, int idUsuario)
    {
        using var c = factory.CrearConexion();
        using var multiple = await c.QueryMultipleAsync("sp_CrmProspecto_Detalle", new { IdProspecto = idProspecto, IdUsuario = idUsuario },
            commandType: CommandType.StoredProcedure);

        var prospecto = (await multiple.ReadAsync<ProspectoDto>()).FirstOrDefault();
        if (prospecto is null) return null;

        return new ProspectoDetalleDto
        {
            Prospecto = prospecto,
            Contactos = (await multiple.ReadAsync<ProspectoContactoDto>()).ToList(),
            Cotizaciones = (await multiple.ReadAsync<ProspectoCotizacionDto>()).ToList(),
            Notas = (await multiple.ReadAsync<ProspectoNotaDto>()).ToList(),
            Interacciones = (await multiple.ReadAsync<ProspectoInteraccionDto>()).ToList(),
            Seguimientos = (await multiple.ReadAsync<ProspectoSeguimientoDto>()).ToList(),
            CambiosEstado = (await multiple.ReadAsync<ProspectoCambioEstadoDto>()).ToList()
        };
    }

    public Task<List<CoincidenciaProspectoDto>> BuscarCoincidenciasAsync(string? empresa, string? correo, string? telefono, int? excluirProspecto) =>
        ConsultarAsync<CoincidenciaProspectoDto>("sp_CrmProspecto_Coincidencias",
            new { Empresa = empresa, Correo = correo, Telefono = telefono, ExcluirProspecto = excluirProspecto });

    public async Task<int> InsertarProspectoAsync(string empresa, string? contacto, string? correo, string? telefono, string? sector, string? direccion,
        int? tamanoFlota, string? fuente, int idVendedor, bool confirmarDuplicado, string? justificacionDuplicado, int idUsuario) =>
        (await UnicoAsync<ResultadoIdDto>("sp_CrmProspecto_Insertar", new
        {
            Empresa = empresa,
            Contacto = contacto,
            Correo = correo,
            Telefono = telefono,
            Sector = sector,
            Direccion = direccion,
            TamanoFlota = tamanoFlota,
            Fuente = fuente,
            IdVendedor = idVendedor,
            ConfirmarDuplicado = confirmarDuplicado,
            JustificacionDuplicado = justificacionDuplicado,
            IdUsuario = idUsuario
        })).IdProspecto;

    public Task<ProspectoAnteriorDto> EditarProspectoAsync(int idProspecto, string empresa, string? contacto, string? correo, string? telefono, string? sector,
        string? direccion, int? tamanoFlota, string? fuente, int? idVendedor, int idUsuario) =>
        UnicoAsync<ProspectoAnteriorDto>("sp_CrmProspecto_Editar", new
        {
            IdProspecto = idProspecto,
            Empresa = empresa,
            Contacto = contacto,
            Correo = correo,
            Telefono = telefono,
            Sector = sector,
            Direccion = direccion,
            TamanoFlota = tamanoFlota,
            Fuente = fuente,
            IdVendedor = idVendedor,
            IdUsuario = idUsuario
        });

    public Task<ProspectoAccionFilaDto> DescartarProspectoAsync(int idProspecto, string motivo, DateTime fecha, string? observacion, int idUsuario) =>
        UnicoAsync<ProspectoAccionFilaDto>("sp_CrmProspecto_Descartar",
            new { IdProspecto = idProspecto, Motivo = motivo, Fecha = fecha.Date, Observacion = observacion, IdUsuario = idUsuario });

    public Task<ProspectoAccionFilaDto> ReactivarProspectoAsync(int idProspecto, string estadoInicial, DateTime fechaHoraSeguimiento, int? idVendedor, int idUsuario) =>
        UnicoAsync<ProspectoAccionFilaDto>("sp_CrmProspecto_Reactivar", new
        {
            IdProspecto = idProspecto,
            EstadoInicial = estadoInicial,
            FechaHoraSeguim = fechaHoraSeguimiento,
            IdVendedor = idVendedor,
            IdUsuario = idUsuario
        });

    // ---------- Contactos de empresa ----------
    public Task<List<ContactoEmpresaDto>> ListarContactosAsync(string? tipo, int? idEmpresa, string? texto, bool? activo) =>
        ConsultarAsync<ContactoEmpresaDto>("sp_CrmContacto_Listar", new { Tipo = tipo, IdEmpresa = idEmpresa, Texto = texto, Activo = activo });

    public Task<ContactoEmpresaDto?> ObtenerContactoAsync(int idContactoEmpresa) =>
        PrimeroAsync<ContactoEmpresaDto>("sp_CrmContacto_Obtener", new { IdContactoEmpresa = idContactoEmpresa });

    public Task<List<CoincidenciaContactoDto>> BuscarCoincidenciasContactoAsync(string tipo, int idEmpresa, string? correo, string? telefono, int? excluirContacto) =>
        ConsultarAsync<CoincidenciaContactoDto>("sp_CrmContacto_Coincidencias",
            new { Tipo = tipo, IdEmpresa = idEmpresa, Correo = correo, Telefono = telefono, ExcluirContacto = excluirContacto });

    public async Task<int> InsertarContactoAsync(string tipo, int idEmpresa, string nombre, string? cargo, string? telefono, string? correo, DateTime? fechaCumpleanos,
        string preferenciaContacto, bool esPrincipal, bool confirmarCambioPrincipal, int idUsuario) =>
        (await UnicoAsync<ResultadoIdDto>("sp_CrmContacto_Insertar", new
        {
            Tipo = tipo,
            IdEmpresa = idEmpresa,
            Nombre = nombre,
            Cargo = cargo,
            Telefono = telefono,
            Correo = correo,
            FechaCumpleanos = fechaCumpleanos?.Date,
            PreferenciaContacto = preferenciaContacto,
            EsPrincipal = esPrincipal,
            ConfirmarCambioPrincipal = confirmarCambioPrincipal,
            IdUsuario = idUsuario
        })).IdContactoEmpresa;

    public Task<ContactoAnteriorDto> EditarContactoAsync(int idContactoEmpresa, string nombre, string? cargo, string? telefono, string? correo, DateTime? fechaCumpleanos,
        string preferenciaContacto, bool esPrincipal, bool confirmarCambioPrincipal, int idUsuario) =>
        UnicoAsync<ContactoAnteriorDto>("sp_CrmContacto_Editar", new
        {
            IdContactoEmpresa = idContactoEmpresa,
            Nombre = nombre,
            Cargo = cargo,
            Telefono = telefono,
            Correo = correo,
            FechaCumpleanos = fechaCumpleanos?.Date,
            PreferenciaContacto = preferenciaContacto,
            EsPrincipal = esPrincipal,
            ConfirmarCambioPrincipal = confirmarCambioPrincipal,
            IdUsuario = idUsuario
        });

    public Task<ContactoAccionFilaDto> DesactivarContactoAsync(int idContactoEmpresa, string motivo, int? idNuevoPrincipal, int idUsuario) =>
        UnicoAsync<ContactoAccionFilaDto>("sp_CrmContacto_Desactivar",
            new { IdContactoEmpresa = idContactoEmpresa, Motivo = motivo, IdNuevoPrincipal = idNuevoPrincipal, IdUsuario = idUsuario });

    public Task<ContactoAccionFilaDto> ReactivarContactoAsync(int idContactoEmpresa, int idUsuario) =>
        UnicoAsync<ContactoAccionFilaDto>("sp_CrmContacto_Reactivar", new { IdContactoEmpresa = idContactoEmpresa, IdUsuario = idUsuario });

    private class ResultadoIdDto
    {
        public int IdProspecto { get; set; }
        public int IdContactoEmpresa { get; set; }
    }
}
