/**
 * Utility functions for formatting descriptions with stepwise display
 */

/**
 * Formats a description string to display stepwise items
 * Handles patterns like "1)Item 1\n\n2)Item 2" or "1)Item 1\n2)Item 2"
 * 
 * @param description The raw description string
 * @returns Formatted description with proper stepwise display
 */
export const formatStepwiseDescription = (description?: string): string => {
  if (!description) return '';
  
  // Split by newlines and filter out empty lines
  const lines = description.split('\n').filter(line => line.trim());
  
  // If no numbered patterns found, return as-is
  const hasNumberedPattern = lines.some(line => /^\d+\)/.test(line.trim()));
  if (!hasNumberedPattern) {
    return description;
  }
  
  // Process each line to maintain stepwise formatting
  return lines.map(line => {
    const trimmedLine = line.trim();
    
    // Check if line starts with a number pattern like "1)" or "2)"
    const match = trimmedLine.match(/^(\d+)\)(.*)$/);
    if (match) {
      const [, number, rest] = match;
      return `${number}) ${rest.trim()}`;
    }
    
    // Return line as-is if no pattern match
    return trimmedLine;
  }).join('\n');
};

/**
 * Renders a description as stepwise list items for React components
 * 
 * @param description The raw description string
 * @returns Array of strings, each representing a step/item
 */
export const getDescriptionSteps = (description?: string): string[] => {
  if (!description) return [];
  
  // Split by newlines and filter out empty lines
  const lines = description.split('\n').filter(line => line.trim());
  
  // Process each line to extract steps
  const steps: string[] = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Check if line starts with a number pattern like "1)" or "2)"
    const match = trimmedLine.match(/^(\d+)\)(.*)$/);
    if (match) {
      const [, number, rest] = match;
      steps.push(`${number}) ${rest.trim()}`);
    } else if (steps.length > 0) {
      // If this is a continuation of the previous step, append it
      steps[steps.length - 1] += ' ' + trimmedLine;
    } else if (trimmedLine) {
      // If no numbered pattern but there's content, treat as a single step
      steps.push(trimmedLine);
    }
  });
  
  return steps;
};

/**
 * Checks if a description contains stepwise formatting
 * 
 * @param description The description string to check
 * @returns True if the description contains numbered steps
 */
export const hasStepwiseFormat = (description?: string): boolean => {
  if (!description) return false;
  
  const lines = description.split('\n').filter(line => line.trim());
  return lines.some(line => /^\d+\)/.test(line.trim()));
};
