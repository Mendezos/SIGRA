CREATE TABLE [dbo].[EncuestaRespuesta] (
    [IdEncuesta] INT          NOT NULL,
    [Aspecto]    VARCHAR (60) NOT NULL,
    [Puntaje]    TINYINT      NOT NULL,
    CONSTRAINT [PK_EncuestaRespuesta] PRIMARY KEY CLUSTERED ([IdEncuesta] ASC, [Aspecto] ASC),
    CONSTRAINT [CK_EncuestaRespuesta_Puntaje] CHECK ([Puntaje] BETWEEN 1 AND 5),
    CONSTRAINT [FK_EncuestaRespuesta_Encuesta] FOREIGN KEY ([IdEncuesta]) REFERENCES [dbo].[Encuesta] ([IdEncuesta])
);
