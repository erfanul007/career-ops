using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CareerOps.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FollowUpTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "follow_up_tasks",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    related_entity_type = table.Column<int>(type: "integer", nullable: false),
                    related_entity_id = table.Column<int>(type: "integer", nullable: true),
                    due_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_follow_up_tasks", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_follow_up_tasks_related_entity_type_related_entity_id",
                table: "follow_up_tasks",
                columns: new[] { "related_entity_type", "related_entity_id" });

            migrationBuilder.CreateIndex(
                name: "ix_follow_up_tasks_status_due_at_utc",
                table: "follow_up_tasks",
                columns: new[] { "status", "due_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "follow_up_tasks");
        }
    }
}
