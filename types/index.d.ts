declare module "audio-wav" {
    export = AudioWAV;
    class AudioWAV {
        static fromFile(data: Buffer): AudioWAV;
        static fromBuffer(buffer: any): AudioWAV;
        static decodeHeader(chunk: string | Buffer): object;
        static encodeHeader(data: {
            riff: string;
            size: number;
            format: string;
        }): Buffer;
        static decodeFMT(chunk: string | Buffer): object;
        static encodeFMT(data?: {
            audioFormat: number;
            channels: number;
            sampleRate: number;
            byteRate: number;
            blockAlign: number;
            bitsPerSample: number;
            extraParamSiz: number;
            extraParams: number;
        }): Buffer;
        static decodeLIST(chunk: string | Buffer): object;
        static decodeLISTINFO(list: any): object;
        static decodeLISTadtl(list: any): object;
        static decodeDATA(chunk: string | Buffer): void;
        static decodeRLND(chunk: string | Buffer): object;
        static encodeRLND(data: {
            device: string;
            unknown1: number;
            unknown2: number;
            unknown3: number;
            unknown4: number;
            sampleIndex: number | string;
        }): Buffer;
        static decodeJUNK(chunk: string | Buffer): void;
        static decodeBEXT(chunk: string | Buffer): object;
        static decodeCue(chunk: string | Buffer): object;
        static decodeResU(chunk: string | Buffer): object;
        static decodeDS64(chunk: string | Buffer): object;
        constructor(list: any, overrides?: {
            size: number;
        });
        chunks: any[];
        parse(): void;
        decodeChunk(): string;
    }
}
declare module "index" {
    export { AudioWAV };
    import AudioWAV = require("audio-wav");
}
