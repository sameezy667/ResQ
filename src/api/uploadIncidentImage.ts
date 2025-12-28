/**
 * Incident Image Upload Service
 * 
 * Handles uploading incident photos to Supabase Storage.
 * Images are stored in the 'incident-images' bucket with public access.
 * 
 * @module api/uploadIncidentImage
 */

import { supabase } from '../lib/supabase';

/**
 * Upload an incident image to Supabase Storage
 * 
 * Generates a unique filename using timestamp and random string,
 * uploads to the incident-images bucket, and returns the public URL.
 * 
 * @param file - Image file to upload
 * @returns Public URL of the uploaded image
 * @throws Error if upload fails or bucket is not configured
 */
export async function uploadIncidentImage(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 10MB)
  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error('Image size must be less than 10MB');
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase
    .storage
    .from('incident-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL
  const { data } = supabase.storage
    .from('incident-images')
    .getPublicUrl(fileName);

  if (!data.publicUrl) {
    throw new Error('Failed to get public URL for uploaded image');
  }

  return data.publicUrl;
}

/**
 * Delete an incident image from Supabase Storage
 * 
 * @param imageUrl - Public URL of the image to delete
 * @throws Error if deletion fails
 */
export async function deleteIncidentImage(imageUrl: string): Promise<void> {
  // Extract filename from URL
  const url = new URL(imageUrl);
  const pathParts = url.pathname.split('/');
  const fileName = pathParts[pathParts.length - 1];

  if (!fileName) {
    throw new Error('Invalid image URL');
  }

  const { error } = await supabase
    .storage
    .from('incident-images')
    .remove([fileName]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}
