import { existsSync, mkdirSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

interface StorageProvider {
	upload(key: string, buffer: Buffer, contentType?: string): Promise<void>;
	getUrl(key: string): string;
	getSignedUploadUrl(key: string, contentType?: string): Promise<string>;
	getBuffer(key: string): Promise<Buffer>;
	delete(key: string): Promise<void>;
}

class LocalStorage implements StorageProvider {
	private basePath: string;

	constructor(basePath: string) {
		this.basePath = basePath;
		if (!existsSync(basePath)) {
			mkdirSync(basePath, { recursive: true });
		}
	}

	async upload(key: string, buffer: Buffer): Promise<void> {
		const filePath = join(this.basePath, key);
		const dir = dirname(filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		await writeFile(filePath, buffer);
	}

	getUrl(key: string): string {
		return `${env.API_BASE_URL ?? `http://localhost:${env.PORT}`}/uploads/${key}`;
	}

	async getSignedUploadUrl(key: string): Promise<string> {
		// For local storage, return a direct upload URL
		return `${env.API_BASE_URL ?? `http://localhost:${env.PORT}`}/api/v1/upload/${key}`;
	}

	async getBuffer(key: string): Promise<Buffer> {
		const filePath = join(this.basePath, key);
		return Buffer.from(await readFile(filePath));
	}

	async delete(key: string): Promise<void> {
		const filePath = join(this.basePath, key);
		await unlink(filePath).catch(() => {});
	}
}

class S3Storage implements StorageProvider {
	private client: S3Client;
	private bucket: string;

	constructor() {
		this.bucket = env.S3_BUCKET!;
		this.client = new S3Client({
			region: env.S3_REGION ?? "us-east-1",
			...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
			credentials: {
				accessKeyId: env.S3_ACCESS_KEY_ID!,
				secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
			},
		});
	}

	async upload(key: string, buffer: Buffer, contentType?: string): Promise<void> {
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: buffer,
				ContentType: contentType ?? "application/octet-stream",
			}),
		);
	}

	getUrl(key: string): string {
		if (env.S3_ENDPOINT) {
			return `${env.S3_ENDPOINT}/${this.bucket}/${key}`;
		}
		return `https://${this.bucket}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
	}

	async getSignedUploadUrl(key: string, contentType?: string): Promise<string> {
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			ContentType: contentType ?? "application/octet-stream",
		});
		return getSignedUrl(this.client, command, { expiresIn: 3600 });
	}

	async getBuffer(key: string): Promise<Buffer> {
		const response = await this.client.send(
			new GetObjectCommand({
				Bucket: this.bucket,
				Key: key,
			}),
		);
		const bytes = await response.Body!.transformToByteArray();
		return Buffer.from(bytes);
	}

	async delete(key: string): Promise<void> {
		await this.client.send(
			new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: key,
			}),
		);
	}
}

export const storage: StorageProvider =
	env.STORAGE_PROVIDER === "s3" ? new S3Storage() : new LocalStorage(env.LOCAL_STORAGE_PATH);
