CREATE TABLE [dbo].[TicketEsperaRepuesto] (
    [IdEspera] BIGINT IDENTITY NOT NULL,
    [IdTicket] INT NOT NULL,
    [Repuesto] NVARCHAR(300) NOT NULL,
    [Inicio] DATETIME2 NOT NULL,
    [Fin] DATETIME2 NULL,
    CONSTRAINT [PK_TicketEsperaRepuesto] PRIMARY KEY ([IdEspera]),
    CONSTRAINT [CK_TicketEsperaRepuesto_Fechas] CHECK ([Fin] IS NULL OR [Fin] >= [Inicio]),
    CONSTRAINT [FK_TicketEsperaRepuesto_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket])
);
GO
CREATE UNIQUE INDEX [UQ_TicketEsperaRepuesto_Abierta] ON [dbo].[TicketEsperaRepuesto] ([IdTicket]) WHERE [Fin] IS NULL;
