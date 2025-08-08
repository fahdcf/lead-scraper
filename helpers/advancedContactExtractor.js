import { DataValidator } from './dataValidator.js';
import { IntelligentExtractor } from './intelligentExtractor.js';
import { FreeApiValidator } from './freeApiValidator.js';
import { EnhancedPageAnalyzer } from './enhancedPageAnalyzer.js';
import { extractEmails } from './extractEmails.js';
import { extractPhones } from './extractPhones.js';

/**
 * Advanced Contact Extractor
 * Integrates all advanced methods for maximum accuracy
 */
export class AdvancedContactExtractor {
  constructor() {
    this.dataValidator = new DataValidator();
    this.intelligentExtractor = new IntelligentExtractor();
    this.freeApiValidator = new FreeApiValidator();
    this.enhancedPageAnalyzer = new EnhancedPageAnalyzer();
  }

  /**
   * Extract contact information using all advanced methods
   * @param {string} url - The URL being processed
   * @param {string} html - The HTML content
   */
  async extractContactInfoAdvanced(url, html) {
    const results = {
      url,
      emails: [],
      phones: [],
      confidence: 0,
      validation: {},
      recommendations: [],
      analysis: {}
    };

    try {
      // Validate URL format
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format');
      }

      // 1. Basic extraction (current method) - always works
      const basicEmails = extractEmails(html);
      const basicPhones = extractPhones(html);

      // 2. Intelligent extraction (with error handling)
      let intelligentResults = { emails: [], phones: [], highConfidenceEmails: [], highConfidencePhones: [] };
      try {
        intelligentResults = await this.intelligentExtractor.extractContactInfoIntelligent(html, url);
      } catch (error) {
        console.log(`Intelligent extraction failed: ${error.message}`);
        // Continue with basic extraction
      }

      // 3. Enhanced page analysis (with error handling)
      let pageAnalysis = null;
      try {
        pageAnalysis = await this.enhancedPageAnalyzer.analyzePageStructure(url);
      } catch (error) {
        console.log(`Page analysis failed: ${error.message}`);
        // Continue without page analysis
      }

      // 4. Free API validation (with error handling)
      let apiValidation = { isValid: true, confidence: 50 };
      try {
        const testEmail = intelligentResults.highConfidenceEmails[0]?.email || basicEmails[0];
        const testPhone = intelligentResults.highConfidencePhones[0]?.phone || basicPhones[0];
        
        if (testEmail || testPhone) {
          apiValidation = await this.freeApiValidator.validateContactInfoComprehensive(
            testEmail,
            testPhone,
            url
          );
        }
      } catch (error) {
        console.log(`API validation failed: ${error.message}`);
        // Continue without API validation
      }

      // 5. Advanced data validation (with error handling)
      let advancedValidation = { isValid: true, confidence: 50 };
      try {
        const testEmail = intelligentResults.highConfidenceEmails[0]?.email || basicEmails[0];
        const testPhone = intelligentResults.highConfidencePhones[0]?.phone || basicPhones[0];
        
        if (testEmail || testPhone) {
          advancedValidation = await this.validateContactInfoAdvanced(
            testEmail,
            testPhone,
            url
          );
        }
      } catch (error) {
        console.log(`Advanced validation failed: ${error.message}`);
        // Continue without advanced validation
      }

      // 6. Combine and rank results
      results.emails = this.combineAndRankEmails(
        basicEmails,
        intelligentResults.emails || [],
        pageAnalysis?.contactInfo?.emails || []
      );

      results.phones = this.combineAndRankPhones(
        basicPhones,
        intelligentResults.phones || [],
        pageAnalysis?.contactInfo?.phones || []
      );

      // 7. Calculate overall confidence
      results.confidence = this.calculateOverallConfidence(results);

      // 8. Store validation results
      results.validation = {
        apiValidation,
        advancedValidation,
        pageAnalysis: pageAnalysis?.confidence || 0
      };

      // 9. Generate recommendations
      results.recommendations = this.generateAdvancedRecommendations(results);

      // 10. Store detailed analysis
      results.analysis = {
        basicExtraction: { emails: basicEmails.length, phones: basicPhones.length },
        intelligentExtraction: intelligentResults,
        pageAnalysis: pageAnalysis,
        totalMethods: 4
      };

      return results;

    } catch (error) {
      console.error('Advanced contact extraction error:', error.message);
      
      // Fallback to basic extraction only
      const basicEmails = extractEmails(html);
      const basicPhones = extractPhones(html);
      
      results.emails = basicEmails.map(email => ({
        value: email,
        confidence: 50,
        source: 'basic_extraction_fallback',
        validation: { isValid: true, confidence: 50 }
      }));
      
      results.phones = basicPhones.map(phone => ({
        value: phone,
        confidence: 50,
        source: 'basic_extraction_fallback',
        validation: { isValid: true, confidence: 50 }
      }));
      
      results.confidence = 50;
      results.recommendations = ['Using basic extraction due to advanced method errors'];
      
      return results;
    }
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate contact information using advanced methods
   */
  async validateContactInfoAdvanced(email, phone, url) {
    const validation = {
      email: { isValid: false, confidence: 0, reasons: [] },
      phone: { isValid: false, confidence: 0, reasons: [] },
      overall: { isValid: false, confidence: 0 }
    };

    try {
      // Email validation
      if (email) {
        const emailValidation = await this.dataValidator.validateEmailAdvanced(email);
        validation.email = emailValidation;
      }

      // Phone validation
      if (phone) {
        const phoneValidation = await this.dataValidator.validatePhoneAdvanced(phone);
        validation.phone = phoneValidation;
      }

      // Calculate overall confidence
      const emailConfidence = validation.email.confidence || 0;
      const phoneConfidence = validation.phone.confidence || 0;
      
      validation.overall = {
        isValid: validation.email.isValid || validation.phone.isValid,
        confidence: Math.max(emailConfidence, phoneConfidence)
      };

    } catch (error) {
      console.error('Advanced validation error:', error.message);
      validation.overall = { isValid: true, confidence: 50 }; // Fallback
    }

    return validation;
  }

