-- Modelos de batería del catálogo (ModeloEquipo cuya categoría es "Batería"), para el formulario de recordatorios de baterías.
CREATE PROCEDURE [dbo].[sp_CrmBateria_Modelos]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT m.IdModelo, m.Marca, m.Modelo, CAST(m.Marca + ' ' + m.Modelo AS VARCHAR(201)) AS Nombre
    FROM ModeloEquipo m
    INNER JOIN CategoriaEquipo c ON c.IdCategoria = m.IdCategoria
    WHERE c.Nombre COLLATE Latin1_General_CI_AI = 'Bateria'
    ORDER BY m.Marca, m.Modelo;
END
