import { parse } from "tldts";

export interface URLValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
  parsed?: {
    scheme: string;
    host: string;
    port?: string;
    path: string;
    query?: string;
    fragment?: string;
  };
  domain?: {
    subdomain: string | null;
    domainWithoutSuffix: string | null;
    tld: string | null;
    isIcann: boolean | null;      // Official ICANN domain (e.g. .com, .org)
    isPrivate: boolean | null;    // Private domain (e.g. .github.io, .vercel.app)
  };
}

export interface URLValidationOptions {
  requireHttps?: boolean;
  allowedSchemes?: string[];
  blockedSchemes?: string[];
  allowEmpty?: boolean;
  allowPrivateDomains?: boolean;
  requireIcannDomain?: boolean;
}

const DEFAULT_BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];

/**
 * Validates and normalizes a URL string with comprehensive security checks and real domain validation
 */
export function validateUrl(
  url: string,
  options: URLValidationOptions = {}
): URLValidationResult {
  const {
    requireHttps = false,
    allowedSchemes = ['http:', 'https:'],
    blockedSchemes = DEFAULT_BLOCKED_SCHEMES,
    allowEmpty = true,
    allowPrivateDomains = true,
    requireIcannDomain = false
  } = options;

  // 1. Empty check
  if (!url || url.trim() === '') {
    return {
      isValid: allowEmpty,
      error: allowEmpty ? undefined : 'URL cannot be empty'
    };
  }

  const trimmedUrl = url.trim();

  // 2. Check for blocked schemes first (security)
  for (const blockedScheme of blockedSchemes) {
    if (trimmedUrl.toLowerCase().startsWith(blockedScheme)) {
      return {
        isValid: false,
        error: `Unsafe URL scheme "${blockedScheme}" is not allowed`
      };
    }
  }

  // 3. Auto-prepend https:// if no scheme is present
  let urlToParse = trimmedUrl;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmedUrl)) {
    urlToParse = `https://${trimmedUrl}`;
  }

  // 4. Basic URL structure check
  let parsedURL: URL;
  try {
    parsedURL = new URL(urlToParse);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }

  // 5. Scheme whitelist
  if (allowedSchemes.length > 0 && !allowedSchemes.includes(parsedURL.protocol)) {
    return {
      isValid: false,
      error: `URL scheme "${parsedURL.protocol}" is not allowed`
    };
  }

  // 6. HTTPS requirement
  if (requireHttps && parsedURL.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'HTTPS is required for this URL'
    };
  }

  // 7. Hostname presence
  if (!parsedURL.hostname) {
    return {
      isValid: false,
      error: 'Missing hostname'
    };
  }

  // 8. Allow localhost explicitly
  if (parsedURL.hostname === 'localhost') {
    return {
      isValid: true,
      normalizedUrl: urlToParse,
      parsed: {
        scheme: parsedURL.protocol,
        host: parsedURL.hostname,
        port: parsedURL.port || undefined,
        path: parsedURL.pathname,
        query: parsedURL.search || undefined,
        fragment: parsedURL.hash || undefined
      }
    };
  }

  // 9. Allow valid IP addresses
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(parsedURL.hostname)) {
    const octets = parsedURL.hostname.split('.').map(Number);
    const validIP = octets.every((o) => o >= 0 && o <= 255);
    if (!validIP) {
      return {
        isValid: false,
        error: 'Invalid IP address'
      };
    }
    
    return {
      isValid: true,
      normalizedUrl: urlToParse,
      parsed: {
        scheme: parsedURL.protocol,
        host: parsedURL.hostname,
        port: parsedURL.port || undefined,
        path: parsedURL.pathname,
        query: parsedURL.search || undefined,
        fragment: parsedURL.hash || undefined
      }
    };
  }

  // 10. ✅ Real domain validation using tldts (Public Suffix List)
  const domainInfo = parse(parsedURL.hostname, {
    allowPrivateDomains: allowPrivateDomains,
    validHosts: [],
  });

  // Check if it's a valid domain (ICANN or private)
  if (!domainInfo.isIcann && !domainInfo.isPrivate) {
    return {
      isValid: false,
      error: 'Not a real or recognized domain'
    };
  }

  // If we require only ICANN domains, reject private domains
  if (requireIcannDomain && !domainInfo.isIcann) {
    return {
      isValid: false,
      error: 'Only official ICANN domains are allowed'
    };
  }

  if (!domainInfo.domainWithoutSuffix) {
    return {
      isValid: false,
      error: 'Missing domain name before TLD'
    };
  }

  if (!domainInfo.publicSuffix) {
    return {
      isValid: false,
      error: 'Invalid or unrecognized TLD'
    };
  }

  // 11. Validate port range if present
  if (parsedURL.port) {
    const portNum = parseInt(parsedURL.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return {
        isValid: false,
        error: 'URL port must be between 1 and 65535'
      };
    }
  }

  // Extract components for display
  const components = {
    scheme: parsedURL.protocol,
    host: parsedURL.hostname,
    port: parsedURL.port || undefined,
    path: parsedURL.pathname,
    query: parsedURL.search || undefined,
    fragment: parsedURL.hash || undefined
  };

  const domainComponents = {
    subdomain: domainInfo.subdomain ?? null,
    domainWithoutSuffix: domainInfo.domainWithoutSuffix,
    tld: domainInfo.publicSuffix,
    isIcann: domainInfo.isIcann ?? null,
    isPrivate: domainInfo.isPrivate ?? null,
  };

  return {
    isValid: true,
    normalizedUrl: urlToParse,
    parsed: components,
    domain: domainComponents
  };
}

/**
 * Real-time URL validation for form inputs
 */
export function validateUrlForForm(url: string): {
  isValid: boolean;
  error?: string;
  suggestion?: string;
} {
  const result = validateUrl(url, {
    allowEmpty: false,
    allowedSchemes: ['http:', 'https:'],
    requireHttps: false,
    allowPrivateDomains: true,
    requireIcannDomain: false
  });

  if (result.isValid) {
    return {
      isValid: true,
      suggestion: result.normalizedUrl
    };
  }

  // Provide helpful suggestions for common errors
  const error = result.error || '';
  let suggestion: string | undefined;

  if (error.includes('scheme') && !url.includes('://')) {
    suggestion = `https://${url}`;
  } else if (error.includes('hostname')) {
    suggestion = 'Please enter a complete URL like https://example.com';
  } else if (error.includes('Not a real or recognized domain')) {
    suggestion = 'Please enter a valid domain like https://example.com';
  }

  return {
    isValid: false,
    error,
    suggestion
  };
}

/**
 * URL examples for testing and demonstration
 */
export const URL_EXAMPLES = {
  valid: [
    'https://example.com',
    'https://www.example.com',
    'https://example.com/path',
    'https://example.com/path?query=value',
    'https://example.com:8080',
    'https://localhost:3000',
    'https://192.168.1.1',
    'https://myapp.vercel.app',
    'https://user.github.io',
    'https://example.co.uk',
    'example.com', // Will be normalized to https://example.com
  ],
  invalid: [
    'javascript:alert("xss")',
    'data:text/html,<script>alert("xss")</script>',
    'file:///etc/passwd',
    'ftp://example.com',
    'https://example', // Not a real domain
    'https://example.invalidtld', // Unrecognized TLD
    'https://', // Missing hostname
    '://missing-protocol.com',
    'https://example.com:99999', // Invalid port
    'https://999.999.999.999', // Invalid IP
  ]
};
