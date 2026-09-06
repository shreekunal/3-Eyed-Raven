import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) envVars[k.trim()] = v.trim();
});

const s3Endpoint = envVars.S3_ENDPOINT;
const accessKeyId = envVars.S3_ACCESS_KEY_ID;
const secretAccessKey = envVars.S3_SECRET_ACCESS_KEY;
const bucketName = envVars.S3_BUCKET;
const region = envVars.S3_REGION;

const s3Client = new S3Client({
  region,
  endpoint: s3Endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

async function testPresigned() {
  const key = 'screenshots/sc-df25a298-71ce-4f70-836a-692c22770c82.webp';
  console.log('Generating presigned GET URL for key:', key);

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('✅ Presigned URL Generated Successfully!');
    console.log('🔗 URL:', presignedUrl);
  } catch (err) {
    console.error('❌ Failed:', err);
  }
}

testPresigned();
