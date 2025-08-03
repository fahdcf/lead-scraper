#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import { config } from './config.js';
import { fetchPage, delay } from './helpers/fetchPage.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';
import { exportResults } from './helpers/exportToCsv.js';

const program = new Command();

program
  .name('web-scraper-direct-urls')
  .description('CLI tool to scrape emails and phone numbers from direct URLs')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format (csv or xlsx)', 'csv')
  .option('-i, --input <filename>', 'Input JSON file with URLs', 'urls.json')
  .option('-o, --output <filename>', 'Output filename')
  .parse();

const options = program.opts();

/**
 * Load URLs from JSON file
 * @param {string} filename - JSON file containing URLs
 * @returns {Promise<string[]>} - Array of URLs
 */
async function loadUrlsFromFile(filename) {
  try {
    const data = await fs.readFile(filename, 'utf8');
    const urls = JSON.parse(data);
    
    if (!Array.isArray(urls)) {
      throw new Error('JSON file must contain an array of URLs');
    }
    
    return urls.filter(url => typeof url === 'string' && url.trim() !== '');
  } catch (error) {
    console.error(chalk.red(`❌ Error loading URLs from ${filename}:`, error.message));
    process.exit(1);
  }
}

/**
 * Main scraping function for direct URLs
 */
async function main() {
  console.log(chalk.blue.bold('🚀 Web Scraper CLI (Direct URLs) Starting...\n'));

  // Load URLs from file
  const spinner = ora(`📂 Loading URLs from ${options.input}`).start();
  const urls = await loadUrlsFromFile(options.input);
  spinner.succeed(`📂 Loaded ${urls.length} URLs from ${options.input}`);

  console.log(chalk.yellow(`📋 Processing ${urls.length} URLs...`));
  console.log(chalk.gray('URLs:', urls.slice(0, 5).join(', ') + (urls.length > 5 ? '...' : '')));
  console.log('');

  const allResults = [];
  const allEmails = new Set();
  const allPhones = new Set();

  // Process each URL sequentially
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const spinner = ora(`🌐 Scraping (${i + 1}/${urls.length}): ${url}`).start();

    try {
      // Fetch page content
      const html = await fetchPage(url);
      
      if (!html) {
        spinner.fail(`❌ Failed to fetch: ${url}`);
        continue;
      }

      // Extract emails and phones
      const emails = extractEmails(html);
      const phones = extractPhones(html);

      // Add to global sets for deduplication
      emails.forEach(email => allEmails.add(email.toLowerCase()));
      phones.forEach(phone => allPhones.add(phone));

      // Add to results
      if (emails.length > 0 || phones.length > 0) {
        allResults.push({
          url: url,
          emails: emails,
          phones: phones
        });
        spinner.succeed(`✅ Found ${emails.length} emails, ${phones.length} phones: ${url}`);
      } else {
        spinner.warn(`⚠️  No data found: ${url}`);
      }

      // Add delay between requests
      if (i < urls.length - 1) {
        await delay();
      }

    } catch (error) {
      spinner.fail(`❌ Error processing ${url}: ${error.message}`);
    }
  }

  // Process final results
  console.log('\n' + chalk.blue.bold('📊 Processing Results...'));

  // Convert to final format (same as n8n workflow)
  const finalResults = [];
  const emailsArray = Array.from(allEmails);
  const phonesArray = Array.from(allPhones);
  
  const maxLength = Math.max(emailsArray.length, phonesArray.length);
  
  for (let i = 0; i < maxLength; i++) {
    finalResults.push({
      email: emailsArray[i] || '',
      phone: phonesArray[i] || ''
    });
  }

  // Display summary
  console.log(chalk.green.bold('\n📈 Scraping Summary:'));
  console.log(chalk.green(`   • Total URLs processed: ${urls.length}`));
  console.log(chalk.green(`   • URLs with data: ${allResults.length}`));
  console.log(chalk.green(`   • Unique emails found: ${emailsArray.length}`));
  console.log(chalk.green(`   • Unique phones found: ${phonesArray.length}`));
  console.log(chalk.green(`   • Final results: ${finalResults.length} rows`));

  // Export results
  const outputFormat = options.format || config.output.defaultFormat;
  const outputFile = options.output || (outputFormat === 'xlsx' ? config.output.xlsxFile : config.output.csvFile);
  
  console.log(chalk.blue.bold(`\n💾 Exporting to ${outputFormat.toUpperCase()}...`));
  await exportResults(finalResults, outputFormat);

  // Display sample results
  if (finalResults.length > 0) {
    console.log(chalk.yellow.bold('\n📋 Sample Results:'));
    finalResults.slice(0, 5).forEach((result, index) => {
      console.log(chalk.gray(`${index + 1}. Email: ${result.email || 'N/A'} | Phone: ${result.phone || 'N/A'}`));
    });
    
    if (finalResults.length > 5) {
      console.log(chalk.gray(`   ... and ${finalResults.length - 5} more results`));
    }
  }

  console.log(chalk.green.bold('\n✅ Scraping completed successfully!'));
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error(chalk.red.bold('\n❌ Unhandled error:'), error.message);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
  process.exit(1);
}); 