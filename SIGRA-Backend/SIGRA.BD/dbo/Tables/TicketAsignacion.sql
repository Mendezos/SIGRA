CREATE TABLE [dbo].[TicketAsignacion] (
    [IdAsignacion] BIGINT IDENTITY NOT NULL,
    [IdTicket] INT NOT NULL,
    [IdTecnico] INT NOT NULL,
    [IdUsuario] INT NOT NULL,
    [Automatica] BIT NOT NULL,
    [Criterio] NVARCHAR(500) NOT NULL,
    [Fecha] DATETIME2 CONSTRAINT [DF_TicketAsignacion_Fecha] DEFAULT SYSUTCDATETIME() NOT NULL,
    CONSTRAINT [PK_TicketAsignacion] PRIMARY KEY ([IdAsignacion]),
    CONSTRAINT [FK_TicketAsignacion_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_TicketAsignacion_Tecnico] FOREIGN KEY ([IdTecnico]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_TicketAsignacion_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
