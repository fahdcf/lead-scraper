#!/usr/bin/env node

import fs from 'fs/promises';

// Load environment variables from env.config file
async function loadEnvConfig() {
  try {
    const envContent = await fs.readFile('env.config', 'utf8');
    const envVars = {};
    
    console.log('📄 Raw env.config content:');
    console.log(envContent);
    console.log('\n---\n');
    
    envContent.split('\n').forEach((line, index) => {
      console.log(`Line ${index + 1}: "${line}"`);
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        envVars[key.trim()] = value.trim();
        console.log(`  -> Parsed: ${key.trim()} = ${value.trim()}`);
      }
    });
    
    console.log('\n📋 Parsed environment variables:');
    console.log(envVars);
    
    return envVars;
  } catch (error) {
    console.error('❌ Error reading env.config:', error.message);
    return {};
  }
}

// Get API keys from environment
function getApiKeys(envVars) {
  const keys = [];
  console.log('\n🔍 Checking API keys:');
  
  for (let i = 1; i <= 5; i++) {
    const keyName = `GOOGLE_API_KEY_${i}`;
    const key = envVars[keyName];
    console.log(`  ${keyName}: "${key}"`);
    
    if (key && 
        key !== 'YOUR_SECOND_API_KEY_HERE' && 
        key !== 'YOUR_THIRD_API_KEY_HERE' && 
        key !== 'YOUR_FOURTH_API_KEY_HERE' && 
        key !== 'YOUR_FIFTH_API_KEY_HERE' &&
        key.length > 20) {
      keys.push(key);
      console.log(`    ✅ Valid key added (length: ${key.length})`);
    } else {
      console.log(`    ❌ Invalid or placeholder key`);
    }
  }
  
  console.log(`\n📊 Total valid keys found: ${keys.length}`);
  return keys;
}

async function main() {
  console.log('🔍 Debugging API Key Configuration...\n');
  
  const envVars = await loadEnvConfig();
  const apiKeys = getApiKeys(envVars);
  
  console.log('\n🎯 Final API Keys:');
  apiKeys.forEach((key, index) => {
    console.log(`  Key ${index + 1}: ${key.substring(0, 20)}...`);
  });
}

main().catch(console.error); 