"""add merchant geo location

Revision ID: 57d4b2fca630
Revises: 1c22b2586d66
Create Date: 2026-07-27 18:47:26.053258

Adds an anchor lat/lng + region to merchants, backing the "Geographic
Distribution" / "Merchant Activity Heatmaps" analytics docs/device.md pitches.
`region` is a type_definitions domain (Namibia's 14 regions), not a CHECK
enum, per the Wiebe config-table convention.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '57d4b2fca630'
down_revision: Union[str, None] = '1c22b2586d66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("merchants", sa.Column("lat", sa.Numeric(9, 6), nullable=True))
    op.add_column("merchants", sa.Column("lng", sa.Numeric(9, 6), nullable=True))
    op.add_column("merchants", sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_merchants_org_region", "merchants", ["organization_id", "region_id"])


def downgrade() -> None:
    op.drop_index("ix_merchants_org_region", table_name="merchants")
    op.drop_column("merchants", "region_id")
    op.drop_column("merchants", "lng")
    op.drop_column("merchants", "lat")
