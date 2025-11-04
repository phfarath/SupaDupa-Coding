#!/usr/bin/env ts-node

/**
 * Seed Database Script
 * Loads initial data from seed files into the memory database
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { sdMemoryRepository } from '../src/memory/memory-repository';
import { MemoryRecordDTO } from '../shared/contracts/memory-record';

interface SeedDataFile {
  records: Array<MemoryRecordDTO>;
  statistics?: any;
}

const SEED_DATA_PATH = path.join(__dirname, '..', 'data', 'seed', 'memory');
const DB_PATH = path.join(__dirname, '..', 'data', 'memory.db');

async function loadSeedData(): Promise<void> {
  console.log('🌱 Starting database seed process...\n');

  // Initialize memory repository
  const repository = new sdMemoryRepository(DB_PATH);
  
  try {
    console.log('📦 Initializing database connection...');
    await repository.initialize();
    console.log('✅ Database initialized\n');

    // Load seed records
    const seedFilePath = path.join(SEED_DATA_PATH, 'init_records.json');
    
    if (!existsSync(seedFilePath)) {
      console.error(`❌ Seed file not found: ${seedFilePath}`);
      process.exit(1);
    }

    console.log(`📖 Reading seed file: ${seedFilePath}`);
    const seedFileContent = readFileSync(seedFilePath, 'utf-8');
    const seedData: SeedDataFile = JSON.parse(seedFileContent);

    console.log(`📊 Found ${seedData.records.length} records to seed\n`);

    // Insert each record
    let successCount = 0;
    let failureCount = 0;

    for (const record of seedData.records) {
      try {
        console.log(`   ⏳ Seeding record: ${record.id} (${record.key})`);
        await repository.putMemoryRecord(record);
        successCount++;
        console.log(`   ✅ Successfully seeded: ${record.id}`);
      } catch (error) {
        failureCount++;
        console.error(`   ❌ Failed to seed ${record.id}:`, error.message);
      }
    }

    console.log('\n📈 Seed Results:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failures: ${failureCount}`);
    console.log(`   📊 Total: ${seedData.records.length}`);

    if (seedData.statistics) {
      console.log('\n📊 Seed Data Statistics:');
      console.log(`   Total Records: ${seedData.statistics.totalRecords}`);
      console.log(`   By Category:`, seedData.statistics.byCategory);
      console.log(`   By Agent:`, seedData.statistics.byAgent);
      console.log(`   Avg Success Rate: ${(seedData.statistics.averageSuccessRate * 100).toFixed(1)}%`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during seeding process:', error);
    process.exit(1);
  } finally {
    await repository.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  loadSeedData()
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { loadSeedData };
