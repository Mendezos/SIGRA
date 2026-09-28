CREATE TABLE [dbo].[BoletaMantenimiento] (
    [IdBoleta]        INT IDENTITY (1, 1) NOT NULL,
    [IdTicket]        INT NOT NULL,
    [TecnicoAsignado] INT NOT NULL,
    CONSTRAINT [PK_BoletaMantenimiento] PRIMARY KEY CLUSTERED ([IdBoleta] ASC),
    CONSTRAINT [FK_BoletaMantenimiento_TecnicoAsignado] FOREIGN KEY ([TecnicoAsignado]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_BoletaMantenimiento_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket])
);

