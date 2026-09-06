import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
 * Uploads a WebP base64 image to Supabase S3 Cloud Storage bucket.
 * Returns the S3 URI (e.g. "s3://3-Eyed-Raven/screenshots/sc-xxx.webp").
 */
export async function uploadScreenshotToS3(base64Data, filename) {
  try {
    const client = getS3Client();
    if (!client) {
      console.warn('S3 client credentials missing, falling back to inline data');
      return base64Data;
    }

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

    // Return S3 URI scheme for internal storage
    return `s3://${bucketName}/${key}`;

  } catch (error) {
    console.error('Failed to upload screenshot to Supabase S3:', error);
    // Safe fallback to base64 inline data so screenshot capture never fails
    return base64Data;
  }
}

/**
 * Resolves a stored image reference (s3:// URI, public URL, or base64 data URL)
 * into a browser-renderable HTTP URL (presigned S3 URL or data URL).
 */
export async function resolveScreenshotUrl(imageData) {
  if (!imageData) return null;

  // Inline Data URL (mock/demo/fallback)
  if (imageData.startsWith('data:image/')) {
    return imageData;
  }

  try {
    const client = getS3Client();
    let key = '';

    if (imageData.startsWith('s3://')) {
      const match = imageData.match(/^s3:\/\/[^\/]+\/(.+)$/);
      if (match) key = match[1];
    } else if (imageData.includes('/screenshots/')) {
      const parts = imageData.split('/screenshots/');
      if (parts[1]) key = `screenshots/${parts[1].split('?')[0]}`;
    }

    if (key && client) {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      // Generate 1-hour presigned GET URL for secure browser rendering
      return await getSignedUrl(client, command, { expiresIn: 3600 });
    }
  } catch (err) {
    console.error('Error resolving presigned URL for image:', err);
  }

  return imageData;
}
