namespace CareerOps.Application.Applications;

public enum ConvertOutcome { Created = 0, LeadNotFound = 1, AlreadyConverted = 2 }

public sealed record ConvertResult(ConvertOutcome Outcome, ApplicationDto? Application);
