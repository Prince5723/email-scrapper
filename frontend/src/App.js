import React, { useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [profile, setProfile] = useState('');
  const [limit, setLimit] = useState(10);
  const [searchEngine, setSearchEngine] = useState('Google');
  const [useAI, setUseAI] = useState(true); // Enabled by default
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searched, setSearched] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState(null);

  const suggestions = ['developer', 'CEO', 'recruiter', 'HR', 'designer', 'marketing manager', 'product manager', 'engineer'];

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!profile.trim()) {
      setError('Please enter a profile keyword');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setResults([]);
    setSearched(true);

    try {
      const response = await axios.post('/api/search', {
        profile: profile.trim(),
        limit: parseInt(limit),
        searchEngine: searchEngine,
        useCache: true,
        useAI: useAI
      });

      if (response.data.success) {
        setResults(response.data.results);
        setSearchMetadata({
          searchMethod: response.data.searchMethod || 'Google Dork',
          sitesSearched: response.data.sitesSearched || [],
          emailProvidersSearched: response.data.emailProvidersSearched || []
        });
        if (response.data.message) {
          setMessage(response.data.message);
        }
      } else {
        setError(response.data.message || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(
        err.response?.data?.message || 
        'An error occurred while searching. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };


  const handleSuggestionClick = (suggestion) => {
    setProfile(suggestion);
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  const getConfidenceLabel = (confidence) => {
    const level = getConfidenceLevel(confidence);
    return `${(confidence * 100).toFixed(0)}% ${level}`;
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🔍 OSINT Email Extractor</h1>
          <p>Find professional email addresses across LinkedIn, Indeed & GitHub using DuckDuckGo</p>
        </header>

        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              className="search-input"
              placeholder="Enter profile keyword (e.g., developer, CEO, recruiter...)"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="search-button"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="options">
            <div className="option-group">
              <label>Results Limit:</label>
              <input
                type="number"
                className="limit-input"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="option-group">
              <label>Search Engine:</label>
              <select
                className="limit-input"
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value)}
                disabled={loading}
                style={{ width: '150px' }}
              >
                <option value="Google">Google</option>
                <option value="DuckDuckGo">DuckDuckGo</option>
                <option value="Yahoo">Yahoo</option>
                <option value="Bing">Bing</option>
              </select>
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                Searches LinkedIn, Indeed & GitHub
              </p>
            </div>

            <div className="option-group">
              <label>AI Enhancement:</label>
              <div className="engine-options">
                <label className="checkbox-label" style={{ color: useAI ? '#667eea' : '#666' }}>
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={() => setUseAI(!useAI)}
                    disabled={loading}
                  />
                  🤖 Use Gemini AI
                </label>
              </div>
              {useAI && (
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                  AI will provide better name inference
                </p>
              )}
            </div>

          </div>

          <div className="quick-suggestions">
            <strong style={{ marginRight: '0.5rem', color: '#666' }}>Quick suggestions:</strong>
            {suggestions.map((suggestion, index) => (
              <span
                key={index}
                className="suggestion-chip"
                onClick={() => !loading && handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>🔍 Searching LinkedIn, Indeed & GitHub for professionals...</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
              Searching across multiple email providers (@gmail, @rediffmail, @yahoo, @outlook, @hotmail)
            </p>
          </div>
        )}

        {message && !error && (
          <div style={{
            background: '#e3f2fd',
            border: '2px solid #2196f3',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            color: '#333'
          }}>
            <strong>ℹ️ Info:</strong> {message}
          </div>
        )}

        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && searched && results.length > 0 && (
          <div className="results-section">
            <div className="results-header">
              <h2>Search Results</h2>
              <span className="results-count">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {searchMetadata && (
              <div style={{
                background: '#f5f7fa',
                border: '1px solid #e1e8ed',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>🎯 Search Method:</strong> {searchMetadata.searchMethod} (Google Dork)
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>🌐 Sites Searched:</strong> {searchMetadata.sitesSearched.length > 0 ? searchMetadata.sitesSearched.join(', ') : 'LinkedIn, Indeed, GitHub'}
                </div>
                <div>
                  <strong>📧 Email Providers:</strong> {searchMetadata.emailProvidersSearched.length > 0 ? searchMetadata.emailProvidersSearched.join(', ') : '@gmail.com, @rediffmail.com, @yahoo.com, @outlook.com, @hotmail.com'}
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>#</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Platform</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Confidence</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid #e0e0e0',
                      background: index % 2 === 0 ? '#f9f9f9' : 'white',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e3f2fd'}
                    onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? '#f9f9f9' : 'white'}
                    >
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#666' }}>{index + 1}</td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#333' }}>
                        {result.name}
                        {result.ai_enhanced && (
                          <span style={{ 
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '8px'
                          }}>
                            🤖 AI
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#667eea', fontWeight: '500' }}>{result.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: '#e3f2fd',
                          color: '#1976d2',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {result.platform}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`confidence-badge confidence-${getConfidenceLevel(result.confidence)}`}>
                          {getConfidenceLabel(result.confidence)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {result.source_url && (
                          <a 
                            href={result.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: '#667eea', 
                              textDecoration: 'none', 
                              fontWeight: '500',
                              fontSize: '0.9rem'
                            }}
                          >
                            🔗 View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && searched && results.length === 0 && !error && !message && (
          <div className="no-results">
            <h3>⚠️ No results found</h3>
            <p>The Google Dork search completed but found no emails. This is common because:</p>
            <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '1rem' }}>
              <li><strong>Google blocks automated searches</strong> - CAPTCHAs and bot detection</li>
              <li><strong>LinkedIn/Indeed have aggressive anti-scraping</strong> - Blocks headless browsers</li>
              <li><strong>Rate limiting</strong> - Your IP may be temporarily blocked</li>
              <li><strong>No public emails</strong> - Many profiles don't display emails publicly</li>
            </ul>
            <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#2196f3' }}>
              💡 Try a different keyword or reduce the limit to 3-5 results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

