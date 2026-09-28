CREATE TABLE [dbo].[GiraTicket] (
    [IdGira]   INT NOT NULL,
    [IdTicket] INT NOT NULL,
    CONSTRAINT [PK_GiraTicket] PRIMARY KEY CLUSTERED ([IdGira] ASC, [IdTicket] ASC),
    CONSTRAINT [FK_GiraTicket_Gira] FOREIGN KEY ([IdGira]) REFERENCES [dbo].[Gira] ([IdGira]),
    CONSTRAINT [FK_GiraTicket_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket])
);


GO
CREATE NONCLUSTERED INDEX [IX_GiraTicket_IdTicket]
    ON [dbo].[GiraTicket]([IdTicket] ASC);

