using SIGRA.Abstracciones.Dtos;
using SIGRA.Abstracciones.Excepciones;
using SIGRA.Abstracciones.Flujo;
using SIGRA.Abstracciones.Interfaces.InterfacesDA;

namespace SIGRA.Flujo.Flujos;

public class InventarioFlujo : IInventarioFlujo
{
    private const string ModuloAuditoria = "Inventario";
    private const int MaxLongitudFoto = 4_000_000;

    public static readonly string[] EstadosEquipo =
    {
        "Disponible", "Alquilado", "En mantenimiento", "En reparación", "En garantía", "Dado de baja"
    };

    private static readonly string[] Propietarios = { "Radifax", "Cliente" };
    private static readonly string[] TiposEntrada = { "Compra", "Devolución de cliente", "Equipo reparado" };
    private static readonly string[] TiposSalida = { "Pérdida" };

    private readonly IInventarioDA _inventarioDA;
    private readonly IAuditoriaDA _auditoriaDA;

    public InventarioFlujo(IInventarioDA inventarioDA, IAuditoriaDA auditoriaDA)
    {
        _inventarioDA = inventarioDA;
        _auditoriaDA = auditoriaDA;
    }

    public Task<List<CategoriaDto>> ListarCategoriasAsync() => _inventarioDA.ListarCategoriasAsync();

    public Task<List<ProveedorDto>> ListarProveedoresAsync() => _inventarioDA.ListarProveedoresAsync();

    public Task<List<ModeloDto>> ListarModelosAsync(int? idCategoria) => _inventarioDA.ListarModelosAsync(idCategoria);

