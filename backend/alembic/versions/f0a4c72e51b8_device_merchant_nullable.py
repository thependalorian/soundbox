"""Allow a device to exist without a business

Revision ID: f0a4c72e51b8
Revises: d3e7b5a91f42

`devices.merchant_id` was NOT NULL, which asserted that every device belongs
to a business at every moment of its life. Two ordinary situations break that:

1. **A device in the warehouse.** Units are recorded when they arrive, before
   anyone knows which stall they will go to. Forcing an assignment at that
   point means inventing one, and an invented assignment is worse than an
   honest blank — it inflates a business's device count and, through it, the
   coverage figures a regulator reads.
2. **A business that closes.** Its devices are recovered and reissued. They
   must be released from the closed business, and there is no other business
   to point them at in that moment.

The column stays indexed and the tenancy column is untouched. Nothing else
about the relationship changes: application code still enforces it, since
this schema uses no foreign keys.
"""
from alembic import op
import sqlalchemy as sa

revision = "f0a4c72e51b8"
down_revision = "d3e7b5a91f42"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("devices", "merchant_id", existing_type=sa.UUID(), nullable=True)


def downgrade() -> None:
    # Cannot restore NOT NULL while unassigned devices exist; they are
    # legitimate, so this leaves them rather than inventing an owner.
    op.alter_column("devices", "merchant_id", existing_type=sa.UUID(), nullable=True)
