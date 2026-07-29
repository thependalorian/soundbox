"""Add users (real auth) + device API keys + merchant NAMQR signing keys

Revision ID: a1b2c3d4e5f6
Revises: f0a4c72e51b8

Closes the security-audit critical finding: authorization previously
trusted a client-supplied X-User-Role header with nothing behind it. This
adds a real `users` table (bcrypt password hashes, JWT-issued sessions),
a per-device credential (`devices.api_key_hash`) so devices authenticate
with a provisioned secret instead of announcing their own identity, and
`merchants.namqr_public_key_pem` so signed NAMQR QR codes (tag 66) can
actually be verified per Bank of Namibia NAMQR Code Standards v5.0,
Annexure I.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "f0a4c72e51b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_org_role", "users", ["organization_id", "role"])

    op.create_table(
        "user_status_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.add_column("devices", sa.Column("api_key_hash", sa.String(), nullable=True))
    op.add_column("merchants", sa.Column("namqr_public_key_pem", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("merchants", "namqr_public_key_pem")
    op.drop_column("devices", "api_key_hash")
    op.drop_table("user_status_log")
    op.drop_index("ix_users_org_role", table_name="users")
    op.drop_table("users")
