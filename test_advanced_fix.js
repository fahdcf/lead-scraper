#!/usr/bin/env node

console.log('🧪 Testing Advanced Methods Fix\n');

import { AdvancedContactExtractor } from './helpers/advancedContactExtractor.js';

async function testAdvancedFix() {
  try {
    console.log('1️⃣ Testing AdvancedContactExtractor initialization...');
    
    const advancedExtractor = new AdvancedContactExtractor();
    console.log('✅ AdvancedContactExtractor initialized successfully');
    
    console.log('\n2️⃣ Testing with sample HTML...');
    
    const testHtml = `
    <html>
        <head>
            <title>Test Website</title>
        </head>
        <body>
            <div class="contact-section">
                <h2>Contact Us</h2>
                <p>Email: contact@test-website.ma</p>
                <p>Phone: +212 6 12 34 56 78</p>
                <p>Address: 123 Test Street, Fes, Morocco</p>
            </div>
            <footer>
                <p>Support: support@test-website.ma</p>
            </footer>
        </body>
    </html>
    `;
    
    const testUrl = 'https://www.test-website.ma';
    
    console.log('3️⃣ Testing advanced extraction...');
    const result = await advancedExtractor.extractContactInfoAdvanced(testUrl, testHtml);
    
    console.log('\n📊 Results:');
    console.log(`- Emails found: ${result.emails.length}`);
    console.log(`- Phones found: ${result.phones.length}`);
    console.log(`- Overall confidence: ${result.confidence}%`);
    
    if (result.emails.length > 0) {
      console.log('\n📧 Emails:');
      result.emails.forEach(email => {
        console.log(`  • ${email.value} (${email.confidence}% confidence)`);
      });
    }
    
    if (result.phones.length > 0) {
      console.log('\n📞 Phones:');
      result.phones.forEach(phone => {
        console.log(`  • ${phone.value} (${phone.confidence}% confidence)`);
      });
    }
    
    console.log('\n✅ Advanced methods are working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAdvancedFix();
