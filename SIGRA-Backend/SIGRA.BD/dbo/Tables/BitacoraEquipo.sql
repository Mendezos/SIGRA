CREATE TABLE [dbo].[BitacoraEquipo] (
    [IdBitacora]   BIGINT        IDENTITY (1, 1) NOT NULL,
    [IdEquipo]     INT           NOT NULL,
    [IdTicket]     INT           NULL,
    [Fecha]        DATETIME      CONSTRAINT [DF_BitacoraEquipo_Fecha] DEFAULT (getdate()) NOT NULL,
    [Descripcion]  VARCHAR (MAX) NOT NULL,
    [TipoServicio] VARCHAR (50)  NULL,
    [IdTecnico]    INT           NULL,
    [Resolucion]   VARCHAR (100) NULL,
    CONSTRAINT [PK_BitacoraEquipo] PRIMARY KEY CLUSTERED ([IdBitacora] ASC),
    CONSTRAINT [FK_BitacoraEquipo_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_BitacoraEquipo_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_BitacoraEquipo_Tecnico] FOREIGN KEY ([IdTecnico]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_BitacoraEquipo_IdEquipo]
    ON [dbo].[BitacoraEquipo]([IdEquipo] ASC);