  /**
   * Combine and rank emails from multiple sources
   */
  combineAndRankEmails(basicEmails, intelligentEmails, pageAnalysisEmails) {
    const allEmails = new Map();

    // Add basic emails
    basicEmails.forEach(email => {
      allEmails.set(email.toLowerCase(), {
        value: email.toLowerCase(),
        confidence: 50,
        source: 'basic_extraction',
        validation: { isValid: true, confidence: 50 }
      });
    });

    // Add intelligent emails (higher priority)
    if (intelligentEmails && Array.isArray(intelligentEmails)) {
      intelligentEmails.forEach(emailData => {
        const email = emailData.value || emailData.email || emailData;
        const confidence = emailData.confidence || 70;
        
        if (email && typeof email === 'string') {
          const existing = allEmails.get(email.toLowerCase());
          if (!existing || confidence > existing.confidence) {
            allEmails.set(email.toLowerCase(), {
              value: email.toLowerCase(),
              confidence: confidence,
              source: 'intelligent_extraction',
              validation: { isValid: true, confidence: confidence }
            });
          }
        }
      });
    }

    // Add page analysis emails (highest priority)
    if (pageAnalysisEmails && Array.isArray(pageAnalysisEmails)) {
      pageAnalysisEmails.forEach(emailData => {
        const email = emailData.value || emailData.email || emailData;
        const confidence = emailData.confidence || 85;
        
        if (email && typeof email === 'string') {
          const existing = allEmails.get(email.toLowerCase());
          if (!existing || confidence > existing.confidence) {
            allEmails.set(email.toLowerCase(), {
              value: email.toLowerCase(),
              confidence: confidence,
              source: 'page_analysis',
              validation: { isValid: true, confidence: confidence }
            });
          }
        }
      });
    }

    return Array.from(allEmails.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Combine and rank phones from multiple sources
   */
  combineAndRankPhones(basicPhones, intelligentPhones, pageAnalysisPhones) {
    const allPhones = new Map();

    // Add basic phones
    basicPhones.forEach(phone => {
      const standardized = this.standardizePhone(phone);
      allPhones.set(standardized, {
        value: standardized,
        confidence: 50,
        source: 'basic_extraction',
        validation: { isValid: true, confidence: 50 }
      });
    });

    // Add intelligent phones (higher priority)
    if (intelligentPhones && Array.isArray(intelligentPhones)) {
      intelligentPhones.forEach(phoneData => {
        const phone = phoneData.value || phoneData.phone || phoneData;
        const confidence = phoneData.confidence || 70;
        
        if (phone && typeof phone === 'string') {
          const standardized = this.standardizePhone(phone);
          const existing = allPhones.get(standardized);
          if (!existing || confidence > existing.confidence) {
            allPhones.set(standardized, {
              value: standardized,
              confidence: confidence,
              source: 'intelligent_extraction',
              validation: { isValid: true, confidence: confidence }
            });
          }
        }
      });
    }

    // Add page analysis phones (highest priority)
    if (pageAnalysisPhones && Array.isArray(pageAnalysisPhones)) {
      pageAnalysisPhones.forEach(phoneData => {
        const phone = phoneData.value || phoneData.phone || phoneData;
        const confidence = phoneData.confidence || 85;
        
        if (phone && typeof phone === 'string') {
          const standardized = this.standardizePhone(phone);
          const existing = allPhones.get(standardized);
          if (!existing || confidence > existing.confidence) {
            allPhones.set(standardized, {
              value: standardized,
              confidence: confidence,
              source: 'page_analysis',
              validation: { isValid: true, confidence: confidence }
            });
          }
        }
      });
    }

    return Array.from(allPhones.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Standardize phone number format
   */
  standardizePhone(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure Moroccan format
    if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
      return `+212${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('+212')) {
      return cleaned;
    } else if (cleaned.startsWith('212')) {
      return `+${cleaned}`;
    }
    
    return phone; // Return original if can't standardize
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(results) {
    if (!results.emails.length && !results.phones.length) {
      return 0;
    }

    const emailConfidences = results.emails.map(e => e.confidence || 0);
    const phoneConfidences = results.phones.map(p => p.confidence || 0);
    
    const allConfidences = [...emailConfidences, ...phoneConfidences];
    
    if (allConfidences.length === 0) return 0;
    
    const avgConfidence = allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length;
    const maxConfidence = Math.max(...allConfidences);
    
    // Weight average and max confidence
    return Math.round((avgConfidence * 0.7) + (maxConfidence * 0.3));
  }

  /**
   * Generate advanced recommendations
   */
  generateAdvancedRecommendations(results) {
    const recommendations = [];

    if (results.emails.length === 0 && results.phones.length === 0) {
      recommendations.push('No contact information found - consider manual verification');
    }

    if (results.emails.length > 0) {
      const highConfidenceEmails = results.emails.filter(e => e.confidence >= 70);
      if (highConfidenceEmails.length > 0) {
        recommendations.push(`Found ${highConfidenceEmails.length} high-confidence emails (≥70%)`);
      }
    }

    if (results.phones.length > 0) {
      const highConfidencePhones = results.phones.filter(p => p.confidence >= 70);
      if (highConfidencePhones.length > 0) {
        recommendations.push(`Found ${highConfidencePhones.length} high-confidence phones (≥70%)`);
      }
    }

    if (results.confidence >= 80) {
      recommendations.push('Excellent data quality - high confidence results');
    } else if (results.confidence >= 60) {
      recommendations.push('Good data quality - moderate confidence results');
    } else {
      recommendations.push('Low confidence results - manual verification recommended');
    }

    return recommendations;
  }

  /**
   * Get detailed report
   */
  getDetailedReport(results) {
    return {
      url: results.url,
      summary: {
        totalEmails: results.emails.length,
        totalPhones: results.phones.length,
        overallConfidence: results.confidence,
        highConfidenceEmails: results.emails.filter(e => e.confidence >= 70).length,
        highConfidencePhones: results.phones.filter(p => p.confidence >= 70).length
      },
      emails: results.emails,
      phones: results.phones,
      validation: results.validation,
      recommendations: results.recommendations,
      analysis: results.analysis
    };
  }

  /**
   * Extract with detailed report
   */
  async extractWithDetailedReport(html, url) {
    const results = await this.extractContactInfoAdvanced(url, html);
    return this.getDetailedReport(results);
  }
}
