CREATE TABLE [dbo].[BoletaMantenimiento] (
    [IdBoleta]         INT           IDENTITY (1, 1) NOT NULL,
    [IdTicket]         INT           NOT NULL,
    [TecnicoAsignado]  INT           NOT NULL,
    [FechaInicio]      DATETIME      CONSTRAINT [DF_BoletaMantenimiento_FechaInicio] DEFAULT (getdate()) NOT NULL,
    [FechaFin]         DATETIME      NULL,
    [Estado]           VARCHAR (30)  CONSTRAINT [DF_BoletaMantenimiento_Estado] DEFAULT ('Abierta') NOT NULL,
    [DetalleTrabajo]   VARCHAR (MAX) NULL,
    CONSTRAINT [PK_BoletaMantenimiento] PRIMARY KEY CLUSTERED ([IdBoleta] ASC),
    CONSTRAINT [CK_BoletaMantenimiento_Fechas] CHECK ([FechaFin] IS NULL OR [FechaFin]>=[FechaInicio]),
    CONSTRAINT [CK_BoletaMantenimiento_Estado] CHECK ([Estado] IN ('Abierta', 'En progreso', 'Cerrada', 'Cancelada')),
    CONSTRAINT [FK_BoletaMantenimiento_TecnicoAsignado] FOREIGN KEY ([TecnicoAsignado]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_BoletaMantenimiento_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket])
);

