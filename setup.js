#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs/promises';
import { config } from './config.js';

console.log(chalk.blue.bold('🔧 Web Scraper CLI Setup\n'));

console.log(chalk.yellow('📋 Current Configuration:'));
console.log(chalk.gray('Google API Key:'), config.googleSearch.apiKey ? '✅ Set' : '❌ Not set');
console.log(chalk.gray('Search Engine ID:'), config.googleSearch.searchEngineId ? '✅ Set' : '❌ Not set');
console.log(chalk.gray('Search Queries:'), config.searchQueries.length, 'queries configured');
console.log(chalk.gray('Delay between requests:'), config.http.delayBetweenRequests + 'ms');
console.log('');

console.log(chalk.yellow('📝 To customize the scraper:'));
console.log(chalk.gray('1. Edit config.js to update:'));
console.log(chalk.gray('   - Google Custom Search API key'));
console.log(chalk.gray('   - Google Custom Search Engine ID'));
console.log(chalk.gray('   - Search queries'));
console.log(chalk.gray('   - Request delays'));
console.log('');

console.log(chalk.yellow('🚀 Usage Examples:'));
console.log(chalk.gray('# Basic usage (uses queries from config.js)'));
console.log(chalk.cyan('node index.js'));
console.log('');
console.log(chalk.gray('# Export to Excel'));
console.log(chalk.cyan('node index.js --format xlsx'));
console.log('');
console.log(chalk.gray('# Use custom queries'));
console.log(chalk.cyan('node index.js --queries "dentiste+Marrakech,clinique+Rabat"'));
console.log('');
console.log(chalk.gray('# Scrape direct URLs from JSON file'));
console.log(chalk.cyan('node index-direct-urls.js --input urls.json'));
console.log('');

console.log(chalk.yellow('📁 Files created:'));
console.log(chalk.gray('• config.js - Configuration file'));
console.log(chalk.gray('• index.js - Main scraper (Google search)'));
console.log(chalk.gray('• index-direct-urls.js - Direct URL scraper'));
console.log(chalk.gray('• helpers/ - Helper functions'));
console.log(chalk.gray('• example-urls.json - Example URL file'));
console.log('');

console.log(chalk.green.bold('✅ Setup complete! You can now run the scraper.'));
console.log(chalk.gray('Run "node index.js --help" for more options.')); 