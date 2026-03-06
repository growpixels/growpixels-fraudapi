import random
import csv
from datetime import datetime, timedelta
import uuid

TOTAL_TRANSACTIONS = 10000
FRAUD_RATE = 0.04  # 4%

output_file = "synthetic_transactions.csv"

def random_timestamp():
    now = datetime.now()
    start = now - timedelta(days=30)
    random_time = start + timedelta(
        seconds=random.randint(0, int((now - start).total_seconds()))
    )
    return random_time.strftime("%Y-%m-%d %H:%M:%S")

def generate_transaction():
    transaction_id = str(uuid.uuid4())
    
    # Realistic ecommerce amounts (clustered between 20–150)
    amount = round(random.gauss(90, 40), 2)
    amount = max(5, min(amount, 800))

    # Risk score distribution (biased)
    risk_score = int(random.triangular(0, 100, 30))

    decision = "BLOCK" if risk_score > 75 else "ALLOW"

    if random.random() < FRAUD_RATE:
        risk_score = random.randint(76, 100)
        decision = "BLOCK"

    countries = ["US", "UK", "CA", "AU", "DE", "IN"]
    devices = ["Mobile", "Desktop", "Tablet"]

    return {
        "transaction_id": transaction_id,
        "timestamp": random_timestamp(),
        "amount": amount,
        "currency": "USD",
        "country": random.choice(countries),
        "device": random.choice(devices),
        "risk_score": risk_score,
        "decision": decision
    }

def main():
    with open(output_file, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=[
            "transaction_id",
            "timestamp",
            "amount",
            "currency",
            "country",
            "device",
            "risk_score",
            "decision"
        ])
        writer.writeheader()

        for _ in range(TOTAL_TRANSACTIONS):
            writer.writerow(generate_transaction())

    print(f"Generated {TOTAL_TRANSACTIONS} transactions into {output_file}")

if __name__ == "__main__":
    main()
