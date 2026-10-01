CREATE TABLE [dbo].[Equipo] (
    [IdEquipo]         INT             IDENTITY (1, 1) NOT NULL,
    [IdModelo]         INT             NOT NULL,
    [IdProveedor]      INT             NOT NULL,
    [NumeroSerie]      VARCHAR (50)    NOT NULL,
    [Estado]           VARCHAR (30)    CONSTRAINT [DF_Equipo_Estado] DEFAULT ('Disponible') NOT NULL,
    [Propietario]      VARCHAR (100)   CONSTRAINT [DF_Equipo_Propietario] DEFAULT ('Radifax') NOT NULL,
    [Ubicacion]        VARCHAR (150)   NULL,
    [FechaAdquisicion] DATE            NOT NULL,
    [CostoCompra]      DECIMAL (12, 2) NOT NULL,
    [FechaBaja]        DATE            NULL,
    CONSTRAINT [PK_Equipo] PRIMARY KEY CLUSTERED ([IdEquipo] ASC),
    CONSTRAINT [CK_Equipo_CostoCompra] CHECK ([CostoCompra]>=(0)),
    CONSTRAINT [CK_Equipo_FechaBaja] CHECK ([FechaBaja] IS NULL OR [FechaBaja]>=[FechaAdquisicion]),
    CONSTRAINT [CK_Equipo_Estado] CHECK ([Estado] IN ('Disponible', 'Asignado', 'En reparacion', 'Dado de baja')),
    CONSTRAINT [FK_Equipo_Modelo] FOREIGN KEY ([IdModelo]) REFERENCES [dbo].[ModeloEquipo] ([IdModelo]),
    CONSTRAINT [FK_Equipo_Proveedor] FOREIGN KEY ([IdProveedor]) REFERENCES [dbo].[Proveedor] ([IdProveedor]),
    CONSTRAINT [UQ_Equipo_NumeroSerie] UNIQUE NONCLUSTERED ([NumeroSerie] ASC)
);


GO
CREATE NONCLUSTERED INDEX [IX_Equipo_Estado]
    ON [dbo].[Equipo]([Estado] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Equipo_IdProveedor]
    ON [dbo].[Equipo]([IdProveedor] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Equipo_IdModelo]
    ON [dbo].[Equipo]([IdModelo] ASC);

