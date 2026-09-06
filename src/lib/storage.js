import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Endpoint = process.env.S3_ENDPOINT || 'https://xmoijbwuizxsgrpnidgg.storage.supabase.co/storage/v1/s3';
const accessKeyId = process.env.S3_ACCESS_KEY_ID || '0168e890d6b143fe6deb64109ebbfce2';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || 'ecbf20cc0659c5e171bc48cbe0ac3cebdfc809dca621dd0a9816ca414053ef52';
const bucketName = process.env.S3_BUCKET || '3-Eyed-Raven';
const region = process.env.S3_REGION || 'us-east-1';

let s3ClientInstance = null;

function getS3Client() {
  if (!s3ClientInstance && accessKeyId && secretAccessKey) {
    s3ClientInstance = new S3Client({
      region,
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

/**
 * Uploads a WebP base64 or buffer image to Supabase S3 Cloud Storage bucket.
 * Returns the public URL of the uploaded image file (or base64 fallback).
 */
export async function uploadScreenshotToS3(base64Data, filename) {
  try {
    const client = getS3Client();
    if (!client) {
      console.warn('S3 client credentials missing, falling back to inline data');
      return base64Data;
    }

    // Extract raw base64 data buffer if data URL is provided
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    const key = `screenshots/${filename}.webp`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    });

    await client.send(command);

    // Supabase Public Storage Object URL
    const publicUrl = `https://xmoijbwuizxsgrpnidgg.supabase.co/storage/v1/object/public/${bucketName}/${key}`;
    return publicUrl;

  } catch (error) {
    console.error('Failed to upload screenshot to Supabase S3:', error);
    // Safe fallback to base64 inline data so screenshot capture never fails
    return base64Data;
  }
}
