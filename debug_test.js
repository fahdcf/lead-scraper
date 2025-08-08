#!/usr/bin/env node

console.log('🔍 Debug Test - Email Extraction\n');

try {
    console.log('1️⃣ Testing email extraction step by step...');
    
    const { extractEmails } = await import('./helpers/extractEmails.js');
    
    const testHtml = `
    <html>
        <body>
            <p>Contact us: contact@example.com</p>
            <p>Email: info@test.com</p>
            <p>Phone: +212 6 12 34 56 78</p>
        </body>
    </html>
    `;
    
    console.log('Test HTML:', testHtml);
    
    // Test the regex patterns manually
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!png|jpg|gif|jpeg|svg|webp)[a-zA-Z]{2,}/gi;
    const matches = testHtml.match(emailPattern);
    
    console.log('Raw regex matches:', matches);
    
    // Test the full extraction
    const emails = extractEmails(testHtml);
    console.log('Final emails:', emails);
    
    console.log('\n✅ Debug test completed');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}
