from snowflake.ingest import SimpleIngestManager
from snowflake.ingest.utils.uris import DEFAULT_SCHEME
from cryptography.hazmat.primitives import serialization

# Load RSA private key
with open("snowflake_rsa_key.pem", "rb") as f:
    PRIVATE_KEY = serialization.load_pem_private_key(
        f.read(),
        password=None
    )

SNOWFLAKE_CONFIG = {
    "account": "FD35543.us-east-2.aws",          # e.g. ab12345.us-east-1
    "user": "FRAUD_INGEST_USER",
    "role": "FRAUD_INGEST_ROLE",
    "warehouse": "COMPUTE_WH",
    "database": "FRAUD_DB",
    "schema": "FRAUD",
    "private_key_path": "snowflake_rsa_key.pem",
}

PIPE_NAME = "FRAUD_ENRICHED_PIPE"  # logical name (not Snowpipe object)

ingest_manager = SimpleIngestManager(
    account=SNOWFLAKE_CONFIG["account"],
    user=SNOWFLAKE_CONFIG["user"],
    private_key=SNOWFLAKE_CONFIG["private_key_path"],
    pipe=PIPE_NAME,
    scheme=DEFAULT_SCHEME
)
