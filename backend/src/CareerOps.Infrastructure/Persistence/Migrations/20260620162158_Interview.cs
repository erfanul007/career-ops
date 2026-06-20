using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CareerOps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Interview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "interviews",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    application_id = table.Column<int>(type: "integer", nullable: false),
                    round_type = table.Column<int>(type: "integer", nullable: false),
                    scheduled_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    duration_minutes = table.Column<int>(type: "integer", nullable: true),
                    interviewer_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    interviewer_role = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    meeting_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    prep_notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    outcome = table.Column<int>(type: "integer", nullable: false),
                    feedback = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    follow_up_required = table.Column<bool>(type: "boolean", nullable: false),
                    follow_up_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_interviews", x => x.id);
                    table.ForeignKey(
                        name: "fk_interviews_applications_application_id",
                        column: x => x.application_id,
                        principalTable: "applications",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_interviews_application_id",
                table: "interviews",
                column: "application_id");

            migrationBuilder.CreateIndex(
                name: "ix_interviews_scheduled_at_utc",
                table: "interviews",
                column: "scheduled_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_interviews_status",
                table: "interviews",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "interviews");
        }
    }
}
