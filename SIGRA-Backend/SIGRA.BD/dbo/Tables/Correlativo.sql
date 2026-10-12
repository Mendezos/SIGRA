CREATE TABLE [dbo].[Correlativo] (
    [Nombre] VARCHAR(100) NOT NULL,
    [Valor] BIGINT NOT NULL,
    CONSTRAINT [PK_Correlativo] PRIMARY KEY ([Nombre]),
    CONSTRAINT [CK_Correlativo_Valor] CHECK ([Valor] >= 0)
);
