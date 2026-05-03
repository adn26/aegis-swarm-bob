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

    // 1. Try to extract from markdown code blocks (handle multiple blocks or extra text)
    // First, look for any ```json ... ``` or ``` ... ```
    const fencedMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fencedMatch) {
      jsonStr = fencedMatch[1].trim();
    } 

    // 2. If it still looks like it has markdown (starts with ```), strip it manually
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    }

    // 3. Try to find the first '{' or '[' and the last '}' or ']'
    // This is the most reliable way to strip surrounding text
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

    // 4. Simple cleanup for common LLM JSON artifacts
    // Remove comments but ONLY if they are not preceded by a colon (to avoid destroying http:// URLs)
    // and ideally they should be preceded by a space or start of line.
    jsonStr = jsonStr.replace(/(?<!:)\/\/.*$/gm, '');

    // Attempt standard parse
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      logger.warn(`Standard JSON parse failed: ${e.message}. Attempting cleanup...`);
      logger.error(`JSON STRING THAT FAILED TO PARSE: \n${jsonStr}\n`);
      
      // Fix trailing commas in arrays and objects
      let fixedStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
      
      // Basic escaping of unescaped quotes in middle of strings (common Gemini issue)
      // This is a rough heuristic to escape quotes that aren't preceded by \ or followed by , or }
      fixedStr = fixedStr.replace(/(?<!\\)"(?!(\s*[:,\]}]))(?!(?:(?:[^"]*"){2})*[^"]*$)/g, '\\"');

      // Replace common LLM "JSON" artifacts like single quotes or unquoted keys if necessary
      // But only if it's very small and likely to be a simple fix. 
      // For more complex cases, we'll try more aggressive fixes.

      // Handle unterminated strings (common in truncated LLM output)
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
