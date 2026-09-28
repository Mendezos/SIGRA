CREATE TABLE [dbo].[Cotizacion] (
    [IdCotizacion] INT             IDENTITY (1, 1) NOT NULL,
    [IdProspecto]  INT             NOT NULL,
    [Fecha]        DATE            CONSTRAINT [DF_Cotizacion_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [Monto]        DECIMAL (12, 2) NOT NULL,
    [Estado]       VARCHAR (30)    CONSTRAINT [DF_Cotizacion_Estado] DEFAULT ('Pendiente') NOT NULL,
    CONSTRAINT [PK_Cotizacion] PRIMARY KEY CLUSTERED ([IdCotizacion] ASC),
    CONSTRAINT [CK_Cotizacion_Monto] CHECK ([Monto]>=(0)),
    CONSTRAINT [FK_Cotizacion_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto])
);


GO
CREATE NONCLUSTERED INDEX [IX_Cotizacion_IdProspecto]
    ON [dbo].[Cotizacion]([IdProspecto] ASC);

