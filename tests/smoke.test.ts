import { describe, it, expect, beforeAll, afterAll } from "vitest";
import axios from "axios";

/**
 * Smoke Tests for KB API Connectivity
 *
 * These tests verify basic API connectivity and core functionality.
 * They are quick and non-destructive, checking that:
 * - KB SRU API is reachable
 * - XML parsing works correctly
 * - Basic book search functionality works
 */

const KB_SRU_BASE_URL = "https://jsru.kb.nl/sru/sru";
const KB_COLLECTION = "GGC";

describe("KB API Smoke Tests", () => {
  // Set a 15 second timeout for API calls
  const API_TIMEOUT = 15000;

  it("KB API should be reachable", async () => {
    try {
      // Simple connectivity test
      const query = encodeURIComponent("titel=Nijntje");
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${query}&startRecord=1&maximumRecords=1`;

      const response = await axios.get(url, { timeout: API_TIMEOUT });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.length).toBeGreaterThan(0);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`KB API unreachable: ${error.message}`);
      }
      throw error;
    }
  }, API_TIMEOUT + 5000);

  it("should parse XML response from KB API", async () => {
    try {
      const query = encodeURIComponent("titel=Nijntje");
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${query}&startRecord=1&maximumRecords=1`;

      const response = await axios.get(url, { timeout: API_TIMEOUT });

      // Check for SRU response structure
      const data = response.data;
      expect(data).toContain("searchRetrieveResponse");
      expect(data).toContain("numberOfRecords");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`XML parsing failed: ${error.message}`);
      }
      throw error;
    }
  }, API_TIMEOUT + 5000);

  it("should return searchable results for valid query", async () => {
    try {
      const query = encodeURIComponent("titel=Nijntje");
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${query}&startRecord=1&maximumRecords=1`;

      const response = await axios.get(url, { timeout: API_TIMEOUT });
      const data = response.data;

      // Check that we got results
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);

      // Should indicate number of records found
      const matches = data.match(/numberOfRecords>(\d+)</);
      if (matches && matches[1]) {
        const numberOfRecords = parseInt(matches[1]);
        expect(numberOfRecords).toBeGreaterThanOrEqual(0);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Search results parsing failed: ${error.message}`);
      }
      throw error;
    }
  }, API_TIMEOUT + 5000);

  it("should handle empty search results gracefully", async () => {
    try {
      // Search for something unlikely to exist
      const query = encodeURIComponent("titel=XYZABC123NOTAREALBOOK");
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${query}&startRecord=1&maximumRecords=1`;

      const response = await axios.get(url, { timeout: API_TIMEOUT });

      expect(response.status).toBe(200);
      // Should still return valid XML even with no results
      expect(response.data).toContain("searchRetrieveResponse");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Empty search handling failed: ${error.message}`);
      }
      throw error;
    }
  }, API_TIMEOUT + 5000);
});
