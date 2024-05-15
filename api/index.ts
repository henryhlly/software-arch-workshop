import express, { type Request, type Response, json } from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import {
  CreateBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import fs from 'fs';

const app = express();

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename: (req, file, cb) =>
    cb(
      null,
      `${file.fieldname}-${Date.now()}.${file.originalname.split('.').pop()}`
    ),
});
const upload = multer({ storage });

app.use(cors());
app.use(json());
app.use('/uploads', express.static('./uploads'));

app.post(
  '/apply',
  upload.single('resume'),
  async (req: Request, res: Response) => {
    const file = req.file;
    const { fullName, email } = req.body;
    if (!fullName || !email || !file)
      return res.status(400).send('`fullName` and `email` are required fields');

    const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: file.filename,
      Body: fileStream,
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));

      const resume = `${process.env.AWS_ENDPOINT_URL_S3}/${process.env.BUCKET_NAME}/${file.filename}`;

      const application = await prisma.application.create({
        data: {
          fullName,
          email,
          resume,
        },
      });
      return res.status(200).send(application);
    } catch (err) {
      console.error(err);
      return res.status(500).send('could not create application');
    }
  }
);

app.get('/apply', async (req: Request, res: Response) => {
  const applications = await prisma.application.findMany();
  return res.status(200).send(applications);
});

app.listen('3000');
