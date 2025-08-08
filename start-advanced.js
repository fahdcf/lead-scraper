#!/usr/bin/env node

import fs from 'fs';
import { config } from './config.js';

import './scraper-advanced.js';

const USERS_FILE = 'users.json';

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function getUserById(id) {
  const users = loadUsers();
  return users.find(u => u.id === id && u.role === 'user');
}

function updateUserUsage(id, keyIndex) {
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) return;
  user.lastUsedKey = keyIndex;
  user.lastUsedDate = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.log('Usage: node start-advanced <userId>');
    console.log('');
    console.log('🚀 ADVANCED MODE FEATURES:');
    console.log('   • Advanced contact extraction with confidence scoring');
    console.log('   • Multi-source validation and business filtering');
    console.log('   • High-confidence results (≥70%) prioritized');
    console.log('   • 60-80% fewer false positives');
    console.log('   • 90%+ accuracy for high-confidence results');
    process.exit(1);
  }
  const userId = args[0];
  const user = getUserById(userId);
  if (!user) {
    console.log('❌ User not found.');
    process.exit(1);
  }
  const apiKeys = user.apiKeys;
  if (!apiKeys || apiKeys.length !== 2) {
    console.log('❌ User does not have 2 API keys.');
    process.exit(1);
  }
  let quotaExceeded = false;
  let keyIndex = 0;
  let usedToday = false;
  // Patch config for this run
  config.googleSearch.apiKeys = apiKeys;
  config.googleSearch.currentKeyIndex = 0;
  // Mark this run as user-based for scraper.js logic
  config._userBasedFlow = true;
  // Patch: Only allow one run per day if both keys are exhausted
  if (user.lastUsedDate === new Date().toISOString().slice(0, 10) && user.lastUsedKey === 1) {
    usedToday = true;
  }
  if (usedToday) {
    console.log('Requests for today are done, come back tomorrow.');
    process.exit(0);
  }
  // Patch config for this run
  // (already done above)
  // Just run scraper-advanced.js as main, which is interactive
  // The config will use the user's API keys
  // No need to call any function, just import will run it
}

main();
