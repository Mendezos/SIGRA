CREATE TABLE [dbo].[PoliticaSeguridad] (
    [IdPolitica]             INT      IDENTITY (1, 1) NOT NULL,
    [MinutosInactividad]     INT      NOT NULL,
    [MaxIntentosFallidos]    INT      NOT NULL,
    [LongitudMinimaPassword] INT      NOT NULL,
    [MinutosBloqueo]         INT      NOT NULL,
    [VigenciaEnlaceMinutos]  INT      NOT NULL,
    [IdUsuarioCreador]       INT      NULL,
    [FechaCreacion]          DATETIME CONSTRAINT [DF_PoliticaSeguridad_Fecha] DEFAULT (getutcdate()) NOT NULL,
    [Activa]                 BIT      CONSTRAINT [DF_PoliticaSeguridad_Activa] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_PoliticaSeguridad] PRIMARY KEY CLUSTERED ([IdPolitica] ASC),
    CONSTRAINT [CK_PoliticaSeguridad_LongitudPassword] CHECK ([LongitudMinimaPassword]>=(6) AND [LongitudMinimaPassword]<=(32)),
    CONSTRAINT [CK_PoliticaSeguridad_MaxIntentos] CHECK ([MaxIntentosFallidos]>=(3) AND [MaxIntentosFallidos]<=(10)),
    CONSTRAINT [CK_PoliticaSeguridad_MinutosBloqueo] CHECK ([MinutosBloqueo]>=(1) AND [MinutosBloqueo]<=(1440)),
    CONSTRAINT [CK_PoliticaSeguridad_MinutosInactividad] CHECK ([MinutosInactividad]>=(1) AND [MinutosInactividad]<=(240)),
    CONSTRAINT [CK_PoliticaSeguridad_VigenciaEnlace] CHECK ([VigenciaEnlaceMinutos]>=(5) AND [VigenciaEnlaceMinutos]<=(1440)),
    CONSTRAINT [FK_PoliticaSeguridad_Usuario] FOREIGN KEY ([IdUsuarioCreador]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_PoliticaSeguridad_UnaActiva]
    ON [dbo].[PoliticaSeguridad]([Activa] ASC) WHERE ([Activa]=(1));
