import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CommonService implements OnModuleInit {
  private readonly algorithm = 'aes-256-cbc';
  private key: Buffer;
  private readonly oldKey?: Buffer;
  private readonly newKey?: Buffer;

  constructor(private configService: ConfigService, private dataSource: DataSource) {
    const secretKey = this.configService.get<string>('SECRET_KEY', '');
    const oldSecretKey = this.configService.get<string>('OLD_SECRET_KEY');
    const newSecretKey = this.configService.get<string>('NEW_SECRET_KEY');

    this.key = createHash('sha256').update(secretKey).digest().slice(0, 32);
    this.oldKey = oldSecretKey ? createHash('sha256').update(oldSecretKey).digest().slice(0, 32) : undefined;
    this.newKey = newSecretKey ? createHash('sha256').update(newSecretKey).digest().slice(0, 32) : undefined;
  }

  async onModuleInit() {

    if (this.oldKey && this.newKey && this.key.toString('hex') !== this.newKey.toString('hex')) {
      this.key = this.oldKey;
      await this.reEncryptAllEntities();
      this.key = this.newKey;
      this.updateEnvVariable('SECRET_KEY', this.configService.get<string>('NEW_SECRET_KEY', ''));
    }
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  encryptNewKey(text: string, key: Buffer): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decryptWithKey(encryptedText: string, key: Buffer): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  decrypt(encryptedText: string): string {
    return this.decryptWithKey(encryptedText, this.key);
  }

  async reEncryptAllEntities(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      const records = await repository.find();

      for (const record of records) {
        let updated = false;
        for (const column of entity.columns) {
          const columnName = column.propertyName;
          const columnValue = record[columnName];
          if (typeof columnValue === 'string' && columnValue.includes(':')) {
            const decryptedData = this.decryptWithKey(columnValue, this.oldKey);
            if (decryptedData !== columnValue) {
              const reEncryptedData = this.encryptNewKey(decryptedData, this.newKey);
              record[columnName] = reEncryptedData;
              updated = true;
            }
          }
        }
        if (updated) {
          await repository.save(record);
        }
      }
    }
  }

  private updateEnvVariable(key: string, value: string) {
    const envPaths = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), 'config', '.env'),
      path.join(__dirname, '../../.env'),
    ];

    const envPath = envPaths.find((filePath) => fs.existsSync(filePath));

    if (!envPath) {
      // console.warn('⚠️ No se encontró el archivo .env para actualizar.');
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf-8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
    fs.writeFileSync(envPath, envContent);
    // console.log(`✅ Se actualizó ${key} en: ${envPath}`);
  }
}
