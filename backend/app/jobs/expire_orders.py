import argparse

from app.core.database import SessionLocal
from app.services.orders import expire_due_orders


def main() -> None:
    parser = argparse.ArgumentParser(description="Expire due IRStore24 orders")
    parser.add_argument("--batch-size", type=int, default=100)
    args = parser.parse_args()
    if args.batch_size < 1 or args.batch_size > 1000:
        parser.error("batch-size must be between 1 and 1000")
    total = 0
    with SessionLocal() as db:
        while True:
            processed = expire_due_orders(db, limit=args.batch_size)
            total += processed
            if processed < args.batch_size:
                break
    print(f"Expired {total} order(s)")


if __name__ == "__main__":
    main()
