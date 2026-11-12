CREATE TABLE [dbo].[TicketRepuesto] (
    [IdTicketRepuesto] INT          IDENTITY (1, 1) NOT NULL,
    [IdTicket]         INT          NOT NULL,
    [IdRepuesto]       INT          NOT NULL,
    [Cantidad]         INT          NOT NULL,
    [IdUsuario]        INT          NOT NULL,
    [Fecha]            DATETIME2    CONSTRAINT [DF_TicketRepuesto_Fecha] DEFAULT (SYSUTCDATETIME()) NOT NULL,
    CONSTRAINT [PK_TicketRepuesto] PRIMARY KEY CLUSTERED ([IdTicketRepuesto] ASC),
    CONSTRAINT [CK_TicketRepuesto_Cantidad] CHECK ([Cantidad] > 0),
    CONSTRAINT [FK_TicketRepuesto_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_TicketRepuesto_Repuesto] FOREIGN KEY ([IdRepuesto]) REFERENCES [dbo].[Repuesto] ([IdRepuesto]),
    CONSTRAINT [FK_TicketRepuesto_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_TicketRepuesto_IdTicket]
    ON [dbo].[TicketRepuesto]([IdTicket] ASC);
