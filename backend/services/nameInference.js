const geminiAI = require('./geminiAI');

/**
 * AI-powered name inference service
 * Uses heuristics, pattern matching, and Gemini LLM to infer names from email addresses
 */
class NameInferenceService {
  constructor() {
    // Common email patterns
    this.patterns = [
      // firstname.lastname@domain.com
      { regex: /^([a-z]+)\.([a-z]+)@/, handler: this.formatFullName, confidence: 0.9 },
      // firstname_lastname@domain.com
      { regex: /^([a-z]+)_([a-z]+)@/, handler: this.formatFullName, confidence: 0.85 },
      // firstnamelastname@domain.com (if recognizable)
      { regex: /^([a-z]{2,15})([a-z]{2,15})@/, handler: this.formatFullName, confidence: 0.5 },
      // f.lastname@domain.com
      { regex: /^([a-z])\.([a-z]+)@/, handler: this.formatInitialLastName, confidence: 0.7 },
      // firstname@domain.com
      { regex: /^([a-z]+)@/, handler: this.formatSingleName, confidence: 0.6 },
    ];

    // Common first names for better detection
    this.commonFirstNames = new Set([
      'john', 'jane', 'michael', 'sarah', 'david', 'emily', 'james', 'mary',
      'robert', 'jennifer', 'william', 'linda', 'richard', 'patricia', 'thomas',
      'jessica', 'charles', 'nancy', 'daniel', 'lisa', 'matthew', 'karen',
      'mark', 'susan', 'donald', 'betty', 'paul', 'helen', 'steven', 'sandra'
    ]);
  }

  /**
   * Infer name from email address
   * @param {string} email - Email address
   * @param {boolean} useAI - Whether to use Gemini AI enhancement (default: false)
   * @returns {Promise<Object>|Object} - {name: string, confidence: number, aiEnhanced?: boolean}
   */
  inferName(email, useAI = false) {
    const lowercaseEmail = email.toLowerCase();
    
    // Try each pattern
    for (const pattern of this.patterns) {
      const match = lowercaseEmail.match(pattern.regex);
      if (match) {
        const name = pattern.handler.call(this, match);
        
        // Adjust confidence based on name quality
        let confidence = pattern.confidence;
        if (this.isLikelyRealName(name)) {
          confidence = Math.min(confidence + 0.1, 1.0);
        }
        
        return {
          name,
          confidence: Math.round(confidence * 100) / 100,
          method: 'pattern-matching'
        };
      }
    }
    
    // Fallback: use email prefix
    const prefix = email.split('@')[0];
    return {
      name: this.capitalize(prefix.replace(/[._-]/g, ' ')),
      confidence: 0.3,
      method: 'fallback'
    };
  }

  /**
   * Infer name from email address with AI enhancement
   * @param {string} email - Email address
   * @returns {Promise<Object>} - {name: string, confidence: number, aiEnhanced: boolean}
   */
  async inferNameWithAI(email) {
    // First try pattern matching
    const patternResult = this.inferName(email, false);
    
    // If confidence is low or AI is available, try AI enhancement
    if (geminiAI.isEnabled() && patternResult.confidence < 0.8) {
      try {
        const aiResult = await geminiAI.inferNameFromEmail(email);
        
        if (aiResult && aiResult.confidence > patternResult.confidence) {
          // AI provided better result
          return {
            name: aiResult.name,
            confidence: Math.round(aiResult.confidence * 100) / 100,
            method: 'ai-enhanced',
            aiEnhanced: true,
            reasoning: aiResult.reasoning,
            fallback: patternResult
          };
        }
      } catch (error) {
        console.error('AI enhancement failed, using pattern result:', error.message);
      }
    }
    
    // Return pattern result
    return {
      ...patternResult,
      aiEnhanced: false
    };
  }

  /**
   * Format full name from two parts
   */
  formatFullName(match) {
    const firstName = this.capitalize(match[1]);
    const lastName = this.capitalize(match[2]);
    return `${firstName} ${lastName}`;
  }

  /**
   * Format name with initial and last name
   */
  formatInitialLastName(match) {
    const initial = match[1].toUpperCase();
    const lastName = this.capitalize(match[2]);
    return `${initial}. ${lastName}`;
  }

  /**
   * Format single name
   */
  formatSingleName(match) {
    return this.capitalize(match[1]);
  }

  /**
   * Capitalize first letter of each word
   */
  capitalize(str) {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if the inferred name is likely real
   */
  isLikelyRealName(name) {
    const parts = name.toLowerCase().split(' ');
    
    // Check if first part is a common first name
    if (parts.length > 0 && this.commonFirstNames.has(parts[0])) {
      return true;
    }
    
    // Check name length (too short or too long names are suspicious)
    if (name.length < 3 || name.length > 30) {
      return false;
    }
    
    // Check if name contains mostly letters
    const letterCount = (name.match(/[a-zA-Z]/g) || []).length;
    return letterCount / name.length > 0.8;
  }

  /**
   * Batch inference for multiple emails
   * @param {Array} emails - Array of email addresses
   * @param {boolean} useAI - Whether to use AI enhancement
   * @returns {Promise<Array>|Array} - Array of {email, name, confidence}
   */
  async inferNames(emails, useAI = false) {
    if (!useAI || !geminiAI.isEnabled()) {
      // Standard pattern matching
      return emails.map(email => {
        const inference = this.inferName(email);
        return {
          email,
          ...inference
        };
      });
    }

    // AI-enhanced batch processing
    const results = [];
    
    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < emails.length; i += 5) {
      const batch = emails.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(email => this.inferNameWithAI(email))
      );
      
      batchResults.forEach((result, index) => {
        results.push({
          email: batch[index],
          ...result
        });
      });
      
      // Small delay between batches
      if (i + 5 < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
}

module.exports = new NameInferenceService();

