"""Add password reset tokens and password-change tracking

Revision ID: d5b93c07e142
Revises: c4f8a21b7d90

Closes the gap that the only way to create a second account was to insert a
row by hand, and the only way to recover a lost password was to edit the
database.

Two things land here:

- `users.password_changed_at`. JWTs are stateless and cannot be revoked, so
  a password reset would otherwise leave any already-issued session valid for
  the rest of its twelve hours — an attacker who had a session would keep it
  through the very reset intended to lock them out. Every token now carries
  `iat`, and `app/api/deps.py` refuses one issued before this instant.

- `password_reset_tokens` plus its append-only status log. Only the token's
  hash is stored, the same way a device credential is; the plaintext exists
  once, in the email. Rows are retained after use, because "was a reset
  requested for this account, and was it used?" is worth answering later —
  an attacker probing for accounts leaves a trail here.

Statuses live in `type_definitions` (domain `password_reset_status`), not in
a CHECK constraint, per workspace CLAUDE.md §2.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d5b93c07e142"
down_revision = "c4f8a21b7d90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(), nullable=True))

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="issued"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("requested_ip", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_password_reset_tokens_org_user",
        "password_reset_tokens",
        ["organization_id", "user_id", "created_at"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "password_reset_token_status_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("password_reset_token_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("password_reset_token_status_log")
    op.drop_index("ix_password_reset_tokens_org_user", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_column("users", "password_changed_at")
