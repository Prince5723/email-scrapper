const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Service
 * Enhances email analysis with LLM-powered insights
 */
class GeminiAIService {
  constructor() {
    this.enabled = !!process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;
    
    if (this.enabled) {
      try {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        console.log('✅ Gemini AI initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini AI:', error.message);
        this.enabled = false;
      }
    } else {
      console.log('ℹ️  Gemini AI disabled (no API key)');
    }
  }

  /**
   * Check if Gemini AI is available
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled && this.model !== null;
  }

  /**
   * Infer name from email using AI
   * @param {string} email - Email address
   * @returns {Promise<Object>} - {name: string, confidence: number, reasoning: string}
   */
  async inferNameFromEmail(email) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const prompt = `Given the email address "${email}", infer the person's likely full name.

Rules:
1. Analyze the part before @ symbol
2. Common patterns: firstname.lastname, f.lastname, firstname_lastname
3. Return ONLY a JSON object with these fields:
   - name: The inferred full name (capitalize properly)
   - confidence: A number between 0 and 1 (how confident you are)
   - reasoning: Brief explanation of your inference

Example email: john.doe@company.com
Expected output: {"name": "John Doe", "confidence": 0.95, "reasoning": "Clear firstname.lastname pattern"}

Now analyze: ${email}

Return ONLY valid JSON, no other text.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: parsed.name || 'Unknown',
          confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
          reasoning: parsed.reasoning || 'AI inference',
          aiEnhanced: true
        };
      }
      
      return null;
    } catch (error) {
      console.error('Gemini AI inference error:', error.message);
      return null;
    }
  }

  /**
   * Batch infer names for multiple emails
   * @param {Array<string>} emails - Array of email addresses
   * @returns {Promise<Array>} - Array of inference results
   */
  async batchInferNames(emails) {
    if (!this.isEnabled() || emails.length === 0) {
      return [];
    }

    try {
      const emailList = emails.slice(0, 10).join(', '); // Limit to 10 for token efficiency
      
      const prompt = `Analyze these email addresses and infer the person's name for each:
${emails.slice(0, 10).map((e, i) => `${i + 1}. ${e}`).join('\n')}

For each email, return a JSON object with:
- email: the email address
- name: inferred full name
- confidence: 0-1 confidence score
- reasoning: brief explanation

Return as a JSON array. Example:
[{"email":"john.doe@co.com","name":"John Doe","confidence":0.95,"reasoning":"Clear pattern"}]

Return ONLY valid JSON array, no other text.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map(item => ({
          email: item.email,
          name: item.name || 'Unknown',
          confidence: Math.min(Math.max(item.confidence || 0.5, 0), 1),
          reasoning: item.reasoning || 'AI inference',
          aiEnhanced: true
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Gemini AI batch inference error:', error.message);
      return [];
    }
  }

  /**
   * Validate and enrich email data
   * @param {Object} data - {email, name, platform}
   * @returns {Promise<Object>} - Enriched data with additional insights
   */
  async enrichEmailData(data) {
    if (!this.isEnabled()) {
      return data;
    }

    try {
      const prompt = `Analyze this professional profile:
Email: ${data.email}
Name: ${data.name}
Platform: ${data.platform}

Provide insights:
1. Is this likely a real professional email? (true/false)
2. What role/position might this person have? (brief)
3. Confidence in the name accuracy (0-1)
4. Any red flags? (brief or "none")

Return ONLY valid JSON:
{"isValid": true/false, "likelyRole": "...", "nameConfidence": 0.0-1.0, "redFlags": "..."}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return {
          ...data,
          aiInsights: {
            isValid: insights.isValid !== false,
            likelyRole: insights.likelyRole || 'Unknown',
            nameConfidence: Math.min(Math.max(insights.nameConfidence || data.confidence, 0), 1),
            redFlags: insights.redFlags || 'none'
          }
        };
      }
      
      return data;
    } catch (error) {
      console.error('Gemini AI enrichment error:', error.message);
      return data;
    }
  }

  /**
   * Validate email format and suggest corrections
   * @param {string} email - Email address
   * @returns {Promise<Object>} - Validation result with suggestions
   */
  async validateEmail(email) {
    if (!this.isEnabled()) {
      return { valid: true, suggestions: [] };
    }

    try {
      const prompt = `Analyze this email address: ${email}

Check:
1. Is the format valid?
2. Does it look like a real professional email?
3. Any typos or issues?
4. Suggestions for correction if needed

Return ONLY valid JSON:
{"valid": true/false, "isProfessional": true/false, "suggestions": ["suggestion1", "suggestion2"], "issues": "description or none"}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { valid: true, suggestions: [] };
    } catch (error) {
      console.error('Gemini AI validation error:', error.message);
      return { valid: true, suggestions: [] };
    }
  }

  /**
   * Generate insights about a profile search
   * @param {string} profile - Profile keyword
   * @param {Array} results - Search results
   * @returns {Promise<Object>} - AI-generated insights
   */
  async generateSearchInsights(profile, results) {
    if (!this.isEnabled() || results.length === 0) {
      return null;
    }

    try {
      const sampleResults = results.slice(0, 5).map(r => 
        `${r.name} (${r.email}) from ${r.platform}`
      ).join('\n');

      const prompt = `Analyze these search results for profile "${profile}":
${sampleResults}

Total results: ${results.length}

Provide brief insights:
1. Overall quality of results (1-10)
2. Most common platforms
3. Name pattern analysis
4. Recommendations for better searches

Return ONLY valid JSON:
{"quality": 1-10, "commonPlatforms": ["..."], "patterns": "...", "recommendations": "..."}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Gemini AI insights error:', error.message);
      return null;
    }
  }
}

module.exports = new GeminiAIService();

