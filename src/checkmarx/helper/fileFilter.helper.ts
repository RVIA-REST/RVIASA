

export const fileFilter = ( req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    if (!file) return callback(new Error('El archivo está vacío'), false);

    const name = file.originalname.split('.');
    const ext = name[name.length - 1];
    
    if (file && ext === 'csv' && file.mimetype === 'text/csv') {
        return callback(null, true);
    }
    
    callback(null, false);

}
