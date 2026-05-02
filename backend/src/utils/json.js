/**
 * JSON Parsing Utility
 * Robustly parses JSON from LLM responses, handling common formatting issues
 */
import logger from './logger.js';

/**
 * Parses a JSON string from LLM output, extracting from code blocks if necessary.
 * Handles common errors like trailing commas, comments, and unterminated strings.
 * 
 * @param {string} raw - The raw string from LLM
 * @param {any} defaultValue - Value to return if parsing fails
 * @returns {any} - Parsed JSON or defaultValue
 */
export const robustParseJSON = (raw, defaultValue = null) => {
  if (!raw || typeof raw !== 'string') return defaultValue;

  try {
    let jsonStr = raw.trim();

    // 1. Try to extract from markdown code blocks
    const fencedMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fencedMatch) {
      jsonStr = fencedMatch[1].trim();
    } else {
      // 2. Try to find the first '{' or '[' and the last '}' or ']'
      const startBracket = jsonStr.indexOf('{');
      const startArray = jsonStr.indexOf('[');
      let start = -1;
      let end = -1;

      if (startBracket !== -1 && (startArray === -1 || startBracket < startArray)) {
        start = startBracket;
        end = jsonStr.lastIndexOf('}');
      } else if (startArray !== -1) {
        start = startArray;
        end = jsonStr.lastIndexOf(']');
      }

      if (start !== -1 && end !== -1 && end > start) {
        jsonStr = jsonStr.substring(start, end + 1);
      }
    }

    // 3. Simple cleanup for common LLM JSON artifacts
    // Remove comments
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '');

    // Replace control characters like newlines within string literals
    // This handles "Bad control character in string literal"
    jsonStr = jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
      return '"' + p1.replace(/\n/g, '\\\\n').replace(/\r/g, '\\\\r').replace(/\t/g, '\\\\t') + '"';
    });
    
    // Attempt standard parse
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // 4. If standard parse fails, try more aggressive fixes
      
      // Fix trailing commas in arrays and objects
      let fixedStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
      
      // Handle unterminated strings (common in truncated LLM output)
      // This is complex, but we can try to close an open quote if it's the last thing
      const lastQuote = fixedStr.lastIndexOf('"');
      if (lastQuote !== -1) {
        const precedingBackslashes = (fixedStr.substring(0, lastQuote).match(/\\+$/) || [''])[0].length;
        if (precedingBackslashes % 2 === 0) { // Not escaped
           // Check if it's unbalanced
           const quotes = fixedStr.match(/"/g) || [];
           if (quotes.length % 2 !== 0) {
              fixedStr += '"';
           }
        }
      }

      // Try to close unbalanced brackets
      const openBraces = (fixedStr.match(/\{/g) || []).length;
      const closeBraces = (fixedStr.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) fixedStr += '}';

      const openBrackets = (fixedStr.match(/\[/g) || []).length;
      const closeBrackets = (fixedStr.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) fixedStr += ']';

      try {
        return JSON.parse(fixedStr);
      } catch (innerError) {
        logger.error(`Failed to parse JSON even after cleanup: ${innerError.message}`);
        logger.debug(`Raw snippet: ${raw.substring(0, 200)}...`);
        return defaultValue;
      }
    }
  } catch (error) {
    logger.error(`Error in robustParseJSON: ${error.message}`);
    return defaultValue;
  }
};

export default { robustParseJSON };
