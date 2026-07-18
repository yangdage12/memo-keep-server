import { S3Storage } from "coze-coding-dev-sdk";
import { readFileSync } from "fs";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

async function main() {
  const fileContent = readFileSync("/tmp/memokeep-full.tar.gz");
  const key = await storage.uploadFile({
    fileContent,
    fileName: "memokeep-full.tar.gz",
    contentType: "application/gzip",
  });
  
  const url = await storage.generatePresignedUrl({
    key,
    expireTime: 86400,
  });
  
  console.log("Download URL:", url);
}

main().catch(console.error);
