#!/bin/bash
# Basic workflow example for SupaDupaCode CLI

echo "==================================="
echo "SupaDupaCode CLI - Basic Workflow"
echo "==================================="
echo ""

# Step 1: Initialize configuration
echo "Step 1: Initialize configuration"
node ../src/index.js config init
echo ""
sleep 1

# Step 2: Create a plan
echo "Step 2: Create a plan for a feature"
node ../src/index.js plan "Add user authentication with email and password"
echo ""
sleep 1

# Step 3: Check status
echo "Step 3: Check development status"
node ../src/index.js status
echo ""
sleep 1

# Step 4: Show configuration
echo "Step 4: Show current configuration"
node ../src/index.js config show orchestration
echo ""
sleep 1

# Step 5: Update configuration
echo "Step 5: Update orchestration mode to concurrent"
node ../src/index.js config set orchestration.defaultMode concurrent
echo ""
sleep 1

# Step 6: Verify change
echo "Step 6: Verify configuration change"
node ../src/index.js config show orchestration.defaultMode
echo ""

echo "==================================="
echo "Workflow complete!"
echo "==================================="
