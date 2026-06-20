namespace CareerOps.Application.Applications;

public enum ConvertOutcome { Created, LeadNotFound, AlreadyConverted }

public sealed record ConvertResult(ConvertOutcome Outcome, ApplicationDto? Application);
