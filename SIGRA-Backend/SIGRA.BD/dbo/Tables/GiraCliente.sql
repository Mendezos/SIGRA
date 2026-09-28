CREATE TABLE [dbo].[GiraCliente] (
    [IdGiraCliente] INT IDENTITY (1, 1) NOT NULL,
    [IdGira]        INT NOT NULL,
    [IdCliente]     INT NOT NULL,
    CONSTRAINT [PK_GiraCliente] PRIMARY KEY CLUSTERED ([IdGiraCliente] ASC),
    CONSTRAINT [FK_GiraCliente_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_GiraCliente_Gira] FOREIGN KEY ([IdGira]) REFERENCES [dbo].[Gira] ([IdGira]),
    CONSTRAINT [UQ_GiraCliente] UNIQUE NONCLUSTERED ([IdGira] ASC, [IdCliente] ASC)
);


GO
CREATE NONCLUSTERED INDEX [IX_GiraCliente_IdCliente]
    ON [dbo].[GiraCliente]([IdCliente] ASC);

