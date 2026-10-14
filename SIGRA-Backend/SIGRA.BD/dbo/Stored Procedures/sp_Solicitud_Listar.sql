CREATE PROCEDURE sp_Solicitud_Listar
    @IdSolicitud INT = NULL,
    @Texto       VARCHAR(100) = NULL,   -- búsqueda libre: cliente, repetidora, frecuencia, zona, resolución, vendedor o código SF-0000
    @Estado      VARCHAR(30) = NULL,
    @IdVendedor  INT = NULL,            -- vendedor responsable (un vendedor solo ve las suyas)
    @Cliente     VARCHAR(150) = NULL,   -- nombre de la empresa (coincidencia parcial)
    @Zona        VARCHAR(200) = NULL    -- zona geográfica de cobertura (coincidencia parcial)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT s.IdSolicitud, s.IdCliente, c.Empresa, s.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo,
           s.Frecuencia, s.Banda, s.Potencia, s.ZonaCobertura, s.FechaPresentacion, s.Estado,
           s.FechaSolicitud AS FechaRegistro, s.FechaOtorgamiento, s.NumeroResolucion, s.FechaVencimiento,
           CASE WHEN s.FechaVencimiento IS NULL THEN NULL
                ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), s.FechaVencimiento) END AS DiasParaVencer,
           s.IdSolicitudOrigen, ren.IdSolicitud AS IdSolicitudRenovacion, ren.Estado AS EstadoRenovacion,
           s.FechaCancelacion, s.MotivoCancelacion, uc.Nombre AS UsuarioCancelacion,
           s.IdUsuario AS IdVendedor, v.Nombre AS Vendedor,
           (SELECT COUNT(*) FROM DocumentoFrecuencia d WHERE d.IdSolicitud = s.IdSolicitud AND d.Contenido IS NOT NULL) AS CantidadDocumentos
    FROM SolicitudFrecuencia s
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN Usuario v ON v.IdUsuario = s.IdUsuario
    LEFT JOIN Usuario uc ON uc.IdUsuario = s.IdUsuarioCancelacion
    -- Una renovación cancelada ya no cuenta como renovación iniciada.
    OUTER APPLY (SELECT TOP 1 r.IdSolicitud, r.Estado FROM SolicitudFrecuencia r
                 WHERE r.IdSolicitudOrigen = s.IdSolicitud AND r.Estado <> 'Cancelada' ORDER BY r.IdSolicitud DESC) ren
    WHERE (@IdSolicitud IS NULL OR s.IdSolicitud = @IdSolicitud)
      AND (@Estado IS NULL OR s.Estado = @Estado)
      AND (@IdVendedor IS NULL OR s.IdUsuario = @IdVendedor)
      AND (@Cliente IS NULL OR c.Empresa LIKE '%' + @Cliente + '%')
      AND (@Zona IS NULL OR s.ZonaCobertura LIKE '%' + @Zona + '%')
      AND (@Texto IS NULL OR c.Empresa LIKE '%' + @Texto + '%' OR e.NumeroSerie LIKE '%' + @Texto + '%'
           OR s.Frecuencia LIKE '%' + @Texto + '%' OR s.ZonaCobertura LIKE '%' + @Texto + '%'
           OR s.NumeroResolucion LIKE '%' + @Texto + '%' OR v.Nombre LIKE '%' + @Texto + '%'
           OR 'SF-' + RIGHT('0000' + CAST(s.IdSolicitud AS VARCHAR(10)), 4) LIKE '%' + @Texto + '%')
    ORDER BY s.IdSolicitud DESC;
END
