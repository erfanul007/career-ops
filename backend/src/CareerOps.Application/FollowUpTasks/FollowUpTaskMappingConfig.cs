using CareerOps.Domain.FollowUpTasks;
using Mapster;

namespace CareerOps.Application.FollowUpTasks;

public sealed class FollowUpTaskMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<CreateFollowUpTaskRequest, FollowUpTask>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
        config.NewConfig<UpdateFollowUpTaskRequest, FollowUpTask>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
