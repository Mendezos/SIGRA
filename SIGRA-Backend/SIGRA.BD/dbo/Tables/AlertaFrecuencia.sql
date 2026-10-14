CREATE TABLE [dbo].[AlertaFrecuencia] (
    [IdAlerta]          INT            IDENTITY (1, 1) NOT NULL,
    [IdSolicitud]       INT            NOT NULL,
    [Tipo]              VARCHAR (10)   NOT NULL,
    [FechaAlerta]       DATE           NOT NULL,
    [FechaVencimiento]  DATE           NOT NULL,
    [IdVendedor]        INT            NOT NULL,
    [CorreoEnviado]     BIT            CONSTRAINT [DF_AlertaFrecuencia_CorreoEnviado] DEFAULT ((0)) NOT NULL,
    [FechaEnvio]        DATETIME       NULL,
    [IntentosEnvio]     INT            CONSTRAINT [DF_AlertaFrecuencia_Intentos] DEFAULT ((0)) NOT NULL,
    [ErrorEnvio]        VARCHAR (500)  NULL,
    [Atendida]          BIT            CONSTRAINT [DF_AlertaFrecuencia_Atendida] DEFAULT ((0)) NOT NULL,
    [FechaAtencion]     DATETIME       NULL,
    [NotaAtencion]      VARCHAR (1000) NULL,
    [IdUsuarioAtencion] INT            NULL,
    CONSTRAINT [PK_AlertaFrecuencia] PRIMARY KEY CLUSTERED ([IdAlerta] ASC),
    CONSTRAINT [FK_AlertaFrecuencia_Solicitud] FOREIGN KEY ([IdSolicitud]) REFERENCES [dbo].[SolicitudFrecuencia] ([IdSolicitud]),
    CONSTRAINT [FK_AlertaFrecuencia_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_AlertaFrecuencia_UsuarioAtencion] FOREIGN KEY ([IdUsuarioAtencion]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [CK_AlertaFrecuencia_Tipo] CHECK ([Tipo] IN ('Primera', 'Segunda', 'Final')),
    CONSTRAINT [CK_AlertaFrecuencia_Atencion] CHECK ([Atendida] = 0 OR ([FechaAtencion] IS NOT NULL AND [NotaAtencion] IS NOT NULL)),
    CONSTRAINT [UQ_AlertaFrecuencia_SolicitudTipo] UNIQUE NONCLUSTERED ([IdSolicitud] ASC, [Tipo] ASC)
);


GO
CREATE NONCLUSTERED INDEX [IX_AlertaFrecuencia_Vendedor]
    ON [dbo].[AlertaFrecuencia]([IdVendedor] ASC, [Atendida] ASC);
