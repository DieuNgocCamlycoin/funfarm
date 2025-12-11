import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get R2 credentials from environment
    const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
    const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME");
    const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT");
    const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL");

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT || !R2_PUBLIC_URL) {
      console.error("Missing R2 configuration");
      throw new Error("R2 configuration is incomplete");
    }

    // Verify user authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      console.error("No token found in authorization header");
      return new Response(JSON.stringify({ error: "Invalid authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Use getUser with the token directly
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing upload request for user: ${user.id}`);

    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "general";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Generate unique file name
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${folder}/${user.id}/${timestamp}.${extension}`;

    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Create AWS signature for R2
    const date = new Date();
    const dateString = date.toISOString().split("T")[0].replace(/-/g, "");
    const dateTimeString = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    
    // Extract region from endpoint (e.g., https://xxx.r2.cloudflarestorage.com)
    const endpointUrl = new URL(R2_ENDPOINT);
    const region = "auto"; // Cloudflare R2 uses "auto" for region

    // Build canonical request - include bucket name in URI
    const method = "PUT";
    const canonicalUri = `/${R2_BUCKET_NAME}/${fileName}`;
    const canonicalQueryString = "";
    
    // Calculate content hash
    const contentHash = await crypto.subtle.digest("SHA-256", fileBytes);
    const contentHashHex = Array.from(new Uint8Array(contentHash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const headers: Record<string, string> = {
      "host": endpointUrl.host,
      "x-amz-content-sha256": contentHashHex,
      "x-amz-date": dateTimeString,
      "content-type": file.type,
      "content-length": fileBytes.length.toString(),
    };

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key}:${headers[key]}`)
      .join("\n") + "\n";

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      contentHashHex,
    ].join("\n");

    // Create string to sign
    const algorithm = "AWS4-HMAC-SHA256";
    const scope = `${dateString}/${region}/s3/aws4_request`;
    const canonicalRequestHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonicalRequest)
    );
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const stringToSign = [
      algorithm,
      dateTimeString,
      scope,
      canonicalRequestHashHex,
    ].join("\n");

    // Calculate signing key
    async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
      const keyBuffer = key instanceof Uint8Array ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) : key;
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBuffer as ArrayBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
    }

    const kDate = await hmacSha256(
      new TextEncoder().encode(`AWS4${R2_SECRET_ACCESS_KEY}`),
      dateString
    );
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, "s3");
    const kSigning = await hmacSha256(kService, "aws4_request");

    const signature = await hmacSha256(kSigning, stringToSign);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

    // Upload to R2
    const uploadUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${fileName}`;
    console.log(`Uploading to R2: ${uploadUrl}`);

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Authorization": authorizationHeader,
      },
      body: fileBytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`R2 upload failed: ${uploadResponse.status} - ${errorText}`);
      throw new Error(`R2 upload failed: ${uploadResponse.status}`);
    }

    console.log(`Upload successful: ${fileName}`);

    // Construct public URL
    const publicUrl = `${R2_PUBLIC_URL}/${fileName}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        fileName: fileName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
