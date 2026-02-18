"""Create missing sales order tables in DB.

This script is safe to run multiple times.
It only creates `sales_orders` and `sales_order_items` if they do not exist.
"""

from app.database.connection import engine, Base
from app.database.models import SalesOrder, SalesOrderItem


def create_sales_order_tables() -> None:
    Base.metadata.create_all(
        bind=engine,
        tables=[
            SalesOrder.__table__,
            SalesOrderItem.__table__,
        ],
        checkfirst=True,
    )
    print("Sales order tables ensured: sales_orders, sales_order_items")


if __name__ == "__main__":
    create_sales_order_tables()
