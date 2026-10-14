CREATE PROCEDURE sp_Alerta_Listar
    @IdAlerta   INT = NULL,
    @IdVendedor INT = NULL,   -- un vendedor solo ve sus alertas
    @Atendida   BIT = NULL    -- 0 = pendientes, 1 = atendidas, NULL = todas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.IdAlerta, a.IdSolicitud, a.Tipo, CAST(CASE WHEN a.Tipo = 'Final' THEN 1 ELSE 0 END AS BIT) AS Urgente,
           a.FechaAlerta, a.FechaVencimiento,
           DATEDIFF(DAY, CAST(GETDATE() AS DATE), a.FechaVencimiento) AS DiasRestantes,
           a.CorreoEnviado, a.FechaEnvio, a.ErrorEnvio,
           a.Atendida, a.FechaAtencion, a.NotaAtencion, ua.Nombre AS UsuarioAtencion,
           c.Empresa, e.NumeroSerie, s.Frecuencia, s.Banda, s.Estado AS EstadoSolicitud,
           a.IdVendedor, v.Nombre AS Vendedor
    FROM AlertaFrecuencia a
    INNER JOIN SolicitudFrecuencia s ON s.IdSolicitud = a.IdSolicitud
    INNER JOIN Cliente c ON c.IdCliente = s.IdCliente
    INNER JOIN Equipo e ON e.IdEquipo = s.IdEquipo
    INNER JOIN Usuario v ON v.IdUsuario = a.IdVendedor
    LEFT JOIN Usuario ua ON ua.IdUsuario = a.IdUsuarioAtencion
    WHERE (@IdAlerta IS NULL OR a.IdAlerta = @IdAlerta)
      AND (@IdVendedor IS NULL OR a.IdVendedor = @IdVendedor)
      AND (@Atendida IS NULL OR a.Atendida = @Atendida)
    ORDER BY a.Atendida, CASE WHEN a.Tipo = 'Final' THEN 0 ELSE 1 END, a.FechaVencimiento, a.IdAlerta;
END
