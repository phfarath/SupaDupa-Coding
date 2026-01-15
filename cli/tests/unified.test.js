const { spawn } = require('child_process');

// Test unified config with chat
async function testUnifiedConfig() {
  console.log('Testing Unified Configuration...\n');
  
  const child = spawn('node', ['dist/src/index.js', 'chat', '--agents', 'planner'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let hasStarted = false;

  child.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
    
    if (text.includes('Você:') && !hasStarted) {
      hasStarted = true;
      setTimeout(() => {
        child.stdin.write('create a simple REST API\n');
        setTimeout(() => {
          child.stdin.write('/exit\n');
        }, 2000);
      }, 500);
    }
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('close', (code) => {
    console.log(`\n\nTest completed with code: ${code}`);
    
    // Check if it loaded from unified config
    const hasProvider = output.includes('openai') || output.includes('gpt-4');
    const hasAnalysis = output.includes('Analisando requisito');
    
    console.log('\nTest Results:');
    console.log('- Provider loaded:', hasProvider ? '✅' : '❌');
    console.log('- Analysis started:', hasAnalysis ? '✅' : '❌');
    
    if (hasProvider) {
      console.log('\n✅ Unified configuration test PASSED');
    } else {
      console.log('\n❌ Unified configuration test FAILED');
    }
  });
}

testUnifiedConfig();