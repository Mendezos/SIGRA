CREATE TABLE [dbo].[TicketEquipo] (
    [IdTicketEquipo] INT           IDENTITY (1, 1) NOT NULL,
    [IdTicket]       INT           NOT NULL,
    [IdEquipo]       INT           NOT NULL,
    [Accesorios]     VARCHAR (MAX) NULL,
    [Problema]       VARCHAR (MAX) NULL,
    CONSTRAINT [PK_TicketEquipo] PRIMARY KEY CLUSTERED ([IdTicketEquipo] ASC),
    CONSTRAINT [FK_TicketEquipo_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_TicketEquipo_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket])
);


GO
CREATE NONCLUSTERED INDEX [IX_TicketEquipo_IdEquipo]
    ON [dbo].[TicketEquipo]([IdEquipo] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_TicketEquipo_IdTicket]
    ON [dbo].[TicketEquipo]([IdTicket] ASC);

