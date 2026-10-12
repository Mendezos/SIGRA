CREATE TABLE [dbo].[Repuesto] (
    [IdRepuesto] INT           IDENTITY (1, 1) NOT NULL,
    [IdModelo]   INT           NOT NULL,
    [Nombre]     VARCHAR (100) NOT NULL,
    [Cantidad]   INT           CONSTRAINT [DF_Repuesto_Cantidad] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_Repuesto] PRIMARY KEY CLUSTERED ([IdRepuesto] ASC),
    CONSTRAINT [CK_Repuesto_Cantidad] CHECK ([Cantidad]>=(0)),
    CONSTRAINT [FK_Repuesto_Modelo] FOREIGN KEY ([IdModelo]) REFERENCES [dbo].[ModeloEquipo] ([IdModelo])
);


GO
CREATE NONCLUSTERED INDEX [IX_Repuesto_IdModelo]
    ON [dbo].[Repuesto]([IdModelo] ASC);
