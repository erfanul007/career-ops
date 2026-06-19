using FluentValidation;

namespace CareerOps.Api.Filters;

public sealed class ValidationFilter<T> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var validator = ctx.HttpContext.RequestServices.GetService<IValidator<T>>();
        var arg = ctx.Arguments.OfType<T>().FirstOrDefault();
        if (validator is not null && arg is not null)
        {
            var result = await validator.ValidateAsync(arg);
            if (!result.IsValid)
                return Results.ValidationProblem(result.ToDictionary());
        }
        return await next(ctx);
    }
}
