import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

/**
 * MigrationRunner - Executes database migrations for the memory system
 */
export class MigrationRunner {
  private db: Database;
  private migrationsPath: string;

  constructor(db: Database, migrationsPath?: string) {
    this.db = db;
    this.migrationsPath = migrationsPath || path.join(__dirname, 'migrations');
  }

  async runMigrations(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all .sql files from the migrations directory
    const files = await fs.readdir(this.migrationsPath);
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();

    for (const fileName of sqlFiles) {
      const migrationId = path.parse(fileName).name;
      
      // Check if migration has already been executed
      const existing = await this.db.get(
        'SELECT id FROM migrations WHERE id = ?', 
        [migrationId]
      );
      
      if (existing) {
        console.log(`Migration ${fileName} already executed, skipping...`);
        continue;
      }

      // Read and execute the migration
      const filePath = path.join(this.migrationsPath, fileName);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      await this.db.exec(sql);
      
      // Record that the migration was executed
      await this.db.run(
        'INSERT INTO migrations (id, name) VALUES (?, ?)',
        [migrationId, fileName]
      );
      
      console.log(`Executed migration: ${fileName}`);
    }
  }
}