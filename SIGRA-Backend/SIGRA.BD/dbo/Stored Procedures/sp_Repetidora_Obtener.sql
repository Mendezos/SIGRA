CREATE PROCEDURE sp_Repetidora_Obtener
    @NumeroSerie VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Devuelve el equipo aunque no tenga contrato, para que el flujo pueda dar el mensaje de negocio adecuado.
    SELECT e.IdEquipo, e.NumeroSerie, m.Marca, m.Modelo, cat.Nombre AS Categoria, e.Estado,
           ce.IdContrato, cl.Empresa, ct.Estado AS EstadoContrato, ce.FechaAsignacion,
           CAST(CASE WHEN rd.IdEquipo IS NULL THEN 0 ELSE 1 END AS BIT) AS TieneFicha,
           CAST(ISNULL(rd.Facturable, 0) AS BIT) AS Facturable,
           rd.Frecuencia, rd.FrecuenciaRecepcion, rd.Potencia, rd.Accesorios, rd.DireccionInstalacion, rd.CoordenadasGPS,
           CASE WHEN ck.Completado IS NULL THEN N'Sin checklist' WHEN ck.Completado = 1 THEN N'Completo' ELSE N'Incompleto' END AS EstadoChecklist,
           rd.Clasificacion, rd.FechaRegistro, u.Nombre AS RegistradoPor
    FROM Equipo e
    INNER JOIN ModeloEquipo m ON m.IdModelo = e.IdModelo
    INNER JOIN CategoriaEquipo cat ON cat.IdCategoria = m.IdCategoria
    LEFT JOIN ContratoEquipo ce ON ce.IdEquipo = e.IdEquipo
        AND ce.IdContratoEquipo = (SELECT MAX(x.IdContratoEquipo) FROM ContratoEquipo x WHERE x.IdEquipo = e.IdEquipo)
    LEFT JOIN Contrato ct ON ct.IdContrato = ce.IdContrato
    LEFT JOIN Cliente cl ON cl.IdCliente = ct.IdCliente
    LEFT JOIN RepetidoraDetalle rd ON rd.IdEquipo = e.IdEquipo
    LEFT JOIN Usuario u ON u.IdUsuario = rd.IdUsuarioRegistro
    OUTER APPLY (SELECT TOP 1 c.Completado FROM ChecklistInstalacion c WHERE c.IdEquipo = e.IdEquipo ORDER BY c.IdChecklist DESC) ck
    WHERE e.NumeroSerie = @NumeroSerie;
END
