-- Equipos que se piensan alquilar en un contrato en borrador. No se asignan (ni se reservan en el inventario)
-- hasta que el contrato se activa con su documento firmado.
CREATE TABLE [dbo].[ContratoEquipoBorrador] (
    [IdContrato] INT NOT NULL,
    [IdEquipo]   INT NOT NULL,
    CONSTRAINT [PK_ContratoEquipoBorrador] PRIMARY KEY CLUSTERED ([IdContrato] ASC, [IdEquipo] ASC),
    CONSTRAINT [FK_ContratoEquipoBorrador_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [FK_ContratoEquipoBorrador_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo])
);
