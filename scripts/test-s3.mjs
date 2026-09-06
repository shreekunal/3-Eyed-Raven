import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) envVars[k.trim()] = v.trim();
});

const s3Endpoint = envVars.S3_ENDPOINT || 'https://xmoijbwuizxsgrpnidgg.storage.supabase.co/storage/v1/s3';
const accessKeyId = envVars.S3_ACCESS_KEY_ID || '0168e890d6b143fe6deb64109ebbfce2';
const secretAccessKey = envVars.S3_SECRET_ACCESS_KEY || 'ecbf20cc0659c5e171bc48cbe0ac3cebdfc809dca621dd0a9816ca414053ef52';
const bucketName = envVars.S3_BUCKET || 'microcrm';
const region = envVars.S3_REGION || 'us-east-1';

console.log('📍 S3 Endpoint:', s3Endpoint);
console.log('📍 Bucket Name:', bucketName);

const s3Client = new S3Client({
  region,
  endpoint: s3Endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

async function uploadTestImage() {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
    <rect width="600" height="300" fill="#0f172a"/>
    <rect x="20" y="20" width="560" height="260" rx="12" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
    <circle cx="60" cy="60" r="16" fill="#3b82f6"/>
    <text x="90" y="66" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="bold">3-Eyed Raven — Supabase S3 Test</text>
    <text x="90" y="100" fill="#94a3b8" font-family="sans-serif" font-size="14">Bucket: microcrm | Region: us-east-1</text>
    <rect x="60" y="130" width="480" height="110" rx="8" fill="#0f172a"/>
    <text x="80" y="170" fill="#10b981" font-family="monospace" font-size="14">✓ Supabase S3 Cloud Storage Connected</text>
    <text x="80" y="200" fill="#cbd5e1" font-family="monospace" font-size="12">Uploaded at: ${new Date().toISOString()}</text>
  </svg>`;

  const buffer = Buffer.from(svgContent);
  const filename = `test-upload-${Date.now()}.svg`;
  const key = `screenshots/${filename}`;

  console.log(`\n⏳ Uploading ${key} to Supabase S3 bucket "${bucketName}"...`);

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/svg+xml',
    });

    await s3Client.send(command);

    const publicUrl = `https://xmoijbwuizxsgrpnidgg.supabase.co/storage/v1/object/public/${bucketName}/${key}`;
    console.log('✅ Upload Successful!');
    console.log('🔗 File Key    :', key);
    console.log('🔗 Public URL  :', publicUrl);

  } catch (err) {
    console.error('❌ Upload Failed:', err);
  }
}

uploadTestImage();
