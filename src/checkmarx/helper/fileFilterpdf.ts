
export const fileFilterPDF = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    if (!file) return callback(new Error('File is empty'), false);

    const name = file.originalname.split('.');

    const fileExtension = file.mimetype.split('/')[1];    
    const validExtensions = ['pdf'];
   
    if (validExtensions.includes(fileExtension)) {
        return callback(null, true);
    }

    callback(null, false);
}