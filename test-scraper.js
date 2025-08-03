#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { initializeConfig, config } from './config.js';
import { searchGoogle, filterUrls, getApiKeyStats } from './helpers/googleSearch.js';
import { fetchPage, delay } from './helpers/fetchPage.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';
import { exportResults } from './helpers/exportToCsv.js';

/**
 * Save results periodically and on interruption
 */
async function saveResults(allResults, isInterrupted = false) {
  try {
    console.log(chalk.blue(`💾 Saving ${allResults.length} results...`));
    
    // Create final results (emails and phones only)
    const finalResults = allResults.map(result => ({
      email: result.email,
      phone: result.phone
    }));

    // Get unique counts for summary
    const uniqueEmails = new Set(allResults.filter(r => r.email).map(r => r.email));
    const uniquePhones = new Set(allResults.filter(r => r.phone).map(r => r.phone));

    // Generate filename
    const filename = isInterrupted ? `test_results_partial_${Date.now()}.csv` : 'test-results.csv';

    console.log(chalk.gray(`📁 Saving to: ${filename}`));

    // Export results
    await exportResults(finalResults, config.output.defaultFormat, filename);

    // Verify file was created
    const fs = await import('fs/promises');
    try {
      const stats = await fs.stat(filename);
      console.log(chalk.green(`✅ File verified: ${filename} (${stats.size} bytes)`));
    } catch (statError) {
      console.error(chalk.red(`❌ File verification failed: ${statError.message}`));
      throw new Error(`File was not created: ${filename}`);
    }

    // Display summary
    console.log(chalk.blue.bold(`\n📈 ${isInterrupted ? 'Partial' : 'Final'} Test Summary:`));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.green(`   • Total Email Entries: ${allResults.filter(r => r.email).length}`));
    console.log(chalk.green(`   • Total Phone Entries: ${allResults.filter(r => r.phone).length}`));
    console.log(chalk.green(`   • Unique Emails Found: ${uniqueEmails.size}`));
    console.log(chalk.green(`   • Unique Phones Found: ${uniquePhones.size}`));
    console.log(chalk.green(`   • Final Results: ${finalResults.length} rows`));

    // Display sample results
    if (finalResults.length > 0) {
      console.log(chalk.yellow.bold('\n📋 Sample Results:'));
      console.log(chalk.gray('─'.repeat(60)));
      finalResults.slice(0, 10).forEach((result, index) => {
        const dataType = result.email ? 'Email' : 'Phone';
        const data = result.email || result.phone;
        console.log(chalk.gray(`${index + 1}. ${dataType}: ${data}`));
      });
      
      if (finalResults.length > 10) {
        console.log(chalk.gray(`   ... and ${finalResults.length - 10} more results`));
      }
    }

    console.log(chalk.green.bold(`\n✅ Results saved to: ${filename}`));
    
    if (isInterrupted) {
      console.log(chalk.yellow(`⚠️  Test was interrupted. Partial results have been saved.`));
    }

    return filename;
  } catch (error) {
    console.error(chalk.red(`❌ Error saving results: ${error.message}`));
    console.error(chalk.red(`   Results count: ${allResults.length}`));
    console.error(chalk.red(`   Error details: ${error.stack}`));
    
    // Try to save with a simple fallback method
    try {
      console.log(chalk.yellow(`🔄 Attempting fallback save...`));
      const fs = await import('fs/promises');
      const fallbackFilename = `emergency_test_save_${Date.now()}.csv`;
      
      const csvContent = 'Email,Phone\n' + 
        allResults.map(r => `"${r.email || ''}","${r.phone || ''}"`).join('\n');
      
      await fs.writeFile(fallbackFilename, csvContent, 'utf8');
      console.log(chalk.green(`✅ Emergency save successful: ${fallbackFilename}`));
      return fallbackFilename;
    } catch (fallbackError) {
      console.error(chalk.red(`❌ Emergency save also failed: ${fallbackError.message}`));
      return null;
    }
  }
}

/**
 * Test Scraper - Runs a subset of queries for testing
 */
