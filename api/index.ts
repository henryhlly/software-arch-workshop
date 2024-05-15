import express, { type Request, type Response, json } from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

const app = express();

const prisma = new PrismaClient();

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
    const { fullName, email } = req.body;
    if (!fullName || !email)
      return res.status(400).send('`fullName` and `email` are required fields');

    try {
      const application = await prisma.application.create({
        data: {
          fullName,
          email,
          resume: req.file!.path,
        },
      });
      return res.status(200).send(application);
    } catch (err) {
      return res.status(500).send('could not create application');
    }
  }
);

app.get('/apply', async (req: Request, res: Response) => {
  const applications = await prisma.application.findMany();
  return res.status(200).send(applications);
});

app.listen('3000');
