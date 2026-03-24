import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export const documentFileFilter = (req: any, file: any, callback: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
    return callback(new BadRequestException('Only PDF, JPG, and PNG files are allowed!'), false);
  }
  callback(null, true);
};

export const documentUploadLimit = {
  fileSize: 5 * 1024 * 1024, // 5MB
};

export const editFileName = (req: any, file: any, callback: any) => {
  const name = file.originalname.split('.')[0];
  const fileExtName = extname(file.originalname);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  callback(null, `${name}-${randomName}${fileExtName}`);
};
