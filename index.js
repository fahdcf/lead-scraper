#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { config } from './config.js';
import { searchGoogle, filterUrls } from './helpers/googleSearch.js';
import { fetchPage, delay } from './helpers/fetchPage.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';
import { exportResults } from './helpers/exportToCsv.js';

const program = new Command();

program
  .name('web-scraper-cli')
  .description('CLI tool to scrape emails and phone numbers from company URLs')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format (csv or xlsx)', 'csv')
  .option('-q, --queries <queries>', 'Custom search queries (comma-separated)')
  .option('-o, --output <filename>', 'Output filename')
  .parse();

const options = program.opts();

/**
 * Main scraping function
 */
async function main() {
  console.log(chalk.blue.bold('🚀 Web Scraper CLI Starting...\n'));

  // Use custom queries if provided, otherwise use config
  const queries = options.queries 
    ? options.queries.split(',').map(q => q.trim())
    : config.searchQueries;

  console.log(chalk.yellow(`📋 Processing ${queries.length} search queries...`));
  console.log(chalk.gray('Queries:', queries.join(', ')));
  console.log('');

  const allResults = [];
  const allEmails = new Set();
  const allPhones = new Set();

  // Process each query sequentially
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const spinner = ora(`🔍 Searching for: "${query}"`).start();

    try {
      // Search Google for URLs
      const searchResults = await searchGoogle(query);
      spinner.text = `🔍 Found ${searchResults.length} URLs for: "${query}"`;

      // Filter out irrelevant URLs
      const filteredUrls = filterUrls(searchResults);
      spinner.text = `🔍 Filtered to ${filteredUrls.length} relevant URLs for: "${query}"`;

      if (filteredUrls.length === 0) {
        spinner.warn(`⚠️  No relevant URLs found for: "${query}"`);
        continue;
      }

      // Process each URL sequentially
      for (let j = 0; j < filteredUrls.length; j++) {
        const urlData = filteredUrls[j];
        const url = urlData.url;
        
        spinner.text = `🌐 Scraping (${j + 1}/${filteredUrls.length}): ${url}`;

        // Fetch page content
        const html = await fetchPage(url);
        
        if (!html) {
          console.log(chalk.red(`❌ Failed to fetch: ${url}`));
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
        }

        // Add delay between requests
        if (j < filteredUrls.length - 1) {
          await delay();
        }
      }

      spinner.succeed(`✅ Completed query "${query}" - Found ${filteredUrls.length} URLs`);

      // Add delay between queries
      if (i < queries.length - 1) {
        await delay(3000); // Longer delay between queries
      }

    } catch (error) {
      spinner.fail(`❌ Error processing query "${query}": ${error.message}`);
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
  console.log(chalk.green(`   • Total URLs processed: ${allResults.length}`));
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