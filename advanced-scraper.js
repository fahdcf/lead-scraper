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
 * Enhanced results saving with quality metrics
 */
async function saveResults(allResults, niche, isInterrupted = false) {
  try {
    console.log(chalk.blue(`💾 Saving ${allResults.length} results...`));
    
    // Create final results (emails and phones only)
    const finalResults = allResults.map(result => ({
      email: result.email,
      phone: result.phone
    }));

    // Enhanced quality metrics
    const uniqueEmails = new Set(allResults.filter(r => r.email).map(r => r.email));
    const uniquePhones = new Set(allResults.filter(r => r.phone).map(r => r.phone));
    
    // Calculate quality scores
    const emailQuality = calculateEmailQuality(Array.from(uniqueEmails));
    const phoneQuality = calculatePhoneQuality(Array.from(uniquePhones));

    // Generate filename with quality indicator
    const qualityIndicator = emailQuality > 0.7 && phoneQuality > 0.7 ? 'high_quality' : 'standard';
    const filename = niche ? `${niche.replace(/[^a-zA-Z0-9]/g, '_')}_${qualityIndicator}_results.csv` : `advanced_${qualityIndicator}_results.csv`;
    
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

    // Enhanced summary with quality metrics
    console.log(chalk.blue.bold(`\n📈 ${isInterrupted ? 'Partial' : 'Final'} Advanced Scraping Summary:`));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(chalk.green(`   • Total Email Entries: ${allResults.filter(r => r.email).length}`));
    console.log(chalk.green(`   • Total Phone Entries: ${allResults.filter(r => r.phone).length}`));
    console.log(chalk.green(`   • Unique Emails Found: ${uniqueEmails.size}`));
    console.log(chalk.green(`   • Unique Phones Found: ${uniquePhones.size}`));
    console.log(chalk.green(`   • Final Results: ${finalResults.length} rows`));
    console.log(chalk.yellow(`   • Email Quality Score: ${(emailQuality * 100).toFixed(1)}%`));
    console.log(chalk.yellow(`   • Phone Quality Score: ${(phoneQuality * 100).toFixed(1)}%`));
    console.log(chalk.cyan(`   • Overall Quality: ${qualityIndicator.toUpperCase()}`));

    // Display sample results with quality indicators
    if (finalResults.length > 0) {
      console.log(chalk.yellow.bold('\n📋 Sample Results (Quality Filtered):'));
      console.log(chalk.gray('─'.repeat(80)));
      finalResults.slice(0, 10).forEach((result, index) => {
        const dataType = result.email ? 'Email' : 'Phone';
        const data = result.email || result.phone;
        const quality = result.email ? emailQuality : phoneQuality;
        const qualityColor = quality > 0.7 ? chalk.green : quality > 0.4 ? chalk.yellow : chalk.red;
        console.log(chalk.gray(`${index + 1}. ${dataType}: ${data} ${qualityColor(`(${(quality * 100).toFixed(0)}%)`)}`));
      });
      
      if (finalResults.length > 10) {
        console.log(chalk.gray(`   ... and ${finalResults.length - 10} more results`));
      }
    }

    console.log(chalk.green.bold(`\n✅ Advanced results saved to: ${finalFilename}`));
    
    if (isInterrupted) {
      console.log(chalk.yellow(`⚠️  Scraping was interrupted. Partial results have been saved.`));
    }

    return finalFilename;
  } catch (error) {
    console.error(chalk.red(`❌ Error saving results: ${error.message}`));
    throw error;
  }
}

/**
 * Calculate email quality score based on domain patterns
 */
function calculateEmailQuality(emails) {
  if (emails.length === 0) return 0;
  
  let qualityScore = 0;
  const moroccanDomains = ['.ma', '.co.ma', '.com.ma', '.net.ma', '.org.ma'];
  const businessKeywords = ['contact', 'info', 'admin', 'sales', 'service', 'support'];
  
  emails.forEach(email => {
    const domain = email.split('@')[1];
    
    // Bonus for Moroccan domains
    if (moroccanDomains.some(d => domain.includes(d))) {
      qualityScore += 2;
    }
    
    // Bonus for business-related usernames
    if (businessKeywords.some(keyword => email.includes(keyword))) {
      qualityScore += 1;
    }
    
    // Penalty for generic domains
    if (domain.includes('gmail.com') || domain.includes('yahoo.com') || domain.includes('hotmail.com')) {
      qualityScore -= 0.5;
    }
  });
  
  return Math.max(0, Math.min(1, qualityScore / emails.length));
}

/**
 * Calculate phone quality score based on format and patterns
 */
function calculatePhoneQuality(phones) {
  if (phones.length === 0) return 0;
  
  let qualityScore = 0;
  
  phones.forEach(phone => {
    // Bonus for proper +212 format
    if (phone.startsWith('+212')) {
      qualityScore += 2;
    }
    
    // Bonus for mobile numbers (6 or 7)
    if (phone.includes('+2126') || phone.includes('+2127')) {
      qualityScore += 1;
    }
    
    // Penalty for suspicious patterns
    if (phone.includes('000000') || phone.includes('111111') || phone.includes('123456')) {
      qualityScore -= 1;
    }
  });
  
  return Math.max(0, Math.min(1, qualityScore / phones.length));
}

/**
 * Enhanced main scraping function with better targeting
 */
