CREATE TABLE [dbo].[MovimientoInventario] (
    [IdMovimiento]   BIGINT        IDENTITY (1, 1) NOT NULL,
    [IdEquipo]       INT           NOT NULL,
    [IdUsuario]      INT           NOT NULL,
    [TipoMovimiento] VARCHAR (50)  NOT NULL,
    [EstadoAnterior] VARCHAR (30)  NULL,
    [EstadoNuevo]    VARCHAR (30)  NOT NULL,
    [Fecha]          DATETIME      CONSTRAINT [DF_MovimientoInventario_Fecha] DEFAULT (getdate()) NOT NULL,
    [Observacion]    VARCHAR (MAX) NULL,
    [Cantidad]       INT           CONSTRAINT [DF_MovimientoInventario_Cantidad] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_MovimientoInventario] PRIMARY KEY CLUSTERED ([IdMovimiento] ASC),
    CONSTRAINT [FK_MovimientoInventario_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_MovimientoInventario_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_MovimientoInventario_IdEquipo]
    ON [dbo].[MovimientoInventario]([IdEquipo] ASC);

