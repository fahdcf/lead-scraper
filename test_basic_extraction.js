#!/usr/bin/env node

console.log('🔍 Testing Basic Email Extraction (Bypassing Config)\n');

try {
    console.log('1️⃣ Testing email extraction without config validation...');
    
    const testHtml = `
    <html>
        <body>
            <p>Contact us: contact@example.com</p>
            <p>Email: info@test.com</p>
            <p>Business: sales@agence-web-fes.ma</p>
            <p>Phone: +212 6 12 34 56 78</p>
        </body>
    </html>
    `;
    
    // Test the regex patterns manually
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!png|jpg|gif|jpeg|svg|webp)[a-zA-Z]{2,}/gi;
    const matches = testHtml.match(emailPattern);
    
    console.log('Raw regex matches:', matches);
    
    // Test email validation manually
    const testEmails = ['contact@example.com', 'info@test.com', 'sales@agence-web-fes.ma'];
    
    console.log('\n2️⃣ Testing email validation:');
    testEmails.forEach(email => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const isValid = emailRegex.test(email);
        console.log(`${email}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });
    
    console.log('\n✅ Basic extraction test completed');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}