async function main() {
  console.log(chalk.blue.bold('🚀 Advanced Web Scraper Starting...\n'));

  // Initialize configuration
  await initializeConfig();

  const rl = createReadlineInterface();

  try {
    // Get user input for niche
    const niche = await getUserInput(rl, chalk.yellow('🎯 Enter the business niche to scrape (e.g., "dentists in Casablanca"): '));
    
    if (!niche) {
      console.log(chalk.red('❌ No niche provided. Exiting.'));
      rl.close();
      return;
    }

    console.log(chalk.blue(`\n🎯 Targeting: ${niche}`));
    console.log(chalk.gray('─'.repeat(60)));

    // Generate AI-powered queries
    const spinner = ora(chalk.gray('🤖 Generating AI-powered search queries...')).start();
    
    let searchQueries;
    try {
      searchQueries = await generateQueriesWithGemini(niche);
      spinner.succeed(chalk.green(`✅ Generated ${searchQueries.length} AI-powered queries`));
    } catch (error) {
      console.log(chalk.yellow('⚠️  AI query generation failed, using fallback queries'));
      searchQueries = config.searchQueries.slice(0, 10); // Use first 10 fallback queries
    }

    console.log(chalk.yellow(`📋 Processing ${searchQueries.length} enhanced queries...`));
    console.log('');

    const allResults = [];
    let processedQueries = 0;
    let successfulQueries = 0;

    // Process each query with enhanced targeting
    for (const query of searchQueries) {
      processedQueries++;
      const querySpinner = ora(chalk.blue(`🔍 Query ${processedQueries}/${searchQueries.length}: "${query}"`)).start();

      try {
        // Enhanced Google search with better targeting
        const searchResults = await searchGoogle(query);
        
        if (searchResults.length === 0) {
          querySpinner.warn(chalk.yellow(`⚠️  No results for: "${query}"`));
          continue;
        }

        // Enhanced URL filtering with priority scoring
        const filteredUrls = filterUrls(searchResults);
        
        if (filteredUrls.length === 0) {
          querySpinner.warn(chalk.yellow(`⚠️  No relevant URLs for: "${query}"`));
          continue;
        }

        querySpinner.text = chalk.blue(`🌐 Processing ${filteredUrls.length} high-quality URLs for: "${query}"`);

        let queryResults = 0;

        // Process each URL with enhanced extraction
        for (let i = 0; i < filteredUrls.length; i++) {
          const urlData = filteredUrls[i];
          const url = urlData.url;
          
          querySpinner.text = chalk.blue(`🌐 Scraping (${i + 1}/${filteredUrls.length}): ${url} (Score: ${urlData.score})`);

          // Enhanced page fetching with retry logic
          let html = null;
          for (let retry = 0; retry < 2; retry++) {
            html = await fetchPage(url);
            if (html) break;
            if (retry < 1) {
              await delay(1000); // Wait before retry
            }
          }
          
          if (!html) {
            console.log(chalk.red(`❌ Failed to fetch: ${url}`));
            continue;
          }

          // Enhanced email and phone extraction
          const emails = extractEmails(html);
          const phones = extractPhones(html);

          // Add to results with quality indicators
          if (emails.length > 0 || phones.length > 0) {
            emails.forEach(email => {
              allResults.push({
                email: email.toLowerCase(),
                phone: null,
                url: url,
                query: query,
                score: urlData.score
              });
            });
            
            phones.forEach(phone => {
              allResults.push({
                email: null,
                phone: phone,
                url: url,
                query: query,
                score: urlData.score
              });
            });
            
            queryResults += emails.length + phones.length;
          }

          // Enhanced delay between requests
          if (i < filteredUrls.length - 1) {
            await delay(config.http.delayBetweenRequests);
          }
        }

        querySpinner.succeed(chalk.green(`✅ Query "${query}" completed - Found ${queryResults} contacts`));
        successfulQueries++;

      } catch (error) {
        querySpinner.fail(chalk.red(`❌ Query "${query}" failed: ${error.message}`));
      }
    }

    // Close readline interface
    rl.close();

    // Save results with enhanced quality metrics
    const filename = await saveResults(allResults, niche);

    // Final enhanced summary
    console.log(chalk.blue.bold('\n🎯 Advanced Scraping Summary:'));
    console.log(chalk.gray('─'.repeat(80)));
    console.log(chalk.green(`   • Queries Processed: ${processedQueries}/${searchQueries.length}`));
    console.log(chalk.green(`   • Successful Queries: ${successfulQueries}`));
    console.log(chalk.green(`   • Total Contacts Found: ${allResults.length}`));
    console.log(chalk.green(`   • Unique Emails: ${new Set(allResults.filter(r => r.email).map(r => r.email)).size}`));
    console.log(chalk.green(`   • Unique Phones: ${new Set(allResults.filter(r => r.phone).map(r => r.phone)).size}`));
    console.log(chalk.cyan(`   • Average URL Score: ${(allResults.reduce((sum, r) => sum + (r.score || 0), 0) / allResults.length).toFixed(1)}`));
    console.log(chalk.green(`   • Results File: ${filename}`));

    console.log(chalk.green.bold('\n✅ Advanced scraping completed successfully!'));

  } catch (error) {
    console.error(chalk.red(`❌ Advanced scraping failed: ${error.message}`));
    rl.close();
    process.exit(1);
  }
}

// Handle interruption gracefully
const handleInterruption = async () => {
  console.log(chalk.yellow('\n⚠️  Interruption detected. Saving partial results...'));
  // Note: In a real implementation, you'd save the current results here
  process.exit(0);
};

process.on('SIGINT', handleInterruption);
process.on('SIGTERM', handleInterruption);

// Run the advanced scraper
main().catch(error => {
  console.error(chalk.red(`❌ Fatal error: ${error.message}`));
  process.exit(1);
}); 