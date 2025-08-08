#!/usr/bin/env node

console.log('🧪 Simple Test - Checking Imports\n');

try {
    console.log('1️⃣ Testing basic imports...');
    
    const { extractEmails } = await import('./helpers/extractEmails.js');
    const { extractPhones } = await import('./helpers/extractPhones.js');
    
    console.log('✅ Basic imports successful');
    
    console.log('\n2️⃣ Testing basic extraction...');
    
    const testHtml = `
    <html>
        <body>
            <p>Contact us: contact@example.com</p>
            <p>Phone: +212 6 12 34 56 78</p>
        </body>
    </html>
    `;
    
    const emails = extractEmails(testHtml);
    const phones = extractPhones(testHtml);
    
    console.log('Emails found:', emails);
    console.log('Phones found:', phones);
    
    console.log('\n✅ Basic extraction test successful');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}
