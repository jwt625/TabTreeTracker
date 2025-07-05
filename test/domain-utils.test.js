// =============================================================================
// Domain Utils Test Suite
// =============================================================================

import { describe, it, expect } from 'vitest';
import { 
  extractDomain, 
  generateDomainColor, 
  groupNodesByDomain
} from '../src/domain-utils.js';

describe('Domain Utils', () => {
  describe('extractDomain', () => {
    it('should extract domains correctly from various URLs', () => {
      const testCases = [
        { url: 'https://github.com/user/repo', expected: 'github.com' },
        { url: 'https://www.google.com/search', expected: 'google.com' },
        { url: 'https://docs.github.com/en/issues', expected: 'docs.github.com' },
        { url: 'https://stackoverflow.com/questions/12345', expected: 'stackoverflow.com' },
        { url: 'chrome://newtab/', expected: 'chrome' },
        { url: 'invalid-url', expected: 'unknown' },
        { url: '', expected: 'unknown' }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = extractDomain(url);
        expect(result).toBe(expected);
      });
    });

    it('should handle edge cases', () => {
      expect(extractDomain(null)).toBe('unknown');
      expect(extractDomain(undefined)).toBe('unknown');
      expect(extractDomain(123)).toBe('unknown');
    });
  });

  describe('generateDomainColor', () => {
    it('should generate consistent colors for domains', () => {
      const domain1 = 'github.com';
      const domain2 = 'google.com';
      
      const color1a = generateDomainColor(domain1);
      const color1b = generateDomainColor(domain1);
      const color2 = generateDomainColor(domain2);
      
      expect(color1a).toBe(color1b); // Same domain should have same color
      expect(color1a).not.toBe(color2); // Different domains should have different colors
      expect(color1a).toMatch(/^#[0-9a-f]{6}$/i); // Should be valid hex color
    });

    it('should handle unknown domains', () => {
      const color = generateDomainColor('unknown');
      expect(color).toBe('#999999');
    });
  });

  describe('groupNodesByDomain', () => {
    const sampleTabTree = {
      '1-1640995200000': {
        id: '1-1640995200000',
        tabId: 1,
        url: 'https://github.com/user/repo',
        title: 'GitHub Repository',
        createdAt: 1640995200000,
        children: [
          {
            id: '2-1640995260000',
            tabId: 2,
            url: 'https://github.com/user/repo/issues',
            title: 'Issues',
            createdAt: 1640995260000,
            children: []
          }
        ]
      }
    };

    it('should group nodes by domain correctly', () => {
      const domainGroups = groupNodesByDomain(sampleTabTree);
      
      expect(domainGroups.size).toBeGreaterThan(0);
      expect(domainGroups.has('github.com')).toBe(true);
      
      const githubGroup = domainGroups.get('github.com');
      expect(githubGroup.nodes.length).toBe(2); // Parent and child
      expect(githubGroup.domain).toBe('github.com');
      expect(githubGroup.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should handle empty input', () => {
      const domainGroups = groupNodesByDomain({});
      expect(domainGroups.size).toBe(0);
    });

    it('should handle null/undefined input', () => {
      expect(() => groupNodesByDomain(null)).not.toThrow();
      expect(() => groupNodesByDomain(undefined)).not.toThrow();
    });
  });
});
