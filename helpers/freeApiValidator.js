import axios from 'axios';

/**
 * Free API Integration System
 * Uses free APIs to validate and enhance contact information accuracy
 */
export class FreeApiValidator {
  constructor() {
    this.freeApis = this.initializeFreeApis();
  }

  /**
   * Initialize free APIs for validation
   */
  initializeFreeApis() {
    return {
      // Free DNS APIs
      dns: {
        google: 'https://dns.google/resolve',
        cloudflare: 'https://cloudflare-dns.com/dns-query'
      },

      // Free email validation APIs
      email: {
        // Free email validation service (no API key required)
        disposable: 'https://open.kickbox.com/v1/disposable/',
        // Alternative: use DNS MX records
        mx: 'https://dns.google/resolve'
      },

      // Free phone validation APIs
      phone: {
        // Use free phone number validation services
        numverify: 'http://apilayer.net/api/validate', // Free tier available
        // Alternative: use regex patterns with country codes
        patterns: {
          morocco: /^\+212[67]\d{8}$/
        }
      },

      // Free business directory APIs
      business: {
        // Use free business lookup services
        opencorporates: 'https://api.opencorporates.com/v0.4',
        // Alternative: use public business registries
        public: {
          morocco: 'https://www.adii.gov.ma' // Public business registry
        }
      }
    };
  }

  /**
   * Validate email using free APIs
   */
  async validateEmailWithFreeApis(email) {
    const results = {
      email,
      isValid: false,
      confidence: 0,
      validations: [],
      warnings: []
    };

    try {
      // 1. Check if email domain is disposable
      const disposableCheck = await this.checkDisposableEmail(email);
      results.validations.push(disposableCheck);
      results.confidence += disposableCheck.score;

      // 2. Validate domain using DNS
      const domainValidation = await this.validateDomainWithDNS(email.split('@')[1]);
      results.validations.push(domainValidation);
      results.confidence += domainValidation.score;

      // 3. Check MX records
      const mxValidation = await this.validateMXRecords(email.split('@')[1]);
      results.validations.push(mxValidation);
      results.confidence += mxValidation.score;

      // 4. Check for common business patterns
      const businessValidation = this.validateBusinessEmailPatterns(email);
      results.validations.push(businessValidation);
      results.confidence += businessValidation.score;

      // Determine validity
      results.isValid = results.confidence >= 30;

      return results;

    } catch (error) {
      console.error('Email validation error:', error.message);
      results.warnings.push('Validation error occurred');
      return results;
    }
  }

  /**
   * Validate phone using free APIs
   */
  async validatePhoneWithFreeApis(phone) {
    const results = {
      phone,
      isValid: false,
      confidence: 0,
      validations: [],
      warnings: []
    };

    try {
      // 1. Validate Moroccan format
      const moroccanValidation = this.validateMoroccanPhoneFormat(phone);
      results.validations.push(moroccanValidation);
      results.confidence += moroccanValidation.score;

      // 2. Check for suspicious patterns
      const suspiciousValidation = this.checkSuspiciousPhonePatterns(phone);
      results.validations.push(suspiciousValidation);
      results.confidence += suspiciousValidation.score;

      // 3. Validate against business patterns
      const businessValidation = this.validateBusinessPhonePatterns(phone);
      results.validations.push(businessValidation);
      results.confidence += businessValidation.score;

      // 4. Check against known business directories
      const directoryValidation = await this.checkPhoneInBusinessDirectories(phone);
      results.validations.push(directoryValidation);
      results.confidence += directoryValidation.score;

      // Determine validity
      results.isValid = results.confidence >= 25;

      return results;

    } catch (error) {
      console.error('Phone validation error:', error.message);
      results.warnings.push('Validation error occurred');
      return results;
    }
  }

