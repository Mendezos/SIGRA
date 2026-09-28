CREATE TABLE [dbo].[CambioBateria] (
    [IdCambioBateria] INT  IDENTITY (1, 1) NOT NULL,
    [IdRadio]         INT  NOT NULL,
    [IdBateriaNueva]  INT  NOT NULL,
    [IdUsuario]       INT  NOT NULL,
    [FechaCambio]     DATE CONSTRAINT [DF_CambioBateria_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    CONSTRAINT [PK_CambioBateria] PRIMARY KEY CLUSTERED ([IdCambioBateria] ASC),
    CONSTRAINT [CK_CambioBateria_RadioDistintoBateria] CHECK ([IdRadio]<>[IdBateriaNueva]),
    CONSTRAINT [FK_CambioBateria_BateriaNueva] FOREIGN KEY ([IdBateriaNueva]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_CambioBateria_Radio] FOREIGN KEY ([IdRadio]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_CambioBateria_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);

