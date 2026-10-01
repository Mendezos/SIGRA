CREATE TABLE [dbo].[Ticket] (
    [IdTicket]            INT           IDENTITY (1, 1) NOT NULL,
    [IdCliente]           INT           NOT NULL,
    [TecnicoReceptor]     INT           NOT NULL,
    [CodigoSeguimiento]   VARCHAR (20)  NOT NULL,
    [TipoServicio]        VARCHAR (50)  NOT NULL,
    [Estado]              VARCHAR (30)  CONSTRAINT [DF_Ticket_Estado] DEFAULT ('Pendiente') NOT NULL,
    [FechaRecepcion]      DATETIME      CONSTRAINT [DF_Ticket_FechaRecepcion] DEFAULT (getdate()) NOT NULL,
    [DescripcionProblema] VARCHAR (MAX) NOT NULL,
    [Activo]              BIT           CONSTRAINT [DF_Ticket_Activo] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_Ticket] PRIMARY KEY CLUSTERED ([IdTicket] ASC),
    CONSTRAINT [CK_Ticket_Estado] CHECK ([Estado] IN ('Pendiente', 'En progreso', 'Resuelto', 'Cerrado', 'Cancelado')),
    CONSTRAINT [FK_Ticket_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_Ticket_TecnicoReceptor] FOREIGN KEY ([TecnicoReceptor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [UQ_Ticket_CodigoSeguimiento] UNIQUE NONCLUSTERED ([CodigoSeguimiento] ASC)
);


GO
CREATE NONCLUSTERED INDEX [IX_Ticket_Estado]
    ON [dbo].[Ticket]([Estado] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Ticket_TecnicoReceptor]
    ON [dbo].[Ticket]([TecnicoReceptor] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Ticket_IdCliente]
    ON [dbo].[Ticket]([IdCliente] ASC);

