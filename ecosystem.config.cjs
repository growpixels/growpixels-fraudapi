module.exports = {
  apps: [
    {
      name: "fraud-enrichment",
      script: "src/kafka/enrichmentConsumer.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      env_file: "/root/growpixels-fraudapi/.env",
    },
  ],
};
