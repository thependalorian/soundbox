"""add transaction payer instrument

WayaMe carries wallet-funded and bank-funded payments interchangeably.
Which instrument funded a payment is the clearest available measure of
whether the shift off cash is reaching people without bank accounts, so it
belongs in a column that can be grouped and indexed rather than inside the
`payer_info` JSON blob.

Nullable because historical rows genuinely do not know, and guessing would
put invented figures into a financial-inclusion report.

Revision ID: 7a3c91e04b28
Revises: 50599d6c5d6a
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '7a3c91e04b28'
down_revision: Union[str, None] = '50599d6c5d6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("payer_instrument", sa.String(), nullable=True))
    op.create_index(
        "ix_transactions_org_instrument",
        "transactions",
        ["organization_id", "payer_instrument"],
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_org_instrument", table_name="transactions")
    op.drop_column("transactions", "payer_instrument")
