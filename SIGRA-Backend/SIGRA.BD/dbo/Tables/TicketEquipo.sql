CREATE TABLE [dbo].[TicketEquipo] (
    [IdTicketEquipo] INT           IDENTITY (1, 1) NOT NULL,
    [IdTicket]       INT           NOT NULL,
    [IdEquipo]       INT           NULL,
    [Marca]          NVARCHAR (100) NULL,
    [Modelo]         NVARCHAR (100) NULL,
    [Tipo]           NVARCHAR (30) NULL,
    [Especialidad]   NVARCHAR (30) NULL,
    [NumeroSerie]    NVARCHAR (50) NULL,
    [IdContrato]     INT NULL,
    [CubiertoPorContrato] BIT CONSTRAINT [DF_TicketEquipo_Cubierto] DEFAULT (0) NOT NULL,
    [Accesorios]     VARCHAR (MAX) NULL,
    [Problema]       VARCHAR (MAX) NULL,
    CONSTRAINT [PK_TicketEquipo] PRIMARY KEY CLUSTERED ([IdTicketEquipo] ASC),
    CONSTRAINT [FK_TicketEquipo_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_TicketEquipo_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [FK_TicketEquipo_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket])
);

GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_TicketEquipo_Serie]
    ON [dbo].[TicketEquipo] ([IdTicket], [NumeroSerie]) WHERE [NumeroSerie] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_TicketEquipo_IdEquipo]
    ON [dbo].[TicketEquipo]([IdEquipo] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_TicketEquipo_IdTicket]
    ON [dbo].[TicketEquipo]([IdTicket] ASC);

