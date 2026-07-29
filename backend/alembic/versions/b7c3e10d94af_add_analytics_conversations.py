"""Add analytics assistant conversations, status log and messages

Revision ID: b7c3e10d94af
Revises: a1b2c3d4e5f6

Backs the natural-language analytics surface described in
docs/analytics-chat.md. Three tables, created together because the Wiebe
rules require the status-log companion to exist from the moment its parent
does, not whenever someone gets around to it.

`conversation_messages` is immutable by design — no `updated_at`, never
UPDATEd. An oversight officer acting on an answer has to be able to show the
exact question, the exact figures returned, and the tool calls behind them; a
transcript that can be edited after the fact is worth nothing as a record.

Roles and statuses are `type_definitions` rows (domains `message_role` and
`conversation_status`, seeded in app/db/type_definitions_seed.py), not CHECK
constraints — adding a value stays an INSERT.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b7c3e10d94af"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    # Partial on live rows: the thread list only ever asks for one user's
    # undeleted conversations, newest first.
    op.create_index(
        "ix_conversations_org_user_active",
        "conversations",
        ["organization_id", "user_id", "updated_at"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "conversation_status_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "conversation_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("role_code", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tool_calls", postgresql.JSONB(), nullable=True),
        sa.Column("model_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_conversation_messages_org_conv_at",
        "conversation_messages",
        ["organization_id", "conversation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_conversation_messages_org_conv_at", table_name="conversation_messages")
    op.drop_table("conversation_messages")
    op.drop_table("conversation_status_log")
    op.drop_index("ix_conversations_org_user_active", table_name="conversations")
    op.drop_table("conversations")
