CREATE TABLE [dbo].[TicketEstadoHistorial] (
    [IdHistorial] BIGINT       IDENTITY (1, 1) NOT NULL,
    [IdTicket]    INT          NOT NULL,
    [IdUsuario]   INT          NOT NULL,
    [Estado]      VARCHAR (30) NOT NULL,
    [FechaInicio] DATETIME     CONSTRAINT [DF_TicketEstadoHistorial_FechaInicio] DEFAULT (getdate()) NOT NULL,
    [FechaFin]    DATETIME     NULL,
    CONSTRAINT [PK_TicketEstadoHistorial] PRIMARY KEY CLUSTERED ([IdHistorial] ASC),
    CONSTRAINT [CK_TicketEstadoHistorial_Fechas] CHECK ([FechaFin] IS NULL OR [FechaFin]>=[FechaInicio]),
    CONSTRAINT [FK_TicketEstadoHistorial_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_TicketEstadoHistorial_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);

