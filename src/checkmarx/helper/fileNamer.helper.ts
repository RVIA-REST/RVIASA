import { v4 as uuid } from 'uuid'

export const fileNamer = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    if ( !file ) return callback( new Error('El archivo está vacío'), false );

    const fileExtension = file.mimetype.split('/')[1];
    const folderName = file.originalname.split('.')[0];
    const fileName = `${ uuid() }.${ folderName }.${fileExtension}`; 

    callback(null, fileName );
}
