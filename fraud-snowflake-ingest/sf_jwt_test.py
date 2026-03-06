import snowflake.connector

with open("snowflake_rsa_key.der", "rb") as f:
    private_key = f.read()

conn = snowflake.connector.connect(
    account="PAYXYXK-UM85692",
    user="GROWPIXELS",
    private_key=private_key,
    warehouse="QUERY_WH",
    database="FRAUD_DB",
    schema="FRAUD",
    role="ACCOUNTADMIN",
)

cur = conn.cursor()
cur.execute("SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_WAREHOUSE()")
print(cur.fetchone())

cur.close()
conn.close()
