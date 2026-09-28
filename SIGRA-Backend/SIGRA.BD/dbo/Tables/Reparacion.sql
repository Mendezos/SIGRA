CREATE TABLE [dbo].[Reparacion] (
    [IdReparacion]         INT             IDENTITY (1, 1) NOT NULL,
    [IdTicket]             INT             NOT NULL,
    [TecnicoResponsable]   INT             NOT NULL,
    [Hallazgos]            VARCHAR (MAX)   NULL,
    [TrabajoRealizado]     VARCHAR (MAX)   NULL,
    [Resolucion]           VARCHAR (50)    NULL,
    [NumeroFactura]        VARCHAR (30)    NULL,
    [Monto]                DECIMAL (12, 2) NULL,
    [JustificacionTecnica] VARCHAR (MAX)   NULL,
    [CasoProveedor]        VARCHAR (50)    NULL,
    CONSTRAINT [PK_Reparacion] PRIMARY KEY CLUSTERED ([IdReparacion] ASC),
    CONSTRAINT [CK_Reparacion_Monto] CHECK ([Monto] IS NULL OR [Monto]>=(0)),
    CONSTRAINT [FK_Reparacion_TecnicoResponsable] FOREIGN KEY ([TecnicoResponsable]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_Reparacion_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket])
);


GO
CREATE NONCLUSTERED INDEX [IX_Reparacion_IdTicket]
    ON [dbo].[Reparacion]([IdTicket] ASC);

