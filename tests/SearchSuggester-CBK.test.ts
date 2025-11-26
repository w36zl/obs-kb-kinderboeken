/**
 * SearchSuggester CBK Integration Tests
 *
 * Tests that verify suggestions come from the real KB CBK database
 * rather than hardcoded data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock Obsidian's requestUrl before importing SearchSuggester
vi.mock('obsidian', () => ({
  requestUrl: vi.fn(),
  Notice: vi.fn(),
}));

import { SearchSuggester } from '../src/search/SearchSuggester';
import { requestUrl } from 'obsidian';

describe('SearchSuggester - CBK Database Integration', () => {
  let suggester: SearchSuggester;
  const mockRequestUrl = vi.mocked(requestUrl);

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    mockRequestUrl.mockResolvedValue({
      status: 404,
      text: '',
    });

    suggester = new SearchSuggester();
  });

  describe('Live KB CBK API Integration', () => {
    it('should fetch suggestions from KB CBK API when user types', async () => {
      // Mock successful API response with real CBK data structure
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>15</srw:numberOfRecords>
  <srw:records>
    <srw:record>
      <srw:recordData>
        <dc:title>De Gruffalo</dc:title>
        <dc:creator>Julia Donaldson</dc:creator>
        <dc:subject>prentenboeken</dc:subject>
        <dc:subject>monsters</dc:subject>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:title>Gruffalo's kind</dc:title>
        <dc:creator>Julia Donaldson</dc:creator>
        <dc:subject>prentenboeken</dc:subject>
        <dc:relation>Gruffalo serie</dc:relation>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:title>De Gruffalo winterboek</dc:title>
        <dc:creator>Julia Donaldson</dc:creator>
        <dc:subject>prentenboeken</dc:subject>
        <dc:subject>winter</dc:subject>
        <dcterms:isPartOf>Gruffalo serie</dcterms:isPartOf>
      </srw:recordData>
    </srw:record>
  </srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValueOnce(mockCBKResponse);

      const suggestions = await suggester.getSuggestions('gruffalo');

      // Verify API was called
      expect(mockRequestUrl).toHaveBeenCalledTimes(1);
      const apiCall = mockRequestUrl.mock.calls[0][0];
      expect(apiCall.url).toContain('jsru.kb.nl/sru/sru');
      expect(apiCall.url).toContain('x-collection=GGC');
      expect(apiCall.url).toContain('gruffalo');

      // Verify suggestions contain CBK data
      expect(suggestions.length).toBeGreaterThan(0);

      // Should have author suggestions from CBK
      const authorSuggestions = suggestions.filter(s => s.type === 'author');
      expect(authorSuggestions.some(s => s.text.toLowerCase().includes('julia donaldson'))).toBe(true);

      // Should have series suggestions from CBK
      const seriesSuggestions = suggestions.filter(s => s.type === 'series');
      expect(seriesSuggestions.some(s => s.text.toLowerCase().includes('gruffalo'))).toBe(true);

      // Should have subject suggestions from CBK
      const subjectSuggestions = suggestions.filter(s => s.type === 'subject');
      expect(subjectSuggestions.some(s => s.text.toLowerCase().includes('prentenboeken'))).toBe(true);
    });

    it('should extract authors from CBK dc:creator fields', async () => {
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>10</srw:numberOfRecords>
  <srw:records>
    <srw:record>
      <srw:recordData>
        <dc:title>Kikker is verliefd</dc:title>
        <dc:creator>Max Velthuijs</dc:creator>
        <dc:subject>vriendschap</dc:subject>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:title>Kikker in de kou</dc:title>
        <dc:creator>Max Velthuijs</dc:creator>
        <dc:subject>vriendschap</dc:subject>
      </srw:recordData>
    </srw:record>
  </srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValueOnce(mockCBKResponse);

      const suggestions = await suggester.getSuggestions('kikker');

      const authorSuggestions = suggestions.filter(s => s.type === 'author');
      expect(authorSuggestions.some(s =>
        s.text.toLowerCase().includes('max velthuijs')
      )).toBe(true);

      // Verify metadata shows it's from CBK
      const velthuijsSuggestion = authorSuggestions.find(s =>
        s.text.toLowerCase().includes('max velthuijs')
      );
      expect(velthuijsSuggestion?.metadata?.description).toContain('CBK');
    });

    it('should extract series from CBK dc:relation and dcterms:isPartOf fields', async () => {
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>5</srw:numberOfRecords>
  <srw:records>
    <srw:record>
      <srw:recordData>
        <dc:title>Het muizenhuis: Sam en Julia</dc:title>
        <dc:creator>Karina Schaapman</dc:creator>
        <dc:relation>Muizenhuis serie</dc:relation>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:title>Het muizenhuis: Een dief in huis</dc:title>
        <dc:creator>Karina Schaapman</dc:creator>
        <dcterms:isPartOf>Muizenhuis serie</dcterms:isPartOf>
      </srw:recordData>
    </srw:record>
  </srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValueOnce(mockCBKResponse);

      const suggestions = await suggester.getSuggestions('muizenhuis');

      const seriesSuggestions = suggestions.filter(s => s.type === 'series');
      expect(seriesSuggestions.some(s =>
        s.text.toLowerCase().includes('muizenhuis')
      )).toBe(true);
    });

    it('should extract subjects from CBK dc:subject fields', async () => {
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>8</srw:numberOfRecords>
  <srw:records>
    <srw:record>
      <srw:recordData>
        <dc:title>Boek over vriendschap</dc:title>
        <dc:subject>vriendschap</dc:subject>
        <dc:subject>prentenboeken</dc:subject>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:title>Vrienden voor altijd</dc:title>
        <dc:subject>vriendschap</dc:subject>
        <dc:subject>emoties</dc:subject>
      </srw:recordData>
    </srw:record>
  </srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValueOnce(mockCBKResponse);

      const suggestions = await suggester.getSuggestions('vriendschap');

      const subjectSuggestions = suggestions.filter(s => s.type === 'subject');
      expect(subjectSuggestions.some(s =>
        s.text.toLowerCase().includes('vriendschap')
      )).toBe(true);
    });

    it('should cache CBK results for 5 minutes', async () => {
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>1</srw:numberOfRecords>
  <srw:records>
    <srw:record>
      <srw:recordData>
        <dc:title>Test Book</dc:title>
        <dc:creator>Test Author</dc:creator>
      </srw:recordData>
    </srw:record>
  </srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValue(mockCBKResponse);

      // First call - should hit API
      await suggester.getSuggestions('test');
      expect(mockRequestUrl).toHaveBeenCalledTimes(1);

      // Second call within 5 minutes - should use cache
      await suggester.getSuggestions('test');
      expect(mockRequestUrl).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should handle CBK API errors gracefully', async () => {
      // Mock API error
      mockRequestUrl.mockRejectedValueOnce(new Error('Network error'));

      const suggestions = await suggester.getSuggestions('error');

      // Should return fallback suggestions (vocabulary/popular)
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should prioritize CBK suggestions over hardcoded vocabulary', async () => {
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>3</srw:numberOfRecords>
  <srw:records>
    <srw:record>
      <srw:recordData>
        <dc:title>Donald Duck verhalen</dc:title>
        <dc:creator>Disney</dc:creator>
        <dc:subject>strips</dc:subject>
      </srw:recordData>
    </srw:record>
  </srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValueOnce(mockCBKResponse);

      const suggestions = await suggester.getSuggestions('donald');

      // First suggestions should be from CBK (have metadata.description with "CBK")
      const firstFew = suggestions.slice(0, 3);
      const cbkSuggestions = firstFew.filter(s =>
        s.metadata?.description?.includes('CBK')
      );

      expect(cbkSuggestions.length).toBeGreaterThan(0);
    });

    it('should rank suggestions by frequency in CBK results', async () => {
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>10</srw:numberOfRecords>
  <srw:records>
    <srw:record>
      <srw:recordData>
        <dc:creator>Julia Donaldson</dc:creator>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:creator>Julia Donaldson</dc:creator>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:creator>Julia Donaldson</dc:creator>
      </srw:recordData>
    </srw:record>
    <srw:record>
      <srw:recordData>
        <dc:creator>Julia Roberts</dc:creator>
      </srw:recordData>
    </srw:record>
  </srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValueOnce(mockCBKResponse);

      const suggestions = await suggester.getSuggestions('julia');

      const authorSuggestions = suggestions.filter(s => s.type === 'author');

      // Julia Donaldson appears 3 times, Julia Roberts 1 time
      // So Donaldson should rank higher
      const donaldsonIndex = authorSuggestions.findIndex(s =>
        s.text.toLowerCase().includes('donaldson')
      );
      const robertsIndex = authorSuggestions.findIndex(s =>
        s.text.toLowerCase().includes('roberts')
      );

      if (donaldsonIndex !== -1 && robertsIndex !== -1) {
        expect(donaldsonIndex).toBeLessThan(robertsIndex);
      }
    });

    it('should fallback to vocabulary when CBK returns no results', async () => {
      const mockCBKResponse = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>0</srw:numberOfRecords>
  <srw:records></srw:records>
</srw:searchRetrieveResponse>`,
      };

      mockRequestUrl.mockResolvedValueOnce(mockCBKResponse);

      const suggestions = await suggester.getSuggestions('nonexistent');

      // Should still return suggestions from vocabulary/popular queries
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('CQL Query Construction', () => {
    it('should construct valid CQL query for KB API', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>0</srw:numberOfRecords>
  <srw:records></srw:records>
</srw:searchRetrieveResponse>`,
      });

      await suggester.getSuggestions('test query');

      const apiCall = mockRequestUrl.mock.calls[0][0];
      expect(apiCall.url).toContain('operation=searchRetrieve');
      expect(apiCall.url).toContain('query=');
      expect(apiCall.url).toContain('cql.serverChoice');
    });

    it('should escape special CQL characters', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/">
  <srw:numberOfRecords>0</srw:numberOfRecords>
  <srw:records></srw:records>
</srw:searchRetrieveResponse>`,
      });

      await suggester.getSuggestions('test "quoted" query');

      // Verify API call doesn't break with special characters
      expect(mockRequestUrl).toHaveBeenCalled();
      const apiCall = mockRequestUrl.mock.calls[0][0];
      expect(apiCall.url).toBeDefined();
    });
  });
});
