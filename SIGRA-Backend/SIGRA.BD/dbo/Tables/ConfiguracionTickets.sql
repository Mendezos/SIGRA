CREATE TABLE [dbo].[ConfiguracionTickets] (
    [Id] INT NOT NULL,
    [CargaMaxima] INT CONSTRAINT [DF_ConfiguracionTickets_Carga] DEFAULT (5) NOT NULL,
    [DiasHabilesEstimados] INT CONSTRAINT [DF_ConfiguracionTickets_Dias] DEFAULT (5) NOT NULL,
    CONSTRAINT [PK_ConfiguracionTickets] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_ConfiguracionTickets_Unica] CHECK ([Id] = 1),
    CONSTRAINT [CK_ConfiguracionTickets_Valores] CHECK ([CargaMaxima] >= 1 AND [DiasHabilesEstimados] >= 1)
);
