CREATE TABLE [dbo].[Contrato] (
    [IdContrato]       INT             IDENTITY (1, 1) NOT NULL,
    [IdCliente]        INT             NOT NULL,
    [Estado]           VARCHAR (30)    CONSTRAINT [DF_Contrato_Estado] DEFAULT ('Activo') NOT NULL,
    [FechaInicio]      DATE            NOT NULL,
    [FechaVencimiento] DATE            NOT NULL,
    [MontoMensual]     DECIMAL (12, 2) NOT NULL,
    [Condiciones]      VARCHAR (MAX)   NULL,
    [CubreReparaciones] BIT CONSTRAINT [DF_Contrato_CubreReparaciones] DEFAULT (0) NOT NULL,
    [IdVendedor]       INT             NULL,
    [MotivoCancelacion] VARCHAR (300)  NULL,
    [FechaCancelacion] DATE            NULL,
    [IdPlantilla]      INT             NULL,
    [VersionPlantilla] INT             NULL,
    [Moneda]           CHAR (3)        CONSTRAINT [DF_Contrato_Moneda] DEFAULT ('CRC') NOT NULL,
    [FechaFirma]       DATE            NULL,
    [ClausulasAdicionales] VARCHAR (MAX) NULL,
    [Responsabilidades] VARCHAR (MAX)  NULL,
    [Penalizacion]     VARCHAR (MAX)   NULL,
    [IdContratoOrigen] INT             NULL,
    [PenalizacionMonto] DECIMAL (12, 2) NULL,
    [PenalizacionJustificacion] VARCHAR (300) NULL,
    [ObservacionesCancelacion] VARCHAR (500) NULL,
    [ContenidoContrato] VARCHAR (MAX)  NULL,
    [FechaActivacion]  DATETIME2 (0)   NULL,
    [IdUsuarioActiva]  INT             NULL,
    CONSTRAINT [PK_Contrato] PRIMARY KEY CLUSTERED ([IdContrato] ASC),
    CONSTRAINT [CK_Contrato_Fechas] CHECK ([FechaVencimiento]>[FechaInicio]),
    CONSTRAINT [CK_Contrato_Monto] CHECK ([MontoMensual]>=(0)),
    CONSTRAINT [CK_Contrato_Moneda] CHECK ([Moneda] IN ('CRC', 'USD')),
    CONSTRAINT [FK_Contrato_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_Contrato_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_Contrato_Plantilla] FOREIGN KEY ([IdPlantilla]) REFERENCES [dbo].[PlantillaContrato] ([IdPlantilla]),
    CONSTRAINT [FK_Contrato_UsuarioActiva] FOREIGN KEY ([IdUsuarioActiva]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_Contrato_Estado]
    ON [dbo].[Contrato]([Estado] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Contrato_IdCliente]
    ON [dbo].[Contrato]([IdCliente] ASC);