    // ---------- INVE-001: registrar equipo ----------
    public async Task<int> RegistrarEquipoAsync(RegistrarEquipoDto dto, int idUsuario)
    {
        var faltantes = new List<string>();
        if (dto.IdCategoria is null) faltantes.Add("Categoría");
        if (string.IsNullOrWhiteSpace(dto.Marca)) faltantes.Add("Marca");
        if (string.IsNullOrWhiteSpace(dto.Modelo)) faltantes.Add("Modelo");
        if (string.IsNullOrWhiteSpace(dto.NumeroSerie)) faltantes.Add("Número de serie");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar el equipo.", faltantes);

        if (dto.CostoCompra is null || dto.CostoCompra < 0)
            throw new ReglaNegocioException("El costo de compra debe ser un valor numérico mayor o igual a cero.");

        var pendientes = new List<string>();
        if (dto.IdProveedor is null) pendientes.Add("Proveedor");
        if (dto.FechaAdquisicion is null) pendientes.Add("Fecha de adquisición");
        if (pendientes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios para registrar el equipo.", pendientes);

        if (dto.FechaAdquisicion!.Value.Date > DateTime.Today)
            throw new ReglaNegocioException("La fecha de adquisición no puede ser futura.");

        var propietario = string.IsNullOrWhiteSpace(dto.Propietario) ? "Radifax" : dto.Propietario.Trim();
        if (!Propietarios.Contains(propietario))
            throw new ReglaNegocioException("El propietario debe ser Radifax o Cliente.");

        var marca = dto.Marca!.Trim();
        var modelo = dto.Modelo!.Trim();
        var serie = dto.NumeroSerie!.Trim();
        if (marca.Length > 100 || modelo.Length > 100 || serie.Length > 50)
            throw new ReglaNegocioException("Marca, modelo o número de serie exceden la longitud permitida.");

        if (!string.IsNullOrWhiteSpace(dto.Foto))
        {
            if (!dto.Foto.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
                throw new ReglaNegocioException("La fotografía debe ser una imagen válida.");
            if (dto.Foto.Length > MaxLongitudFoto)
                throw new ReglaNegocioException("La fotografía es demasiado grande. Use una imagen de menos de 2 MB.");
        }

        var categorias = await _inventarioDA.ListarCategoriasAsync();
        var categoria = categorias.FirstOrDefault(c => c.IdCategoria == dto.IdCategoria)
            ?? throw new ReglaNegocioException("La categoría indicada no existe.");

        var proveedores = await _inventarioDA.ListarProveedoresAsync();
        if (!proveedores.Any(p => p.IdProveedor == dto.IdProveedor))
            throw new ReglaNegocioException("El proveedor indicado no existe.");

        var cantidad = 1;
        if (categoria.ManejaCantidad)
        {
            cantidad = dto.Cantidad ?? 0;
            if (cantidad < 1)
                throw new ReglaNegocioException("Indique la cantidad en stock inicial (mínimo 1) para esta categoría.");
        }

        if (await _inventarioDA.ExisteEquipoPorSerieAsync(serie))
            throw new ReglaNegocioException("Ya existe un equipo registrado con ese número de serie.");

        var idEquipo = await _inventarioDA.InsertarEquipoAsync(
            dto.IdCategoria!.Value, marca, modelo, Normalizar(dto.DescripcionTecnica), dto.IdProveedor!.Value, serie,
            propietario, Normalizar(dto.Ubicacion), dto.FechaAdquisicion.Value.Date, dto.CostoCompra.Value,
            string.IsNullOrWhiteSpace(dto.Foto) ? null : dto.Foto, cantidad, idUsuario);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Equipo", idEquipo, "EQUIPO_REGISTRADO",
            $"{marca} {modelo} - serie {serie}");

        return idEquipo;
    }

    // ---------- INVE-010: búsqueda previa ----------
    public async Task<bool> ExisteSerieAsync(string numeroSerie)
    {
        if (string.IsNullOrWhiteSpace(numeroSerie)) return false;
        return await _inventarioDA.ExisteEquipoPorSerieAsync(numeroSerie.Trim());
    }

    public Task<List<EquipoListaDto>> ListarEquiposAsync(string? texto, int? idCategoria, string? estado)
    {
        if (!string.IsNullOrWhiteSpace(estado) && !EstadosEquipo.Contains(estado))
            throw new ReglaNegocioException("El estado indicado no es válido.");

        return _inventarioDA.ListarEquiposAsync(Normalizar(texto), idCategoria, Normalizar(estado));
    }

    // ---------- INVE-002: ficha ----------
    public async Task<FichaEquipoDto> ObtenerFichaPorSerieAsync(string numeroSerie)
    {
        var equipo = string.IsNullOrWhiteSpace(numeroSerie)
            ? null
            : await _inventarioDA.ObtenerEquipoAsync(null, numeroSerie.Trim());

        if (equipo is null)
            throw new ReglaNegocioException("No se encontró ningún equipo con ese número de serie.");

        return await ArmarFichaAsync(equipo);
    }

    public async Task<FichaEquipoDto> ObtenerFichaPorIdAsync(int idEquipo)
    {
        var equipo = await _inventarioDA.ObtenerEquipoAsync(idEquipo, null)
            ?? throw new ReglaNegocioException("El equipo indicado no existe.");

        return await ArmarFichaAsync(equipo);
    }

    private async Task<FichaEquipoDto> ArmarFichaAsync(EquipoDetalleDto equipo) => new()
    {
        Equipo = equipo,
        Historial = await _inventarioDA.ObtenerHistorialAsync(equipo.IdEquipo)
    };

    // ---------- INVE-003: cambio de estado y baja ----------
    public async Task<FichaEquipoDto> CambiarEstadoAsync(int idEquipo, CambiarEstadoEquipoDto dto, int idUsuario)
    {
        var equipo = await _inventarioDA.ObtenerEquipoAsync(idEquipo, null)
            ?? throw new ReglaNegocioException("El equipo indicado no existe.");

        if (string.IsNullOrWhiteSpace(dto.Estado) || !EstadosEquipo.Contains(dto.Estado))
            throw new ReglaNegocioException("Seleccione uno de los estados permitidos: " + string.Join(", ", EstadosEquipo) + ".");

        if (equipo.Estado == "Dado de baja")
            throw new ReglaNegocioException("Un equipo dado de baja no puede cambiar de estado.");

        if (equipo.Estado == dto.Estado)
            throw new ReglaNegocioException($"El equipo ya se encuentra en estado \"{dto.Estado}\".");

        var motivo = Normalizar(dto.Motivo);
        var esBaja = dto.Estado == "Dado de baja";

        if (esBaja)
        {
            if (await _inventarioDA.TieneContratoActivoAsync(idEquipo))
                throw new ReglaNegocioException("No se puede dar de baja un equipo asignado a un contrato de alquiler activo.");
            if (motivo is null)
                throw new ReglaNegocioException("Debe indicar el motivo de la baja del equipo.");
        }

        await _inventarioDA.CambiarEstadoAsync(idEquipo, dto.Estado, idUsuario,
            esBaja ? "Baja" : "Cambio de estado", motivo, esBaja ? motivo : null);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Equipo", idEquipo,
            esBaja ? "EQUIPO_DADO_DE_BAJA" : "EQUIPO_ESTADO_CAMBIADO",
            $"{equipo.NumeroSerie}: {equipo.Estado} -> {dto.Estado}" + (motivo is null ? "" : $". {motivo}"));

        return await ObtenerFichaPorIdAsync(idEquipo);
    }

