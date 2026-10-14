CREATE TABLE [dbo].[GarantiaTicket] (
    [IdGarantia] BIGINT IDENTITY NOT NULL,
    [IdTicket] INT NOT NULL,
    [IdTicketEquipo] INT NOT NULL,
    [Proveedor] NVARCHAR(150) NOT NULL,
    [CasoProveedor] NVARCHAR(100) NOT NULL,
    [Fecha] DATETIME2 NOT NULL,
    CONSTRAINT [PK_GarantiaTicket] PRIMARY KEY ([IdGarantia]),
    CONSTRAINT [UQ_GarantiaTicket_Equipo] UNIQUE ([IdTicket], [IdTicketEquipo]),
    CONSTRAINT [FK_GarantiaTicket_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_GarantiaTicket_Equipo] FOREIGN KEY ([IdTicketEquipo]) REFERENCES [dbo].[TicketEquipo] ([IdTicketEquipo])
);