async function main() {
  console.log(chalk.blue.bold('🧪 Test Scraper Starting...\n'));

  // Initialize configuration
  await initializeConfig();

  // Use only first 3 queries for testing
  const testQueries = config.searchQueries.slice(0, 3);

  console.log(chalk.yellow('📋 Test Configuration:'));
  console.log(chalk.gray(`   • API Keys: ${config.googleSearch.apiKeys.length} available`));
  console.log(chalk.gray(`   • Test Queries: ${testQueries.length} (subset for testing)`));
  console.log(chalk.gray(`   • Request Delay: ${config.http.delayBetweenRequests}ms`));
  console.log(chalk.gray(`   • Max Results per Query: ${config.googleSearch.maxResultsPerQuery}`));
  console.log('');

  const allResults = [];
  const queryStats = {
    totalQueries: testQueries.length,
    completedQueries: 0,
    failedQueries: 0,
    totalUrlsFound: 0,
    totalUrlsScraped: 0,
    totalUrlsWithData: 0
  };

  console.log(chalk.blue.bold(`🔍 Starting test scraping of ${testQueries.length} queries...\n`));

  // Set up graceful interruption handling
  let isInterrupted = false;
  const handleInterruption = async () => {
    if (!isInterrupted) {
      isInterrupted = true;
      console.log(chalk.yellow.bold('\n⚠️  Interruption detected. Saving current results...'));
      await saveResults(allResults, true);
      process.exit(0);
    }
  };

  process.on('SIGINT', handleInterruption);
  process.on('SIGTERM', handleInterruption);

  // Process each query sequentially
  for (let i = 0; i < testQueries.length; i++) {
    if (isInterrupted) break;
    
    const query = testQueries[i];
    const queryNumber = i + 1;
    
    console.log(chalk.cyan.bold(`\n📊 Test Query ${queryNumber}/${testQueries.length}: "${query}"`));
    console.log(chalk.gray('─'.repeat(60)));
    
    const querySpinner = ora(`🔍 Searching Google for: "${query}"`).start();

    try {
      // Search Google for URLs
      const searchResults = await searchGoogle(query);
      querySpinner.text = `🔍 Found ${searchResults.length} URLs for: "${query}"`;
      queryStats.totalUrlsFound += searchResults.length;

      // Filter out irrelevant URLs
      const filteredUrls = filterUrls(searchResults);
      querySpinner.text = `🔍 Filtered to ${filteredUrls.length} relevant URLs for: "${query}"`;

      if (filteredUrls.length === 0) {
        querySpinner.warn(`⚠️  No relevant URLs found for: "${query}"`);
        queryStats.failedQueries++;
        continue;
      }

      console.log(chalk.green(`   ✅ Found ${filteredUrls.length} relevant URLs`));
      querySpinner.stop();

      // Process each URL sequentially
      for (let j = 0; j < filteredUrls.length; j++) {
        if (isInterrupted) break;
        
        const urlData = filteredUrls[j];
        const url = urlData.url;
        const urlNumber = j + 1;
        
        const urlSpinner = ora(`🌐 Scraping URL ${urlNumber}/${filteredUrls.length}: ${url}`).start();

        try {
          // Fetch page content
          const html = await fetchPage(url);
          
          if (!html) {
            urlSpinner.fail(`❌ Failed to fetch: ${url}`);
            continue;
          }

          // Extract emails and phones
          const emails = extractEmails(html);
          const phones = extractPhones(html);

          // Add to results (without URL info)
          if (emails.length > 0 || phones.length > 0) {
            // Create separate entries for each email and phone
            emails.forEach(email => {
              allResults.push({
                email: email.toLowerCase(),
                phone: ''
              });
            });
            
            phones.forEach(phone => {
              allResults.push({
                email: '',
                phone: phone
              });
            });
            
            urlSpinner.succeed(`✅ Found ${emails.length} emails, ${phones.length} phones: ${url}`);
            queryStats.totalUrlsWithData++;
          } else {
            urlSpinner.warn(`⚠️  No data found: ${url}`);
          }

          queryStats.totalUrlsScraped++;

          // Add delay between requests
          if (j < filteredUrls.length - 1) {
            await delay();
          }

        } catch (error) {
          urlSpinner.fail(`❌ Error processing ${url}: ${error.message}`);
        }
      }

      queryStats.completedQueries++;
      console.log(chalk.green(`   ✅ Completed query "${query}" - Scraped ${filteredUrls.length} URLs`));

      // Show API key stats
      const apiStats = getApiKeyStats();
      console.log(chalk.gray(`   🔑 Using API key ${apiStats.currentKeyIndex + 1}/${apiStats.totalKeys}`));

      // Add delay between queries
      if (i < testQueries.length - 1) {
        console.log(chalk.yellow(`   ⏳ Waiting ${config.http.delayBetweenRequests}ms before next query...`));
        await delay(3000); // Longer delay between queries
      }

    } catch (error) {
      querySpinner.fail(`❌ Error processing query "${query}": ${error.message}`);
      queryStats.failedQueries++;
      
      // Check if it's a quota error
      if (error.message.includes('quota') || error.message.includes('Quota') || 
          error.message.includes('rate limit') || error.message.includes('429')) {
        console.log(chalk.red(`❌ API quota exceeded. Saving current results...`));
        await saveResults(allResults, true);
        process.exit(0);
      }
    }
  }

  // Process final results
  console.log(chalk.blue.bold('\n📊 Processing Final Results...'));
  console.log(chalk.gray('─'.repeat(60)));

  // Display comprehensive summary
  console.log(chalk.green.bold('\n📈 Final Test Summary:'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.green(`   • Queries Processed: ${queryStats.completedQueries}/${queryStats.totalQueries}`));
  console.log(chalk.green(`   • Failed Queries: ${queryStats.failedQueries}`));
  console.log(chalk.green(`   • Total URLs Found: ${queryStats.totalUrlsFound}`));
  console.log(chalk.green(`   • Total URLs Scraped: ${queryStats.totalUrlsScraped}`));
  console.log(chalk.green(`   • URLs with Data: ${queryStats.totalUrlsWithData}`));

  // Show API key usage
  const finalApiStats = getApiKeyStats();
  console.log(chalk.blue(`\n🔑 API Key Usage:`));
  console.log(chalk.blue(`   • Total Keys Available: ${finalApiStats.totalKeys}`));
  console.log(chalk.blue(`   • Current Key Index: ${finalApiStats.currentKeyIndex + 1}`));

  // Save final results
  await saveResults(allResults, false);
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