    // ---------- INVE-003: entradas y salidas ----------
    public async Task<FichaEquipoDto> RegistrarEntradaAsync(RegistrarMovimientoEquipoDto dto, int idUsuario)
    {
        if (string.IsNullOrWhiteSpace(dto.TipoMovimiento))
            throw new ReglaNegocioException("Debe seleccionar el tipo de movimiento de la entrada.");
        if (!TiposEntrada.Contains(dto.TipoMovimiento))
            throw new ReglaNegocioException("El tipo de movimiento de entrada no es válido.");

        var equipo = await ObtenerEquipoParaMovimientoAsync(dto);
        var observacion = Normalizar(dto.Observacion);

        if (equipo.Estado == "Dado de baja")
            throw new ReglaNegocioException("El equipo está dado de baja y no admite movimientos.");

        if (dto.TipoMovimiento == "Compra")
        {
            if (!equipo.ManejaCantidad)
                throw new ReglaNegocioException("Los equipos individuales se registran desde \"Registrar equipo\"; la compra por cantidad aplica a accesorios, repuestos y baterías.");

            var cantidad = dto.Cantidad ?? 0;
            if (cantidad < 1)
                throw new ReglaNegocioException("Indique la cantidad recibida (mínimo 1).");

            await _inventarioDA.AjustarCantidadAsync(equipo.IdEquipo, cantidad, idUsuario, "Compra", observacion);
        }
        else
        {
            var estadosOrigen = dto.TipoMovimiento == "Devolución de cliente"
                ? new[] { "Alquilado" }
                : new[] { "En mantenimiento", "En reparación", "En garantía" };

            if (!estadosOrigen.Contains(equipo.Estado))
                throw new ReglaNegocioException(dto.TipoMovimiento == "Devolución de cliente"
                    ? $"Solo se puede registrar la devolución de un equipo alquilado (estado actual: {equipo.Estado})."
                    : $"Solo se puede registrar la entrada de un equipo que esté en taller (estado actual: {equipo.Estado}).");

            await _inventarioDA.CambiarEstadoAsync(equipo.IdEquipo, "Disponible", idUsuario, dto.TipoMovimiento, observacion, null);
        }

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Equipo", equipo.IdEquipo, "INVENTARIO_ENTRADA",
            $"{equipo.NumeroSerie}: {dto.TipoMovimiento}");

