using CareerOps.Application.Common;
using CareerOps.Domain.ResumeVariants;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.ResumeVariants;

public sealed class ResumeVariantService(IAppDbContext db)
{
    public async Task<IReadOnlyList<ResumeVariantDto>> ListAsync(CancellationToken ct = default) =>
        (await db.ResumeVariants.OrderByDescending(v => v.IsDefault).ThenBy(v => v.Name).ToListAsync(ct))
            .Adapt<List<ResumeVariantDto>>();

    public async Task<ResumeVariantDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct))?.Adapt<ResumeVariantDto>();

    public async Task<ResumeVariantDto> CreateAsync(CreateResumeVariantRequest request, CancellationToken ct = default)
    {
        var variant = request.Adapt<ResumeVariant>();
        variant.IsDefault = !await db.ResumeVariants.AnyAsync(ct); // first variant becomes default
        db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync(ct);
        return variant.Adapt<ResumeVariantDto>();
    }

    public async Task<ResumeVariantDto?> UpdateAsync(int id, UpdateResumeVariantRequest request, CancellationToken ct = default)
    {
        var variant = await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (variant is null) return null;
        request.Adapt(variant);
        await db.SaveChangesAsync(ct);
        return variant.Adapt<ResumeVariantDto>();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var variant = await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (variant is null) return false;

        db.ResumeVariants.Remove(variant); // referenced-by-Application delete is blocked by FK Restrict (Task 6)

        // Promote the next variant alphabetically when the deleted one was the default;
        // otherwise the user would have no default and list ordering would be undefined.
        if (variant.IsDefault)
        {
            var next = await db.ResumeVariants
                .Where(v => v.Id != id)
                .OrderBy(v => v.Name)
                .FirstOrDefaultAsync(ct);
            if (next is not null) next.IsDefault = true;
        }

        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ResumeVariantDto?> MakeDefaultAsync(int id, CancellationToken ct = default)
    {
        var target = await db.ResumeVariants.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (target is null) return null;
        var others = await db.ResumeVariants.Where(v => v.IsDefault && v.Id != id).ToListAsync(ct);
        foreach (var v in others) v.IsDefault = false;
        target.IsDefault = true;
        await db.SaveChangesAsync(ct);
        return target.Adapt<ResumeVariantDto>();
    }
}
