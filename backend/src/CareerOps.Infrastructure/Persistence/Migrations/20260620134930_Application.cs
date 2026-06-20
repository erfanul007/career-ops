using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CareerOps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Application : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "applications",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    job_lead_id = table.Column<int>(type: "integer", nullable: false),
                    resume_variant_id = table.Column<int>(type: "integer", nullable: false),
                    applied_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    current_stage = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    expected_salary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    expected_salary_currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    notice_period = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    next_step = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    next_action_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejection_reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_applications", x => x.id);
                    table.ForeignKey(
                        name: "fk_applications_job_leads_job_lead_id",
                        column: x => x.job_lead_id,
                        principalTable: "job_leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_applications_resume_variants_resume_variant_id",
                        column: x => x.resume_variant_id,
                        principalTable: "resume_variants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_applications_current_stage",
                table: "applications",
                column: "current_stage");

            migrationBuilder.CreateIndex(
                name: "ix_applications_job_lead_id",
                table: "applications",
                column: "job_lead_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_applications_resume_variant_id",
                table: "applications",
                column: "resume_variant_id");

            migrationBuilder.CreateIndex(
                name: "ix_applications_status",
                table: "applications",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "applications");
        }
    }
}
