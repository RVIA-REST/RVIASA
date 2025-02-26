

export const fileFilterZip = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    if (!file) return callback(new Error('File is empty'), false);

    const name = file.originalname.split('.');
    const ext = name[name.length - 1];

    const validExtensions7z = ['application/octet-stream','application/x-compressed'];

    if(file && ext === '7z' && validExtensions7z.includes(file.mimetype)){
        file.mimetype = 'application/x-7z-compressed';
    }

    const fileExtension = file.mimetype.split('/')[1];    
    const validExtensions = ['zip', 'x-zip-compressed', 'pdf', 'x-7z-compressed'];
  
   
    if (validExtensions.includes(fileExtension)) {
        return callback(null, true);
    }

    callback(null, false);
}
