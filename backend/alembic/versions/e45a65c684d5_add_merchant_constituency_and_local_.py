"""add merchant constituency and local authority

Revision ID: e45a65c684d5
Revises: 57d4b2fca630
Create Date: 2026-07-27 19:15:40.919727

Finer-grained geography for merchant analytics, below the region level:
constituency (electoral) and local_authority (city/town/village) — both
new type_definitions domains, sourced from NSA/ECN/MURD (see
app/db/namibia_geography.py).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e45a65c684d5'
down_revision: Union[str, None] = '57d4b2fca630'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("merchants", sa.Column("constituency_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("merchants", sa.Column("local_authority_id", postgresql.UUID(as_uuid=True), nullable=True))


def downgrade() -> None:
    op.drop_column("merchants", "local_authority_id")
    op.drop_column("merchants", "constituency_id")
