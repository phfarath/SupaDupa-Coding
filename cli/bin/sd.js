#!/usr/bin/env node

// Alias simplificado para supadupacode sd
// Permite usar apenas "sd" ao invés de "supadupacode sd"

import { spawn } from 'child_process';

const args = ['sd', ...process.argv.slice(2)];

const child = spawn('supadupacode', args, {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
