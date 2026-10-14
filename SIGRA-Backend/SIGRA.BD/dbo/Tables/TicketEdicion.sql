CREATE TABLE [dbo].[TicketEdicion] (
    [IdEdicion] BIGINT IDENTITY NOT NULL,
    [IdTicket] INT NOT NULL,
    [IdUsuario] INT NOT NULL,
    [Fecha] DATETIME2 CONSTRAINT [DF_TicketEdicion_Fecha] DEFAULT SYSUTCDATETIME() NOT NULL,
    [Resumen] NVARCHAR(MAX) NOT NULL,
    CONSTRAINT [PK_TicketEdicion] PRIMARY KEY ([IdEdicion]),
    CONSTRAINT [FK_TicketEdicion_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_TicketEdicion_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
