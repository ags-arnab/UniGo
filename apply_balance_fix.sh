#!/bin/bash
# Apply the marketplace order balance deduction fix migrations

# Set your Supabase project URL and service_role key
# You should replace these with your actual values or load them from environment variables
SUPABASE_URL=${SUPABASE_URL:-"https://your-project-url.supabase.co"}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-"your-service-role-key"}

# Function to run SQL migration
run_migration() {
    local migration_file=$1
    echo "Applying migration: $migration_file"
    
    # Read the SQL file content
    sql_content=$(cat "$migration_file")
    
    # Execute the SQL using the Supabase RESTful API
    curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"query\": \"$sql_content\"}"
    
    echo -e "\nMigration applied successfully.\n"
}

# Apply the fix migrations
run_migration "supabase/migrations/048_fix_marketplace_order_balance_deduction.sql"
run_migration "supabase/migrations/049_fix_existing_marketplace_orders.sql"

echo "All migrations have been applied successfully!"
