CREATE TABLE [dbo].[ConfiguracionTickets] (
    [Id] INT NOT NULL,
    [CargaMaxima] INT CONSTRAINT [DF_ConfiguracionTickets_Carga] DEFAULT (5) NOT NULL,
    [DiasHabilesEstimados] INT CONSTRAINT [DF_ConfiguracionTickets_Dias] DEFAULT (5) NOT NULL,
    -- 0 = los técnicos toman las boletas disponibles; 1 = el sistema las asigna por especialidad y carga.
    [AsignacionAutomatica] BIT CONSTRAINT [DF_ConfiguracionTickets_Automatica] DEFAULT (0) NOT NULL,
    CONSTRAINT [PK_ConfiguracionTickets] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_ConfiguracionTickets_Unica] CHECK ([Id] = 1),
    CONSTRAINT [CK_ConfiguracionTickets_Valores] CHECK ([CargaMaxima] >= 1 AND [DiasHabilesEstimados] >= 1)
);
