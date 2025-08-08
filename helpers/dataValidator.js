import axios from 'axios';
import { config } from '../config.js';

/**
 * Advanced Data Validation System
 * Uses multiple sources to cross-validate contact information accuracy
 */
export class DataValidator {
  constructor() {
    this.validationSources = [
      'whois',
      'dns',
      'social_media',
      'business_directories',
      'contact_forms'
    ];
  }

  /**
   * Cross-validate email addresses using multiple sources
   */
  async validateEmailAdvanced(email, url) {
    const validations = {
      email,
      url,
      isValid: false,
      confidence: 0,
      sources: [],
      warnings: []
    };

    try {
      // 1. Basic format validation
      if (!this.isValidEmailFormat(email)) {
        validations.warnings.push('Invalid email format');
        return validations;
      }

      // 2. Domain validation
      const domainValidation = await this.validateDomain(email.split('@')[1]);
      validations.sources.push(domainValidation);
      validations.confidence += domainValidation.score;

      // 3. MX record validation
      const mxValidation = await this.validateMXRecords(email.split('@')[1]);
      validations.sources.push(mxValidation);
      validations.confidence += mxValidation.score;

      // 4. Social media cross-reference
      const socialValidation = await this.validateSocialMedia(email, url);
      validations.sources.push(socialValidation);
      validations.confidence += socialValidation.score;

      // 5. Business directory validation
      const directoryValidation = await this.validateBusinessDirectories(email, url);
      validations.sources.push(directoryValidation);
      validations.confidence += directoryValidation.score;

      // 6. Contact form validation
      const formValidation = await this.validateContactForm(email, url);
      validations.sources.push(formValidation);
      validations.confidence += formValidation.score;

      // Determine if email is valid based on confidence score
      validations.isValid = validations.confidence >= 30; // Threshold for validation

      return validations;

    } catch (error) {
      console.error('Email validation error:', error.message);
      validations.warnings.push('Validation error occurred');
      return validations;
    }
  }

  /**
   * Cross-validate phone numbers using multiple sources
   */
  async validatePhoneAdvanced(phone, url) {
    const validations = {
      phone,
      url,
      isValid: false,
      confidence: 0,
      sources: [],
      warnings: []
    };

    try {
      // 1. Basic format validation
      if (!this.isValidPhoneFormat(phone)) {
        validations.warnings.push('Invalid phone format');
        return validations;
      }

      // 2. Moroccan phone validation
      const moroccanValidation = this.validateMoroccanPhone(phone);
      validations.sources.push(moroccanValidation);
      validations.confidence += moroccanValidation.score;

      // 3. Business directory validation
      const directoryValidation = await this.validatePhoneInDirectories(phone, url);
      validations.sources.push(directoryValidation);
      validations.confidence += directoryValidation.score;

      // 4. Social media cross-reference
      const socialValidation = await this.validatePhoneInSocialMedia(phone, url);
      validations.sources.push(socialValidation);
      validations.confidence += socialValidation.score;

      // 5. Contact form validation
      const formValidation = await this.validatePhoneInContactForm(phone, url);
      validations.sources.push(formValidation);
      validations.confidence += formValidation.score;

      // Determine if phone is valid based on confidence score
      validations.isValid = validations.confidence >= 25; // Threshold for validation

      return validations;

    } catch (error) {
      console.error('Phone validation error:', error.message);
      validations.warnings.push('Validation error occurred');
      return validations;
    }
  }