        return await ObtenerFichaPorIdAsync(equipo.IdEquipo);
    }

    public async Task<FichaEquipoDto> RegistrarSalidaAsync(RegistrarMovimientoEquipoDto dto, int idUsuario)
    {
        if (string.IsNullOrWhiteSpace(dto.TipoMovimiento))
            throw new ReglaNegocioException("Debe seleccionar el tipo de movimiento de la salida.");
        if (!TiposSalida.Contains(dto.TipoMovimiento))
            throw new ReglaNegocioException("El tipo de movimiento de salida no es válido.");

        var equipo = await ObtenerEquipoParaMovimientoAsync(dto);

        if (equipo.Estado != "Disponible")
            throw new ReglaNegocioException("El equipo no se encuentra disponible para registrar una salida.");

        var circunstancias = Normalizar(dto.Observacion)
            ?? throw new ReglaNegocioException("Indique las circunstancias reportadas de la pérdida.");

        if (equipo.ManejaCantidad)
        {
            var cantidad = dto.Cantidad ?? 0;
            if (cantidad < 1 || cantidad > equipo.Cantidad)
                throw new ReglaNegocioException($"La cantidad debe estar entre 1 y {equipo.Cantidad}.");

            await _inventarioDA.AjustarCantidadAsync(equipo.IdEquipo, -cantidad, idUsuario, "Pérdida", circunstancias);
        }
        else
        {
            await _inventarioDA.CambiarEstadoAsync(equipo.IdEquipo, "Dado de baja", idUsuario, "Pérdida", circunstancias,
                $"Pérdida: {circunstancias}");
        }

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "Equipo", equipo.IdEquipo, "INVENTARIO_SALIDA",
            $"{equipo.NumeroSerie}: Pérdida. {circunstancias}");

        return await ObtenerFichaPorIdAsync(equipo.IdEquipo);
    }

    private async Task<EquipoDetalleDto> ObtenerEquipoParaMovimientoAsync(RegistrarMovimientoEquipoDto dto)
    {
        if (dto.IdEquipo is null)
            throw new ValidacionException("Debe completar los campos obligatorios.", new List<string> { "Equipo" });

        return await _inventarioDA.ObtenerEquipoAsync(dto.IdEquipo, null)
            ?? throw new ReglaNegocioException("El equipo indicado no existe.");
    }

    public Task<List<MovimientoDto>> ListarMovimientosAsync(int? idEquipo, string? tipo) =>
        _inventarioDA.ListarMovimientosAsync(idEquipo, Normalizar(tipo));

    // ---------- INVE-004 / INVE-005: stock ----------
    public Task<List<StockCategoriaDto>> StockPorCategoriaAsync() => _inventarioDA.StockPorCategoriaAsync();

    public Task<List<StockModeloDto>> StockPorModeloAsync(int? idCategoria) => _inventarioDA.StockPorModeloAsync(idCategoria);

    public async Task GuardarStockMinimoAsync(int idCategoria, GuardarStockMinimoDto dto, int idUsuario)
    {
        if (dto.CantidadMinima is null || dto.CantidadMinima < 0)
            throw new ReglaNegocioException("El stock mínimo debe ser un número entero mayor o igual a cero.");

        var categoria = (await _inventarioDA.ListarCategoriasAsync()).FirstOrDefault(c => c.IdCategoria == idCategoria)
            ?? throw new ReglaNegocioException("La categoría indicada no existe.");

        await _inventarioDA.GuardarStockMinimoAsync(idCategoria, dto.CantidadMinima.Value);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, "StockMinimoCategoria", idCategoria, "STOCK_MINIMO_DEFINIDO",
            $"{categoria.Nombre}: {categoria.CantidadMinima} -> {dto.CantidadMinima}");
    }

    // ---------- INVE-008: accesorios y repuestos ----------
    public Task<List<ArticuloBodegaDto>> ListarArticulosAsync(string tipo) => _inventarioDA.ListarArticulosAsync(tipo);

    public async Task<int> CrearArticuloAsync(string tipo, GuardarArticuloBodegaDto dto, int idUsuario)
    {
        var (idModelo, nombre, cantidad) = await ValidarArticuloAsync(dto);

        if (await _inventarioDA.ExisteArticuloAsync(tipo, idModelo, nombre, null))
            throw new ReglaNegocioException($"Ya existe {EtiquetaArticulo(tipo)} con ese nombre para el modelo seleccionado.");

        var id = await _inventarioDA.InsertarArticuloAsync(tipo, idModelo, nombre, cantidad);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, tipo == "repuesto" ? "Repuesto" : "AccesorioModelo", id,
            tipo == "repuesto" ? "REPUESTO_REGISTRADO" : "ACCESORIO_REGISTRADO", $"{nombre} x{cantidad}");

        return id;
    }

    public async Task EditarArticuloAsync(string tipo, int id, GuardarArticuloBodegaDto dto, int idUsuario)
    {
        var (idModelo, nombre, cantidad) = await ValidarArticuloAsync(dto);

        var existentes = await _inventarioDA.ListarArticulosAsync(tipo);
        if (!existentes.Any(a => a.Id == id))
            throw new ReglaNegocioException("El registro indicado no existe.");

        if (await _inventarioDA.ExisteArticuloAsync(tipo, idModelo, nombre, id))
            throw new ReglaNegocioException($"Ya existe {EtiquetaArticulo(tipo)} con ese nombre para el modelo seleccionado.");

        await _inventarioDA.EditarArticuloAsync(tipo, id, nombre, cantidad);

        await _auditoriaDA.RegistrarAsync(idUsuario, ModuloAuditoria, tipo == "repuesto" ? "Repuesto" : "AccesorioModelo", id,
            tipo == "repuesto" ? "REPUESTO_EDITADO" : "ACCESORIO_EDITADO", $"{nombre} x{cantidad}");
    }

    private async Task<(int idModelo, string nombre, int cantidad)> ValidarArticuloAsync(GuardarArticuloBodegaDto dto)
    {
        var faltantes = new List<string>();
        if (dto.IdModelo is null) faltantes.Add("Modelo compatible");
        if (string.IsNullOrWhiteSpace(dto.Nombre)) faltantes.Add("Nombre");
        if (dto.Cantidad is null) faltantes.Add("Cantidad");
        if (faltantes.Count > 0)
            throw new ValidacionException("Debe completar los campos obligatorios.", faltantes);

        if (dto.Cantidad < 0)
            throw new ReglaNegocioException("La cantidad disponible debe ser un número entero mayor o igual a cero.");

        var nombre = dto.Nombre!.Trim();
        if (nombre.Length > 100)
            throw new ReglaNegocioException("El nombre no puede superar los 100 caracteres.");

        if (!await _inventarioDA.ExisteModeloAsync(dto.IdModelo!.Value))
            throw new ReglaNegocioException("El modelo indicado no existe.");

        return (dto.IdModelo.Value, nombre, dto.Cantidad!.Value);
    }

    private static string EtiquetaArticulo(string tipo) => tipo == "repuesto" ? "un repuesto" : "un accesorio";

    private static string? Normalizar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
