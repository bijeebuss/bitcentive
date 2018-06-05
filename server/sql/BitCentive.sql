USE [master]
DROP DATABASE BitCentive
GO

CREATE DATABASE BitCentive
GO

USE BitCentive

CREATE TABLE dbo.[Config]
(
  [PrivateKey] [CHAR](66) NOT NULL,
);
GO

CREATE TABLE dbo.[User]
(
  UserId INT NOT NULL PRIMARY KEY IDENTITY(1,1),
  [Address] [CHAR](42) NOT NULL,
  DateCreated DATETIME NOT NULL
);
GO
ALTER TABLE [dbo].[User]
ADD CONSTRAINT [DF_User_DateCreated] DEFAULT (getdate()) FOR [DateCreated]
GO
CREATE INDEX IDX_User_Address ON dbo.[User] ([Address]);
GO

CREATE TABLE dbo.Campaign
(
  CampaignId INT NOT NULL PRIMARY KEY IDENTITY(1,1),
  UserId INT NOT NULL,
  Nonce INT NOT NULL,
  Frequency TINYINT NOT NULL,
  Cooldown TINYINT NOT NULL,
  Stake BIGINT NOT NULL,
  Completed SMALLINT NOT NULL,
  [Started] INT NOT NULL,
  [Bonus] BIGINT NOT NULL,
  Missed INT NOT NULL,
  LastCompleted DATETIME NOT NULL,
  CharityPercentage TINYINT NOT NULL,
  TrainerPercentage TINYINT NOT NULL,
  [Trainer] [CHAR](42) NULL,
);
GO

CREATE INDEX IDX_Campaign_Trainer ON dbo.[Campaign] ([Trainer]);
GO

ALTER TABLE [dbo].[Campaign]
WITH CHECK ADD CONSTRAINT [FK_Campaign_User]
FOREIGN KEY([UserID]) REFERENCES [dbo].[User] ([UserId])
GO

CREATE TABLE dbo.Checkin
(
  CheckinId INT NOT NULL PRIMARY KEY IDENTITY(1,1),
  CampaignId INT NOT NULL,
  DateCreated DATETIME NOT NULL,
  Billable BIT NOT NULL,
  [TimeStamp] INT NULL,
);
GO

ALTER TABLE [dbo].[Checkin]
ADD CONSTRAINT [DF_Checkin_DateCreated] DEFAULT (getdate()) FOR [DateCreated]
GO

ALTER TABLE [dbo].[Checkin]
WITH CHECK ADD CONSTRAINT [FK_Checkin_Campaign]
FOREIGN KEY([CampaignId]) REFERENCES [dbo].[Campaign] ([CampaignId])
GO

-- Create a new stored procedure called 'GetPrivateKey' in schema 'dbo'
-- Drop the stored procedure if it already exists
IF EXISTS (
SELECT *
  FROM INFORMATION_SCHEMA.ROUTINES
WHERE SPECIFIC_SCHEMA = N'dbo'
  AND SPECIFIC_NAME = N'GetPrivateKey'
)
DROP PROCEDURE dbo.GetPrivateKey
GO

CREATE PROCEDURE dbo.GetPrivateKey
AS
  SELECT PrivateKey from Config
GO