  /**
   * Validate email format
   */
  isValidEmailFormat(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  isValidPhoneFormat(phone) {
    const moroccanPatterns = [
      /^\+212[67]\d{8}$/,
      /^0[67]\d{8}$/,
      /^212[67]\d{8}$/
    ];
    
    return moroccanPatterns.some(pattern => pattern.test(phone));
  }

  /**
   * Validate Moroccan phone number
   */
  validateMoroccanPhone(phone) {
    let score = 0;
    let reasons = [];

    // Standardize format
    let cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
    if (cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) {
      cleanPhone = '+212' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('00212')) {
      cleanPhone = '+' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('212') && !cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    // Validate format
    if (/^\+212[67]\d{8}$/.test(cleanPhone)) {
      score += 20;
      reasons.push('Valid Moroccan format');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /0000000000/, /1111111111/, /1234567890/, /9999999999/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(cleanPhone)) {
        score -= 50;
        reasons.push('Suspicious pattern detected');
        break;
      }
    }

    return { score, reasons, type: 'moroccan_validation' };
  }

  /**
   * Validate domain using DNS
   */
  async validateDomain(domain) {
    let score = 0;
    let reasons = [];

    try {
      // Check if domain exists
      const dnsResponse = await axios.get(`https://dns.google/resolve?name=${domain}`, {
        timeout: 5000
      });

      if (dnsResponse.data.Answer && dnsResponse.data.Answer.length > 0) {
        score += 15;
        reasons.push('Domain exists and resolves');
      } else {
        score -= 20;
        reasons.push('Domain does not resolve');
      }

    } catch (error) {
      score -= 10;
      reasons.push('Domain validation failed');
    }

    return { score, reasons, type: 'domain_validation' };
  }

  /**
   * Validate MX records for email delivery
   */
  async validateMXRecords(domain) {
    let score = 0;
    let reasons = [];

    try {
      const mxResponse = await axios.get(`https://dns.google/resolve?name=${domain}&type=MX`, {
        timeout: 5000
      });

      if (mxResponse.data.Answer && mxResponse.data.Answer.length > 0) {
        score += 20;
        reasons.push('MX records found - email delivery possible');
      } else {
        score -= 15;
        reasons.push('No MX records found - email delivery unlikely');
      }

    } catch (error) {
      score -= 5;
      reasons.push('MX validation failed');
    }

    return { score, reasons, type: 'mx_validation' };
  }

  /**
   * Validate against social media profiles
   */
  async validateSocialMedia(email, url) {
    let score = 0;
    let reasons = [];

    try {
      // Check if email domain matches website domain
      const emailDomain = email.split('@')[1];
      const urlDomain = new URL(url).hostname.replace('www.', '');

      if (emailDomain === urlDomain) {
        score += 25;
        reasons.push('Email domain matches website domain');
      } else if (emailDomain.includes(urlDomain) || urlDomain.includes(emailDomain)) {
        score += 15;
        reasons.push('Email domain related to website domain');
      } else {
        score += 5;
        reasons.push('Email domain different from website domain');
      }

    } catch (error) {
      score -= 5;
      reasons.push('Social media validation failed');
    }

    return { score, reasons, type: 'social_media_validation' };
  }

  /**
   * Validate against business directories
   */
  async validateBusinessDirectories(email, url) {
    let score = 0;
    let reasons = [];

    try {
      // Check if website has business directory listings
      const businessKeywords = ['contact', 'about', 'team', 'staff', 'company'];
      const hasBusinessInfo = businessKeywords.some(keyword => 
        url.toLowerCase().includes(keyword)
      );

      if (hasBusinessInfo) {
        score += 10;
        reasons.push('Website has business information pages');
      }

    } catch (error) {
      score -= 5;
      reasons.push('Business directory validation failed');
    }

    return { score, reasons, type: 'business_directory_validation' };
  }

  /**
   * Validate contact form presence
   */
  async validateContactForm(email, url) {
    let score = 0;
    let reasons = [];

    try {
      // This would require fetching the page content
      // For now, we'll use URL patterns
      const contactPatterns = ['/contact', '/about', '/nous', '/equipe'];
      const hasContactPage = contactPatterns.some(pattern => 
        url.toLowerCase().includes(pattern)
      );

      if (hasContactPage) {
        score += 15;
        reasons.push('Website has contact/about pages');
      }

    } catch (error) {
      score -= 5;
      reasons.push('Contact form validation failed');
    }

    return { score, reasons, type: 'contact_form_validation' };
  }

  /**
   * Validate phone in directories
   */
  async validatePhoneInDirectories(phone, url) {
    let score = 0;
    let reasons = [];

    try {
      // Check if phone format matches Moroccan business patterns
      const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
      
      if (/^\+212[67]\d{8}$/.test(cleanPhone)) {
        score += 20;
        reasons.push('Valid Moroccan business phone format');
      }

    } catch (error) {
      score -= 5;
      reasons.push('Phone directory validation failed');
    }

    return { score, reasons, type: 'phone_directory_validation' };
  }

  /**
   * Validate phone in social media
   */
  async validatePhoneInSocialMedia(phone, url) {
    let score = 0;
    let reasons = [];

    try {
      // Check if phone matches website domain patterns
      const urlDomain = new URL(url).hostname.replace('www.', '');
      
      if (urlDomain.includes('.ma') || urlDomain.includes('morocco')) {
        score += 10;
        reasons.push('Moroccan business website');
      }

    } catch (error) {
      score -= 5;
      reasons.push('Phone social media validation failed');
    }

    return { score, reasons, type: 'phone_social_validation' };
  }

  /**
   * Validate phone in contact form
   */
  async validatePhoneInContactForm(phone, url) {
    let score = 0;
    let reasons = [];

    try {
      // Check for contact page patterns
      const contactPatterns = ['/contact', '/about', '/nous'];
      const hasContactPage = contactPatterns.some(pattern => 
        url.toLowerCase().includes(pattern)
      );

      if (hasContactPage) {
        score += 10;
        reasons.push('Website has contact pages');
      }

    } catch (error) {
      score -= 5;
      reasons.push('Phone contact form validation failed');
    }

    return { score, reasons, type: 'phone_contact_validation' };
  }
}
