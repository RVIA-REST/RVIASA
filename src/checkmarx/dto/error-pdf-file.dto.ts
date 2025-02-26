

class ErrorDetailPDFFile {
    code: number;
      killed: boolean;
      signal: string | null;
      cmd: string;
      stdout: string;
      stderr: string;
  
}

export class ErrorPDFFile {
    message: string;
      error: ErrorDetailPDFFile;
      isValid: boolean;
  }