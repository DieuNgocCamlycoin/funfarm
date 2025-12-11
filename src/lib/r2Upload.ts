import { supabase } from "@/integrations/supabase/client";

export interface R2UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

/**
 * Upload file to Cloudflare R2 storage via edge function
 * @param file - File to upload
 * @param folder - Folder path (e.g., "avatars", "posts", "covers")
 * @returns Upload result with public URL
 */
export async function uploadToR2(file: File | Blob, folder: string = "general"): Promise<R2UploadResult> {
  try {
    // Create form data
    const formData = new FormData();
    
    // If it's a Blob without a name, give it one
    if (file instanceof Blob && !(file instanceof File)) {
      const extension = file.type.split("/")[1] || "jpg";
      formData.append("file", file, `upload.${extension}`);
    } else {
      formData.append("file", file);
    }
    formData.append("folder", folder);

    // Get auth session for the request
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    // Call edge function
    const response = await fetch(
      "https://onhznjyccagjoefavbaq.supabase.co/functions/v1/upload-r2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("R2 upload failed:", result);
      return { success: false, error: result.error || "Upload failed" };
    }

    return {
      success: true,
      url: result.url,
      fileName: result.fileName,
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Upload failed" 
    };
  }
}

/**
 * Upload multiple files to R2
 */
export async function uploadMultipleToR2(
  files: (File | Blob)[],
  folder: string = "general"
): Promise<R2UploadResult[]> {
  const results = await Promise.all(
    files.map(file => uploadToR2(file, folder))
  );
  return results;
}
