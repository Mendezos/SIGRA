CREATE TABLE [dbo].[TicketInventarioEvento] (
    [IdTicket] INT NOT NULL,
    [IdEquipo] INT NOT NULL,
    [EstadoAnterior] VARCHAR(30) NOT NULL,
    [CierreRegistrado] BIT CONSTRAINT [DF_TicketInventarioEvento_Cierre] DEFAULT (0) NOT NULL,
    CONSTRAINT [PK_TicketInventarioEvento] PRIMARY KEY ([IdTicket], [IdEquipo]),
    CONSTRAINT [FK_TicketInventarioEvento_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_TicketInventarioEvento_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo])
);
