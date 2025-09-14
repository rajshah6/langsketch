#!/usr/bin/env node

/**
 * Databricks Setup Script
 * This script helps you configure your Databricks connection for the analytics dashboard
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupDatabricks() {
  console.log("🔧 Databricks Analytics Setup");
  console.log("================================\n");

  console.log(
    "This script will help you configure your Databricks connection."
  );
  console.log("You can find these values in your Databricks workspace:\n");

  console.log("1. Server Hostname: Go to your Databricks workspace URL");
  console.log("   Example: adb-1234567890123456.7.azuredatabricks.net\n");

  console.log(
    "2. HTTP Path: Go to SQL Warehouses → Your Warehouse → Connection Details"
  );
  console.log("   Example: /sql/1.0/warehouses/your-warehouse-id\n");

  console.log(
    "3. Access Token: Go to User Settings → Developer → Access Tokens"
  );
  console.log("   Create a new token if you don't have one\n");

  console.log(
    '4. Catalog & Schema: Usually "main" and "default" respectively\n'
  );

  const hostname = await question("Enter your Databricks Server Hostname: ");
  const httpPath = await question("Enter your HTTP Path: ");
  const accessToken = await question("Enter your Access Token: ");
  const catalog = (await question("Enter Catalog (default: main): ")) || "main";
  const schema =
    (await question("Enter Schema (default: default): ")) || "default";

  // Create .env file
  const envContent = `# Databricks Configuration
DATABRICKS_SERVER_HOSTNAME=${hostname}
DATABRICKS_HTTP_PATH=${httpPath}
DATABRICKS_ACCESS_TOKEN=${accessToken}
DATABRICKS_CATALOG=${catalog}
DATABRICKS_SCHEMA=${schema}
`;

  try {
    fs.writeFileSync(".env", envContent);
    console.log("\n✅ Configuration saved to .env file");
    console.log(
      "\n🚀 You can now restart the application to use real Databricks data!"
    );
    console.log(
      "\nNote: Make sure your .env file is in your .gitignore to keep credentials secure."
    );
  } catch (error) {
    console.error("❌ Error saving configuration:", error.message);
    console.log(
      "\nYou can manually create a .env file with the following content:"
    );
    console.log(envContent);
  }

  rl.close();
}

// Test connection if credentials are provided
async function testConnection() {
  try {
    const DatabricksClient = require("./js/analytics/databricks.js");
    const client = new DatabricksClient();
    const connected = await client.connect();

    if (connected) {
      console.log("✅ Successfully connected to Databricks!");

      // Test table query
      const tables = await client.getAvailableTables();
      console.log(
        `📊 Found ${tables.length} tables:`,
        tables.map((t) => t.name)
      );

      await client.disconnect();
    } else {
      console.log(
        "❌ Failed to connect to Databricks. Please check your credentials."
      );
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    console.log("🧪 Testing Databricks connection...\n");
    await testConnection();
  } else {
    await setupDatabricks();
  }
}

main().catch(console.error);
