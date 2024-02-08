import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const s3Commands = {
  addObject: (key, buffer) => {
    const putCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      Body: buffer,
    });

    return s3Client.send(putCommand);
  },
  deleteObject: (key) => {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
    });
    return s3Client.send(deleteCommand);
  },
  getObjectUrl: (key) => {
    // https://[BUCKET].s3.[REGION].amazonaws.com/[KEY]
    return `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  },
};
