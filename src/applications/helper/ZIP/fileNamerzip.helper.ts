import { v4 as uuid } from 'uuid'

export const fileNamerZip = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    if ( !file ) return callback( new Error('File is empty'), false );

    const fileExtension = file.mimetype.split('/')[1];
    const folderName = file.originalname.split('.')[0].replace(/\s+/g, '-');
  
    const fileName = `${ uuid() }.${ folderName }.${file.originalname.split('.')[1]}`; 

    callback(null, fileName );
}
