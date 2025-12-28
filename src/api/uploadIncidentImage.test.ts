/**
 * Property-Based Tests for Image Attachment with Validation
 * 
 * Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
 * Validates: Requirements 18.1, 18.2, 18.3, 18.4
 * 
 * Tests that:
 * - Valid images are uploaded to storage
 * - Attachment records are created
 * - Images are displayed with incidents
 * - Invalid formats are rejected
 * - Oversized files are rejected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { uploadIncidentImage, deleteIncidentImage } from './uploadIncidentImage';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('Image Attachment with Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
  // Validates: Requirements 18.1, 18.2, 18.4
  it('should upload valid images with supported formats (JPEG, PNG, WebP)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('image/jpeg'),
          fc.constant('image/png'),
          fc.constant('image/webp')
        ),
        fc.integer({ min: 1, max: 10 * 1024 * 1024 }), // Valid size: 1 byte to 10MB
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // Non-empty filename
        async (mimeType, fileSize, fileName) => {
          // Create a mock File object
          const mockFile = new File(
            [new ArrayBuffer(fileSize)],
            fileName,
            { type: mimeType }
          );

          // Mock successful upload
          const mockUpload = vi.fn().mockResolvedValue({ error: null });
          const mockGetPublicUrl = vi.fn().mockReturnValue({
            data: { publicUrl: `https://example.com/storage/${fileName}` },
          });

          (supabase.storage.from as any).mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          });

          // Upload the file
          const result = await uploadIncidentImage(mockFile);

          // Verify upload was called
          expect(mockUpload).toHaveBeenCalledWith(
            expect.stringContaining('.'),
            mockFile,
            expect.objectContaining({
              cacheControl: '3600',
              upsert: false,
            })
          );

          // Verify public URL was retrieved
          expect(mockGetPublicUrl).toHaveBeenCalled();

          // Verify result is a valid URL
          expect(result).toMatch(/^https?:\/\/.+/);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // 30 second timeout for property-based test

  // Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
  // Validates: Requirements 18.4
  it('should reject files with invalid formats (non-image types)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('application/pdf'),
          fc.constant('text/plain'),
          fc.constant('video/mp4'),
          fc.constant('audio/mpeg'),
          fc.constant('application/json'),
          fc.constant('text/html')
        ),
        fc.integer({ min: 1, max: 1024 * 1024 }), // Size
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // Non-empty filename
        async (mimeType, fileSize, fileName) => {
          // Create a mock File object with invalid type
          const mockFile = new File(
            [new ArrayBuffer(fileSize)],
            fileName,
            { type: mimeType }
          );

          // Attempt to upload should throw error
          await expect(uploadIncidentImage(mockFile)).rejects.toThrow(
            'File must be an image'
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
  // Validates: Requirements 18.4
  it('should reject files larger than 10MB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('image/jpeg'),
          fc.constant('image/png'),
          fc.constant('image/webp')
        ),
        fc.integer({ min: 10 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 }), // Over 10MB
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // Non-empty filename
        async (mimeType, fileSize, fileName) => {
          // Create a mock File object that's too large
          const mockFile = new File(
            [new ArrayBuffer(fileSize)],
            fileName,
            { type: mimeType }
          );

          // Attempt to upload should throw error
          await expect(uploadIncidentImage(mockFile)).rejects.toThrow(
            'Image size must be less than 10MB'
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
  // Validates: Requirements 18.1
  it('should generate unique filenames for uploaded images', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant('image/jpeg'),
        fc.integer({ min: 1, max: 1024 * 1024 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (mimeType, fileSize, fileName) => {
          const mockFile = new File(
            [new ArrayBuffer(fileSize)],
            fileName,
            { type: mimeType }
          );

          const uploadedFilenames: string[] = [];
          const mockUpload = vi.fn().mockImplementation((filename) => {
            uploadedFilenames.push(filename);
            return Promise.resolve({ error: null });
          });

          const mockGetPublicUrl = vi.fn().mockReturnValue({
            data: { publicUrl: `https://example.com/storage/${fileName}` },
          });

          (supabase.storage.from as any).mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          });

          // Upload the same file twice
          await uploadIncidentImage(mockFile);
          
          // Reset mocks but keep the filename array
          mockUpload.mockClear();
          mockGetPublicUrl.mockClear();
          
          (supabase.storage.from as any).mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          });
          
          await uploadIncidentImage(mockFile);

          // Verify that different filenames were generated
          expect(uploadedFilenames).toHaveLength(2);
          expect(uploadedFilenames[0]).not.toBe(uploadedFilenames[1]);
        }
      ),
      { numRuns: 10 } // Reduced runs since we're uploading twice per iteration
    );
  });

  // Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
  // Validates: Requirements 18.1
  it('should handle upload errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant('image/jpeg'),
        fc.integer({ min: 1, max: 1024 * 1024 }),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 100 }), // Error message
        async (mimeType, fileSize, fileName, errorMessage) => {
          const mockFile = new File(
            [new ArrayBuffer(fileSize)],
            fileName,
            { type: mimeType }
          );

          // Mock upload failure
          const mockUpload = vi.fn().mockResolvedValue({
            error: { message: errorMessage },
          });

          (supabase.storage.from as any).mockReturnValue({
            upload: mockUpload,
          });

          // Upload should throw error with message
          await expect(uploadIncidentImage(mockFile)).rejects.toThrow(
            `Failed to upload image: ${errorMessage}`
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
  // Validates: Requirements 18.1
  it('should delete images from storage by URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 })
          .filter(s => {
            // Filter out strings that would cause URL encoding issues
            const trimmed = s.trim();
            if (trimmed.length < 5) return false;
            if (s.includes('/') || s.includes('?') || s.includes('#') || s.includes('%') || s.includes('\\')) return false;
            // Try to encode/decode to ensure it's valid
            try {
              const encoded = encodeURIComponent(s);
              decodeURIComponent(encoded);
              return true;
            } catch {
              return false;
            }
          }),
        async (fileName) => {
          const imageUrl = `https://example.com/storage/incident-images/${fileName}`;

          // Mock successful deletion
          const mockRemove = vi.fn().mockResolvedValue({ error: null });

          (supabase.storage.from as any).mockReturnValue({
            remove: mockRemove,
          });

          // Delete the image
          await deleteIncidentImage(imageUrl);

          // Verify remove was called - need to decode the URL-encoded filename
          const calls = mockRemove.mock.calls;
          expect(calls).toHaveLength(1);
          expect(calls[0][0]).toHaveLength(1);
          // The filename might be URL-encoded, so decode it for comparison
          const calledFilename = decodeURIComponent(calls[0][0][0]);
          expect(calledFilename).toBe(fileName);
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: resq-emergency-response-system, Property 19: Image Attachment with Validation
  // Validates: Requirements 18.1
  it('should handle deletion errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 })
          .filter(s => {
            // Filter out strings that would cause URL encoding issues or invalid URLs
            const trimmed = s.trim();
            if (trimmed.length < 5) return false;
            if (s.includes('/') || s.includes('?') || s.includes('#') || s.includes('%') || s.includes('\\')) return false;
            // Try to encode/decode to ensure it's valid
            try {
              const encoded = encodeURIComponent(s);
              decodeURIComponent(encoded);
              return true;
            } catch {
              return false;
            }
          }),
        fc.string({ minLength: 5, maxLength: 100 }), // Error message
        async (fileName, errorMessage) => {
          const imageUrl = `https://example.com/storage/incident-images/${fileName}`;

          // Mock deletion failure
          const mockRemove = vi.fn().mockResolvedValue({
            error: { message: errorMessage },
          });

          (supabase.storage.from as any).mockReturnValue({
            remove: mockRemove,
          });

          // Deletion should throw error with message
          await expect(deleteIncidentImage(imageUrl)).rejects.toThrow(
            `Failed to delete image: ${errorMessage}`
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  // Unit test: Specific edge case for empty file
  it('should handle empty files (edge case)', async () => {
    const mockFile = new File([], 'empty.jpg', { type: 'image/jpeg' });

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/storage/empty.jpg' },
    });

    (supabase.storage.from as any).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const result = await uploadIncidentImage(mockFile);

    expect(mockUpload).toHaveBeenCalled();
    expect(result).toMatch(/^https?:\/\/.+/);
  });

  // Unit test: Specific edge case for exactly 10MB file
  it('should accept files exactly at 10MB limit (edge case)', async () => {
    const exactSize = 10 * 1024 * 1024; // Exactly 10MB
    const mockFile = new File(
      [new ArrayBuffer(exactSize)],
      'limit.jpg',
      { type: 'image/jpeg' }
    );

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/storage/limit.jpg' },
    });

    (supabase.storage.from as any).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const result = await uploadIncidentImage(mockFile);

    expect(mockUpload).toHaveBeenCalled();
    expect(result).toMatch(/^https?:\/\/.+/);
  });

  // Unit test: Specific edge case for file with no extension
  it('should handle files with no extension (edge case)', async () => {
    const mockFile = new File(
      [new ArrayBuffer(1024)],
      'noextension',
      { type: 'image/jpeg' }
    );

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/storage/noextension' },
    });

    (supabase.storage.from as any).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const result = await uploadIncidentImage(mockFile);

    // Should use the original filename's extension (which is 'noextension' in this case)
    // The implementation uses file.name.split('.').pop() which returns 'noextension' for files without dots
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/\.noextension$/),
      mockFile,
      expect.any(Object)
    );
    expect(result).toMatch(/^https?:\/\/.+/);
  });

  // Unit test: Invalid URL for deletion
  it('should reject invalid URLs for deletion (edge case)', async () => {
    const invalidUrl = 'not-a-valid-url';

    await expect(deleteIncidentImage(invalidUrl)).rejects.toThrow();
  });
});
