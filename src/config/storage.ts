import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer, { StorageEngine } from 'multer'
import cloudinary from './cloudinary'
import { Request } from 'express'

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => ({
    folder: 'TripTix',
    allowed_format: ['jpg', 'jpeg', 'png'],
    public_id: file.originalname.split('.')[0],
  }),
} as ConstructorParameters<typeof CloudinaryStorage>[0])

const upload = multer({ storage: storage as unknown as StorageEngine })

export const uploadMultiple = upload.array('buses', 5)
export const uploadSingle = upload.single('profile')

