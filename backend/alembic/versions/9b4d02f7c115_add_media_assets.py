"""add media assets

The interface renders drawn illustrations, which never go stale and need no
storage. This table exists so real photography can be introduced later
without a schema change — the read path and the alt-text contract are
settled now, while settling them is cheap.

`alt_text` is NOT NULL on purpose: an image with no text alternative is
unusable to anyone using a screen reader, so the schema refuses to store one.

Revision ID: 9b4d02f7c115
Revises: 7a3c91e04b28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '9b4d02f7c115'
down_revision: Union[str, None] = '7a3c91e04b28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "media_assets",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("organization_id", UUID, nullable=False),
        sa.Column("type_code", sa.String(), nullable=False),
        sa.Column("owner_id", UUID, nullable=True),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("alt_text", sa.Text(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_media_assets_organization_id", "media_assets", ["organization_id"])
    op.create_index("ix_media_assets_owner_id", "media_assets", ["owner_id"])
    op.create_index("ix_media_assets_org_type", "media_assets", ["organization_id", "type_code"])
    op.create_index("ix_media_assets_org_owner", "media_assets", ["organization_id", "owner_id"])

    # Append-only companion, created with the table as the schema rules require.
    op.create_table(
        "media_asset_status_log",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("organization_id", UUID, nullable=False),
        sa.Column("media_asset_id", UUID, nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("actor_user_id", UUID, nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_media_asset_status_log_organization_id", "media_asset_status_log", ["organization_id"])
    op.create_index("ix_media_asset_status_log_media_asset_id", "media_asset_status_log", ["media_asset_id"])


def downgrade() -> None:
    op.drop_table("media_asset_status_log")
    op.drop_table("media_assets")