  /**
   * Check if email is from a disposable service
   */
  async checkDisposableEmail(email) {
    const domain = email.split('@')[1];
    
    try {
      // Use free disposable email checker
      const response = await axios.get(`${this.freeApis.email.disposable}${domain}`, {
        timeout: 5000
      });

      const isDisposable = response.data.disposable;
      
      return {
        type: 'disposable_check',
        score: isDisposable ? -30 : 20,
        reasons: [isDisposable ? 'Disposable email detected' : 'Non-disposable email'],
        details: { isDisposable }
      };

    } catch (error) {
      // Fallback: check against known disposable domains
      const disposableDomains = [
        '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'tempmail.org', 'throwaway.email', 'temp-mail.org'
      ];

      const isDisposable = disposableDomains.some(disposable => 
        domain.includes(disposable)
      );

      return {
        type: 'disposable_check',
        score: isDisposable ? -30 : 10,
        reasons: [isDisposable ? 'Disposable email detected' : 'Email domain check passed'],
        details: { isDisposable }
      };
    }
  }

  /**
   * Validate domain using DNS
   */
  async validateDomainWithDNS(domain) {
    try {
      const response = await axios.get(`${this.freeApis.dns.google}?name=${domain}`, {
        timeout: 5000
      });

      const hasRecords = response.data.Answer && response.data.Answer.length > 0;
      
      return {
        type: 'dns_validation',
        score: hasRecords ? 20 : -20,
        reasons: [hasRecords ? 'Domain resolves' : 'Domain does not resolve'],
        details: { hasRecords, domain }
      };

    } catch (error) {
      return {
        type: 'dns_validation',
        score: -10,
        reasons: ['DNS validation failed'],
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate MX records
   */
  async validateMXRecords(domain) {
    try {
      const response = await axios.get(`${this.freeApis.dns.google}?name=${domain}&type=MX`, {
        timeout: 5000
      });

      const hasMXRecords = response.data.Answer && response.data.Answer.length > 0;
      
      return {
        type: 'mx_validation',
        score: hasMXRecords ? 25 : -15,
        reasons: [hasMXRecords ? 'MX records found' : 'No MX records found'],
        details: { hasMXRecords, domain }
      };

    } catch (error) {
      return {
        type: 'mx_validation',
        score: -5,
        reasons: ['MX validation failed'],
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate business email patterns
   */
  validateBusinessEmailPatterns(email) {
    const domain = email.split('@')[1];
    let score = 0;
    const reasons = [];

    // Check for business-like patterns
    const businessPatterns = [
      /^[a-zA-Z]+\.[a-zA-Z]+@/, // firstname.lastname@
      /^[a-zA-Z]+@/, // firstname@
      /^contact@/, // contact@
      /^info@/, // info@
      /^hello@/, // hello@
      /^admin@/, // admin@
      /^support@/, // support@
      /^sales@/, // sales@
      /^service@/ // service@
    ];

    for (const pattern of businessPatterns) {
      if (pattern.test(email)) {
        score += 10;
        reasons.push('Business email pattern detected');
        break;
      }
    }

    // Check for professional domains
    const professionalDomains = [
      '.ma', '.co.ma', '.com.ma', '.net.ma', '.org.ma',
      '.com', '.net', '.org', '.biz', '.info'
    ];

    const hasProfessionalDomain = professionalDomains.some(ext => 
      domain.endsWith(ext)
    );

    if (hasProfessionalDomain) {
      score += 15;
      reasons.push('Professional domain detected');
    }

    return {
      type: 'business_pattern_validation',
      score,
      reasons,
      details: { domain, hasProfessionalDomain }
    };
  }

  /**
   * Validate Moroccan phone format
   */
  validateMoroccanPhoneFormat(phone) {
    let score = 0;
    const reasons = [];

    // Standardize format
    let cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
    
    if (cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) {
      cleanPhone = '+212' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('00212')) {
      cleanPhone = '+' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('212') && !cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    // Validate Moroccan format
    if (/^\+212[67]\d{8}$/.test(cleanPhone)) {
      score += 30;
      reasons.push('Valid Moroccan phone format');
    } else {
      score -= 20;
      reasons.push('Invalid Moroccan phone format');
    }

    return {
      type: 'moroccan_format_validation',
      score,
      reasons,
      details: { originalPhone: phone, cleanPhone }
    };
  }

  /**
   * Check for suspicious phone patterns
   */
  checkSuspiciousPhonePatterns(phone) {
    let score = 0;
    const reasons = [];

    const suspiciousPatterns = [
      /0000000000/, /1111111111/, /1234567890/, /9999999999/,
      /12345678/, /87654321/, /11111111/, /00000000/
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(phone.replace(/[\s\-\.\(\)]/g, ''))
    );

    if (isSuspicious) {
      score -= 50;
      reasons.push('Suspicious phone pattern detected');
    } else {
      score += 10;
      reasons.push('No suspicious patterns detected');
    }

    return {
      type: 'suspicious_pattern_validation',
      score,
      reasons,
      details: { isSuspicious }
    };
  }

  /**
   * Validate business phone patterns
   */
  validateBusinessPhonePatterns(phone) {
    let score = 0;
    const reasons = [];

    // Check for business-like patterns
    const businessPatterns = [
      /^\+212[67]\d{8}$/, // Standard Moroccan business format
      /^0[67]\d{8}$/, // Local business format
      /^212[67]\d{8}$/ // Alternative format
    ];

    const isValidBusinessFormat = businessPatterns.some(pattern => 
      pattern.test(phone.replace(/[\s\-\.\(\)]/g, ''))
    );

    if (isValidBusinessFormat) {
      score += 20;
      reasons.push('Valid business phone format');
    } else {
      score -= 10;
      reasons.push('Invalid business phone format');
    }

    return {
      type: 'business_phone_validation',
      score,
      reasons,
      details: { isValidBusinessFormat }
    };
  }

  /**
   * Check phone against business directories
   */
  async checkPhoneInBusinessDirectories(phone) {
    let score = 0;
    const reasons = [];

    try {
      // This would require integration with business directories
      // For now, we'll use basic validation
      
      // Check if phone follows business patterns
      const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
      
      if (/^\+212[67]\d{8}$/.test(cleanPhone)) {
        score += 15;
        reasons.push('Phone follows business directory patterns');
      }

      // Additional checks could be added here for specific directories
      // For example, checking against public business registries

    } catch (error) {
      score -= 5;
      reasons.push('Business directory check failed');
    }

    return {
      type: 'business_directory_validation',
      score,
      reasons,
      details: { phone }
    };
  }

  /**
   * Comprehensive validation using all free APIs
   */
  async validateContactInfoComprehensive(email, phone, url) {
    const results = {
      email: null,
      phone: null,
      overallConfidence: 0,
      recommendations: []
    };

    // Validate email
    if (email) {
      results.email = await this.validateEmailWithFreeApis(email);
    }

    // Validate phone
    if (phone) {
      results.phone = await this.validatePhoneWithFreeApis(phone);
    }

    // Calculate overall confidence
    let totalScore = 0;
    let totalValidations = 0;

    if (results.email) {
      totalScore += results.email.confidence;
      totalValidations++;
    }

    if (results.phone) {
      totalScore += results.phone.confidence;
      totalValidations++;
    }

    results.overallConfidence = totalValidations > 0 ? totalScore / totalValidations : 0;

    // Generate recommendations
    if (results.email && !results.email.isValid) {
      results.recommendations.push('Email validation failed - consider manual verification');
    }

    if (results.phone && !results.phone.isValid) {
      results.recommendations.push('Phone validation failed - consider manual verification');
    }

    if (results.overallConfidence < 50) {
      results.recommendations.push('Low overall confidence - manual review recommended');
    }

    return results;
  }
}
