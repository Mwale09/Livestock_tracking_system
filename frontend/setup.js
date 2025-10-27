#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up Livestock Tracking System Frontend...');
console.log('='.repeat(50));

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('Error: package.json not found. Please run this script from the frontend directory.');
    process.exit(1);
}

try {
    console.log('Installing Node.js dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✓ Dependencies installed successfully');
    
    console.log('\n✓ Frontend setup completed successfully!');
    console.log('\nTo start the development server, run:');
    console.log('  npm start');
    console.log('\nThe application will be available at:');
    console.log('  http://localhost:3000');
    
} catch (error) {
    console.error('✗ Setup failed:', error.message);
    process.exit(1);
}






