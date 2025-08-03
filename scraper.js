#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { initializeConfig, config } from './config.js';
import { searchGoogle, filterUrls, getApiKeyStats } from './helpers/googleSearch.js';
import { fetchPage, delay } from './helpers/fetchPage.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';
import { exportResults } from './helpers/exportToCsv.js';
import { generateQueriesWithGemini } from './helpers/geminiAI.js';
import readline from 'readline';

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Get user input with prompt
 */
function getUserInput(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Save results periodically and on interruption
 */
async function saveResults(allResults, niche, isInterrupted = false) {
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
    const filename = niche ? `${niche.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv` : config.output.csvFile;
    
    // Add timestamp if interrupted
    const finalFilename = isInterrupted ? filename.replace('.csv', `_partial_${Date.now()}.csv`) : filename;

    console.log(chalk.gray(`📁 Saving to: ${finalFilename}`));

    // Export results
    await exportResults(finalResults, config.output.defaultFormat, finalFilename);

    // Verify file was created
    const fs = await import('fs/promises');
    try {
      const stats = await fs.stat(finalFilename);
      console.log(chalk.green(`✅ File verified: ${finalFilename} (${stats.size} bytes)`));
    } catch (statError) {
      console.error(chalk.red(`❌ File verification failed: ${statError.message}`));
      throw new Error(`File was not created: ${finalFilename}`);
    }

    // Display summary
    console.log(chalk.blue.bold(`\n📈 ${isInterrupted ? 'Partial' : 'Final'} Scraping Summary:`));
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

    console.log(chalk.green.bold(`\n✅ Results saved to: ${finalFilename}`));
    
    if (isInterrupted) {
      console.log(chalk.yellow(`⚠️  Scraping was interrupted. Partial results have been saved.`));
    }

    return finalFilename;
  } catch (error) {
    console.error(chalk.red(`❌ Error saving results: ${error.message}`));
    console.error(chalk.red(`   Results count: ${allResults.length}`));
    console.error(chalk.red(`   Error details: ${error.stack}`));
    
    // Try to save with a simple fallback method
    try {
      console.log(chalk.yellow(`🔄 Attempting fallback save...`));
      const fs = await import('fs/promises');
      const fallbackFilename = `emergency_save_${Date.now()}.csv`;
      
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
 * Main Morocco Dentist Scraper
 * Runs all 20 queries and scrapes emails/phones from all found URLs
 */
async function main() {
  console.log(chalk.blue.bold('🚀 Morocco Scraper Starting...\n'));
  
  // Check for command-line API key
  const commandLineApiKey = process.argv[2];
  let customApiKey = null;
  let customQueries = null;
  let niche = null;
  
  if (commandLineApiKey && commandLineApiKey.startsWith('AIza')) {
    customApiKey = commandLineApiKey;
    console.log(chalk.green(`🔑 Using custom API key: ${customApiKey.substring(0, 20)}...`));
    
    // Get niche from user
    const rl = createReadlineInterface();
    niche = await getUserInput(rl, chalk.yellow('🎯 Enter your niche (e.g., "dentists in casablanca"): '));
    rl.close();
    
    if (niche) {
      console.log(chalk.blue(`🤖 Generating 25 search queries for: "${niche}"`));
      console.log(chalk.gray('   • 15 queries in French'));
      console.log(chalk.gray('   • 10 queries in Arabic'));
      
      try {
        customQueries = await generateQueriesWithGemini(niche);
        console.log(chalk.green(`✅ Generated ${customQueries.length} queries successfully!`));
      } catch (error) {
        console.error(chalk.red(`❌ Error generating queries: ${error.message}`));
        console.log(chalk.yellow('🔄 Falling back to default queries...'));
      }
    }
  }
  
  // Initialize configuration
  await initializeConfig();
  
  // Override API key if provided
  if (customApiKey) {
    config.googleSearch.apiKeys = [customApiKey];
    config.googleSearch.currentKeyIndex = 0;
  }
  
  // Override queries if generated
  if (customQueries && customQueries.length > 0) {
    config.searchQueries = customQueries;
  }
  
  console.log(chalk.yellow('📋 Configuration:'));
  console.log(chalk.gray(`   • API Keys: ${config.googleSearch.apiKeys.length} available`));
  console.log(chalk.gray(`   • Search Queries: ${config.searchQueries.length} configured`));
  console.log(chalk.gray(`   • Request Delay: ${config.http.delayBetweenRequests}ms`));
  console.log(chalk.gray(`   • Max Results per Query: ${config.googleSearch.maxResultsPerQuery}`));
  if (niche) {
    console.log(chalk.gray(`   • Niche: ${niche}`));
  }
  console.log('');

  const allResults = [];
  const queryStats = {
    totalQueries: config.searchQueries.length,
    completedQueries: 0,
    failedQueries: 0,
    totalUrlsFound: 0,
    totalUrlsScraped: 0,
    totalUrlsWithData: 0
  };

  console.log(chalk.blue.bold(`🔍 Starting scraping of ${config.searchQueries.length} queries...\n`));

  // Set up graceful interruption handling
  let isInterrupted = false;
  const handleInterruption = async () => {
    if (!isInterrupted) {
      isInterrupted = true;
      console.log(chalk.yellow.bold('\n⚠️  Interruption detected. Saving current results...'));
      await saveResults(allResults, niche, true);
      process.exit(0);
    }
  };

  process.on('SIGINT', handleInterruption);
  process.on('SIGTERM', handleInterruption);

  // Process each query sequentially
  for (let i = 0; i < config.searchQueries.length; i++) {
    if (isInterrupted) break;
    
    const query = config.searchQueries[i];
    const queryNumber = i + 1;
    
    console.log(chalk.cyan.bold(`\n📊 Query ${queryNumber}/${config.searchQueries.length}: "${query}"`));
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

      // Save results periodically (every 5 queries)
      if (queryStats.completedQueries % 5 === 0) {
        console.log(chalk.blue(`💾 Saving intermediate results...`));
        await saveResults(allResults, niche, false);
      }

      // Add delay between queries
      if (i < config.searchQueries.length - 1) {
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
        await saveResults(allResults, niche, true);
        process.exit(0);
      }
    }
  }

  // Process final results
  console.log(chalk.blue.bold('\n📊 Processing Final Results...'));
  console.log(chalk.gray('─'.repeat(60)));

  // Display comprehensive summary
  console.log(chalk.green.bold('\n📈 Final Scraping Summary:'));
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
  await saveResults(allResults, niche, false);
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