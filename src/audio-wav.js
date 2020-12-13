/* eslint-disable no-bitwise */
const debug = require('debug')('Uttori.Utility.AudioWAV');
const zlib = require('zlib');
const { DataBuffer, DataBufferList, DataStream } = require('@uttori/data-tools');

/**
 * AudioWAV - WAVE Audio Utility
 *
 * The WAVE file format is a subset of Microsoft's RIFF specification for the storage of multimedia files.
 *
 * @example <caption>AudioWAV</caption>
 * const data = fs.readFileSync('./audio.wav');
 * const file = AudioWAV.fromFile(data);
 * console.log('Chunks:', file.chunks);
 * @class
 */
class AudioWAV extends DataStream {
  /**
   * Creates a new AudioWAV.
   *
   * @param {DataBufferList} list - The DataBufferList of the audio file to process.
   * @param {object} [overrides] - Options for this instance.
   * @param {number} [overrides.size=16] - ArrayBuffer byteLength for the underlying binary parsing.
   * @class
   */
  constructor(list, overrides) {
    const options = {
      size: 16,
      ...overrides,
    };
    super(list, options);

    this.chunks = [];

    this.parse();
  }

  /**
   * Creates a new AudioWAV from file data.
   *
   * @param {Buffer} data - The data of the image to process.
   * @returns {AudioWAV} the new AudioWAV instance for the provided file data
   * @static
   */
  static fromFile(data) {
    debug('fromFile:', data.length);
    const buffer = new DataBuffer(data);
    const list = new DataBufferList();
    list.append(buffer);
    return new AudioWAV(list, { size: data.length });
  }

  /**
   * Creates a new AudioWAV from a DataBuffer.
   *
   * @param {DataBuffer} buffer - The DataBuffer of the image to process.
   * @returns {AudioWAV} the new AudioWAV instance for the provided DataBuffer
   * @static
   */
  static fromBuffer(buffer) {
    debug('fromBuffer:', buffer.length);
    const list = new DataBufferList();
    list.append(buffer);
    return new AudioWAV(list, { size: buffer.length });
  }

  /**
   * Parse the WAV file, decoding the supported chunks.
   */
  parse() {
    debug('parse');
    const chunk = this.read(12, true);
    const value = AudioWAV.decodeHeader(chunk);
    this.chunks.push({ type: 'header', value });

    while (this.remainingBytes()) {
      this.decodeChunk();
    }
  }

  /**
   * Decodes and validates WAV Header.
   *
   * Signature (Decimal): [82, 73, 70, 70, ..., ..., ..., ..., 87, 65, 86, 69]
   * Signature (Hexadecimal): [52, 49, 46, 46, ..., ..., ..., ..., 57, 41, 56, 45]
   * Signature (ASCII): [R, I, F, F, ..., ..., ..., ..., W, A, V, E]
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @static
   * @throws {Error} Invalid WAV header, expected 'WAVE'
   */
  static decodeHeader(chunk) {
    debug('decodeHeader');
    const header = DataStream.fromData(chunk);

    // Contains the letters `RIFF`, `RF64`, or `BW64` in ASCII form.
    const chunkID = header.readString(4);
    if (!['RIFF', 'RF64', 'BW64'].includes(chunkID)) {
      throw new Error(`Invalid WAV header, expected 'RIFF' and got '${chunkID}'`);
    }

    // This is the size of the rest of the chunk following this number.
    // This is the size of the entire file in bytes minus 8 bytes for the 2 fields not included in this count: ChunkID and ChunkSize.
    // RF64 sets this to -1 = 0xFFFFFFFF as it doesn't use this to support larger sizes in the DS64 chunk.
    const size = header.readUInt32(true);

    // Contains the letters `WAVE` in ASCII form
    const format = header.readString(4);
    if (format !== 'WAVE') {
      throw new Error(`Invalid WAV header, expected 'WAVE' and got '${format}'`);
    }

    const value = {
      chunkID,
      size,
      format,
    };

    return value;
  }

  /**
   * Enocdes JSON values to a valid Wave Header chunk Buffer.
   *
   * @param {object} data - The values to encode to the header chunk chunk.
   * @param {string} [data.riff='RIFF'] - RIFF Header, should contains the string `RIFF`, `RF64`, or `BW64` in ASCII form.
   * @param {number} data.size - This is the size of the entire file in bytes minus 8 bytes for the 2 fields not included in this count. RF64 sets this to -1 = 0xFFFFFFFF as it doesn't use this to support larger sizes in the DS64 chunk.
   * @param {string} [data.format='WAVE'] - Contains the string `WAVE` in ASCII form
   * @returns {Buffer} - The newley encoded `fmt ` chunk.
   * @static
   */
  static encodeHeader(data) {
    debug('encodeHeader:', data);
    const {
      riff = 'RIFF',
      size,
      format = 'WAVE',
    } = data;

    const header = Buffer.alloc(12);
    header.write(riff, 0);
    header.writeUInt32LE(size, 4);
    header.write(format, 8);

    return header;
  }

  /**
   * Decodes the chunk type, and attempts to parse that chunk if supported.
   * Supported Chunk Types: IHDR, PLTE, IDAT, IEND, tRNS, pHYs
   *
   * Chunk Structure:
   * Length: 4 bytes
   * Type:   4 bytes (IHDR, PLTE, IDAT, IEND, etc.)
   * Chunk:  {length} bytes
   * CRC:    4 bytes
   *
   * @returns {string} Chunk Type
   * @throws {Error} Invalid Chunk Length when less than 0
   * @see {@link http://www.w3.org/TR/2003/REC-PNG-20031110/#5Chunk-layout|Chunk Layout}
   */
  decodeChunk() {
    debug('decodeChunk');
    const type = this.readString(4);
    let size = this.readUInt32(true);

    /* istanbul ignore next */
    if (size < 0) {
      throw new Error(`Invalid SubChunk Size: ${0xFFFFFFFF & size}`);
    }

    switch (type) {
      case 'fmt ': {
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        const value = AudioWAV.decodeFMT(chunk);
        this.chunks.push({ type: 'format', value, chunk });
        break;
      }
      case 'data': {
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        AudioWAV.decodeDATA(chunk);
        this.chunks.push({ type: 'data', chunk });
        break;
      }
      case 'LIST': {
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        const value = AudioWAV.decodeLIST(chunk);
        this.chunks.push({ type: 'list', value, chunk });
        break;
      }
      case 'RLND': {
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        const value = AudioWAV.decodeRLND(chunk);
        this.chunks.push({ type: 'roland', value, chunk });
        break;
      }
      case 'JUNK': {
        // Size should be even.
        if (size % 2 !== 0) {
          size += 1;
        }
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        AudioWAV.decodeJUNK(chunk);
        this.chunks.push({ type: 'junk', chunk });
        break;
      }
      case 'cue ': {
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        const value = AudioWAV.decodeCue(chunk);
        this.chunks.push({ type: 'cue_points', value, chunk });
        break;
      }
      case 'bext': {
        // Size should be even.
        /* istanbul ignore next */
        if (size % 2 !== 0) {
          size += 1;
        }
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        const value = AudioWAV.decodeBEXT(chunk);
        this.chunks.push({ type: 'broadcast_extension', value, chunk });
        break;
      }
      case 'ResU': {
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        const value = AudioWAV.decodeResU(chunk);
        this.chunks.push({ type: 'logic_resu', value, chunk });
        break;
      }
      case 'ds64': {
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        const value = AudioWAV.decodeDS64(chunk);
        this.chunks.push({ type: 'data_size_64', value, chunk });
        break;
      }
      default: {
        debug(`Unsupported Chunk: '${type}' with ${size} bytes`);
        this.rewind(8);
        const chunk = this.read(8 + size, true);
        this.chunks.push({ type, chunk });
        break;
      }
    }

    return type;
  }

  /**
   * Decode the FMT (Format) chunk.
   * Should be the first chunk in the data stream.
   *
   * Audio Format:       2 bytes
   * Channels:           2 bytes
   * Sample Rate:        4 bytes
   * Byte Rate:          4 bytes
   * Block Align:        2 bytes
   * Bits per Sample     2 bytes
   * [Extra Param Size]  2 bytes
   * [Extra Params]      n bytes
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @static
   */
  static decodeFMT(chunk) {
    debug('decodeFMT');
    const format = DataStream.fromData(chunk);
    const chunkID = format.readString(4);
    const size = format.readUInt32(true);

    // Values other than 1 indicate some form of compression.
    const audioFormatValue = format.readUInt16(true);
    let audioFormat = '';
    /* istanbul ignore next */
    switch (audioFormatValue) {
      case 0x0000:
        audioFormat = 'Unknown: 0';
        break;
      case 0x0001:
        audioFormat = 'Microsoft Pulse Code Modulation (PCM) / Uncompressed';
        break;
      case 0x0002:
        audioFormat = 'Microsoft ADPCM';
        break;
      case 0x0003:
        audioFormat = 'Microsoft IEEE Float LPCM';
        break;
      case 0x0004:
        audioFormat = 'Compaq VSELP';
        break;
      case 0x0005:
        audioFormat = 'IBM CVSD';
        break;
      case 0x0006:
        audioFormat = 'Microsoft ITU G.711 a-law';
        break;
      case 0x0007:
        audioFormat = 'Microsoft ITU G.711 µ-law';
        break;
      case 0x0008:
        audioFormat = 'Microsoft DTS';
        break;
      case 0x0009:
        audioFormat = 'DRM';
        break;
      case 0x000A:
        audioFormat = 'WMA 9 Speech';
        break;
      case 0x000B:
        audioFormat = 'Microsoft Windows Media RT Voice';
        break;
      case 0x0010:
        audioFormat = 'OKI-ADPCM';
        break;
      case 0x0011:
        audioFormat = 'Intel IMA / DVI-ADPCM';
        break;
      case 0x0012:
        audioFormat = 'Videologic Mediaspace ADPCM';
        break;
      case 0x0013:
        audioFormat = 'Sierra ADPCM';
        break;
      case 0x0014:
        audioFormat = 'Antex G.723 ADPCM';
        break;
      case 0x0015:
        audioFormat = 'DSP Solutions DIGISTD';
        break;
      case 0x0016:
        audioFormat = 'DSP Solutions DIGIFIX / ITU G.723 ADPCM (Yamaha)';
        break;
      case 0x0017:
        audioFormat = 'Dialoic OKI ADPCM';
        break;
      case 0x0018:
        audioFormat = 'Media Vision ADPCM';
        break;
      case 0x0019:
        audioFormat = 'HP CU';
        break;
      case 0x001A:
        audioFormat = 'HP Dynamic Voice';
        break;
      case 0x0020:
        audioFormat = 'Yamaha ADPCM';
        break;
      case 0x0021:
        audioFormat = 'SONARC Speech Compression';
        break;
      case 0x0022:
        audioFormat = 'DSP Group True Speech';
        break;
      case 0x0023:
        audioFormat = 'Echo Speech Corp.';
        break;
      case 0x0024:
        audioFormat = 'Virtual Music Audiofile AF36';
        break;
      case 0x0025:
        audioFormat = 'Audio Processing Tech.';
        break;
      case 0x0026:
        audioFormat = 'Virtual Music Audiofile AF10';
        break;
      case 0x0027:
        audioFormat = 'Aculab Prosody 1612';
        break;
      case 0x0028:
        audioFormat = 'Merging Tech. LRC';
        break;
      case 0x0030:
        audioFormat = 'Dolby AC2';
        break;
      case 0x0031:
        audioFormat = 'Microsoft 6.10';
        break;
      case 0x0032:
        audioFormat = 'MSN Audio';
        break;
      case 0x0033:
        audioFormat = 'Antex ADPCME';
        break;
      case 0x0034:
        audioFormat = 'Control Resources VQLPC';
        break;
      case 0x0035:
        audioFormat = 'DSP Solutions DIGIREAL';
        break;
      case 0x0036:
        audioFormat = 'DSP Solutions DIGIADPCM';
        break;
      case 0x0037:
        audioFormat = 'Control Resources CR10';
        break;
      case 0x0038:
        audioFormat = 'Natural MicroSystems VBX ADPCM';
        break;
      case 0x0039:
        audioFormat = 'Crystal Semiconductor IMA ADPCM';
        break;
      case 0x003A:
        audioFormat = 'Echo Speech ECHOSC3';
        break;
      case 0x003B:
        audioFormat = 'Rockwell ADPCM';
        break;
      case 0x003C:
        audioFormat = 'Rockwell DIGITALK';
        break;
      case 0x003D:
        audioFormat = 'Xebec Multimedia';
        break;
      case 0x0040:
        audioFormat = 'Antex ITU G.721 ADPCM';
        break;
      case 0x0041:
        audioFormat = 'Antex G.728 CELP';
        break;
      case 0x0042:
        audioFormat = 'Microsoft MSG723';
        break;
      case 0x0043:
        audioFormat = 'IBM AVC ADPCM';
        break;
      case 0x0045:
        audioFormat = 'ITU-T G.726';
        break;
      case 0x0050:
        audioFormat = 'Microsoft MPEG';
        break;
      case 0x0051:
        audioFormat = 'RT23 or PAC';
        break;
      case 0x0052:
        audioFormat = 'InSoft RT24';
        break;
      case 0x0053:
        audioFormat = 'InSoft PAC';
        break;
      case 0x0055:
        audioFormat = 'MP3';
        break;
      case 0x0059:
        audioFormat = 'Cirrus';
        break;
      case 0x0060:
        audioFormat = 'Cirrus Logic';
        break;
      case 0x0061:
        audioFormat = 'ESS Tech. PCM';
        break;
      case 0x0062:
        audioFormat = 'Voxware Inc.';
        break;
      case 0x0063:
        audioFormat = 'Canopus ATRAC';
        break;
      case 0x0064:
        audioFormat = 'APICOM G.726 ADPCM';
        break;
      case 0x0065:
        audioFormat = 'APICOM G.722 ADPCM';
        break;
      case 0x0066:
        audioFormat = 'Microsoft DSAT';
        break;
      case 0x0067:
        audioFormat = 'Microsoft DSAT DISPLAY';
        break;
      case 0x0069:
        audioFormat = 'Voxware Byte Aligned';
        break;
      case 0x0070:
        audioFormat = 'Voxware AC8';
        break;
      case 0x0071:
        audioFormat = 'Voxware AC10';
        break;
      case 0x0072:
        audioFormat = 'Voxware AC16';
        break;
      case 0x0073:
        audioFormat = 'Voxware AC20';
        break;
      case 0x0074:
        audioFormat = 'Voxware MetaVoice';
        break;
      case 0x0075:
        audioFormat = 'Voxware MetaSound';
        break;
      case 0x0076:
        audioFormat = 'Voxware RT29HW';
        break;
      case 0x0077:
        audioFormat = 'Voxware VR12';
        break;
      case 0x0078:
        audioFormat = 'Voxware VR18';
        break;
      case 0x0079:
        audioFormat = 'Voxware TQ40';
        break;
      case 0x007A:
        audioFormat = 'Voxware SC3';
        break;
      case 0x007B:
        audioFormat = 'Voxware SC3';
        break;
      case 0x0080:
        audioFormat = 'Soundsoft';
        break;
      case 0x0081:
        audioFormat = 'Voxware TQ60';
        break;
      case 0x0082:
        audioFormat = 'Microsoft MSRT24';
        break;
      case 0x0083:
        audioFormat = 'AT&T G.729A';
        break;
      case 0x0084:
        audioFormat = 'Motion Pixels MVI MV12';
        break;
      case 0x0085:
        audioFormat = 'DataFusion G.726';
        break;
      case 0x0086:
        audioFormat = 'DataFusion GSM610';
        break;
      case 0x0088:
        audioFormat = 'Iterated Systems Audio';
        break;
      case 0x0089:
        audioFormat = 'Onlive';
        break;
      case 0x008A:
        audioFormat = 'Multitude, Inc. FT SX20';
        break;
      case 0x008B:
        audioFormat = 'Infocom ITS A/S G.721 ADPCM';
        break;
      case 0x008C:
        audioFormat = 'Convedia G729';
        break;
      case 0x008D:
        audioFormat = 'Not specified congruency, Inc.';
        break;
      case 0x0091:
        audioFormat = 'Siemens SBC24';
        break;
      case 0x0092:
        audioFormat = 'Sonic Foundry Dolby AC3 APDIF';
        break;
      case 0x0093:
        audioFormat = 'MediaSonic G.723';
        break;
      case 0x0094:
        audioFormat = 'Aculab Prosody 8kbps';
        break;
      case 0x0097:
        audioFormat = 'ZyXEL ADPCM';
        break;
      case 0x0098:
        audioFormat = 'Philips LPCBB';
        break;
      case 0x0099:
        audioFormat = 'Studer Professional Audio Packed';
        break;
      case 0x00A0:
        audioFormat = 'Malden PhonyTalk';
        break;
      case 0x00A1:
        audioFormat = 'Racal Recorder GSM';
        break;
      case 0x00A2:
        audioFormat = 'Racal Recorder G720.a';
        break;
      case 0x00A3:
        audioFormat = 'Racal G723.1';
        break;
      case 0x00A4:
        audioFormat = 'Racal Tetra ACELP';
        break;
      case 0x00B0:
        audioFormat = 'NEC AAC NEC Corporation';
        break;
      case 0x00FF:
        audioFormat = 'AAC';
        break;
      case 0x0100:
        audioFormat = 'Rhetorex ADPCM';
        break;
      case 0x0101:
        audioFormat = 'IBM u-Law';
        break;
      case 0x0102:
        audioFormat = 'IBM a-Law';
        break;
      case 0x0103:
        audioFormat = 'IBM ADPCM';
        break;
      case 0x0111:
        audioFormat = 'Vivo G.723';
        break;
      case 0x0112:
        audioFormat = 'Vivo Siren';
        break;
      case 0x0120:
        audioFormat = 'Philips Speech Processing CELP';
        break;
      case 0x0121:
        audioFormat = 'Philips Speech Processing GRUNDIG';
        break;
      case 0x0123:
        audioFormat = 'Digital G.723';
        break;
      case 0x0125:
        audioFormat = 'Sanyo LD ADPCM';
        break;
      case 0x0130:
        audioFormat = 'Sipro Lab ACEPLNET';
        break;
      case 0x0131:
        audioFormat = 'Sipro Lab ACELP4800';
        break;
      case 0x0132:
        audioFormat = 'Sipro Lab ACELP8V3';
        break;
      case 0x0133:
        audioFormat = 'Sipro Lab G.729';
        break;
      case 0x0134:
        audioFormat = 'Sipro Lab G.729A';
        break;
      case 0x0135:
        audioFormat = 'Sipro Lab Kelvin';
        break;
      case 0x0136:
        audioFormat = 'VoiceAge AMR';
        break;
      case 0x0140:
        audioFormat = 'Dictaphone G.726 ADPCM';
        break;
      case 0x0150:
        audioFormat = 'Qualcomm PureVoice';
        break;
      case 0x0151:
        audioFormat = 'Qualcomm HalfRate';
        break;
      case 0x0155:
        audioFormat = 'Ring Zero Systems TUBGSM';
        break;
      case 0x0160:
        audioFormat = 'Microsoft Audio1';
        break;
      case 0x0161:
        audioFormat = 'Windows Media Audio V2 V7 V8 V9 / DivX audio (WMA) / Alex AC3 Audio';
        break;
      case 0x0162:
        audioFormat = 'Windows Media Audio Professional V9';
        break;
      case 0x0163:
        audioFormat = 'Windows Media Audio Lossless V9';
        break;
      case 0x0164:
        audioFormat = 'WMA Pro over S/PDIF';
        break;
      case 0x0170:
        audioFormat = 'UNISYS NAP ADPCM';
        break;
      case 0x0171:
        audioFormat = 'UNISYS NAP ULAW';
        break;
      case 0x0172:
        audioFormat = 'UNISYS NAP ALAW';
        break;
      case 0x0173:
        audioFormat = 'UNISYS NAP 16K';
        break;
      case 0x0174:
        audioFormat = 'MM SYCOM ACM SYC008 SyCom Technologies';
        break;
      case 0x0175:
        audioFormat = 'MM SYCOM ACM SYC701 G726L SyCom Technologies';
        break;
      case 0x0176:
        audioFormat = 'MM SYCOM ACM SYC701 CELP54 SyCom Technologies';
        break;
      case 0x0177:
        audioFormat = 'MM SYCOM ACM SYC701 CELP68 SyCom Technologies';
        break;
      case 0x0178:
        audioFormat = 'Knowledge Adventure ADPCM';
        break;
      case 0x0180:
        audioFormat = 'Fraunhofer IIS MPEG2AAC';
        break;
      case 0x0190:
        audioFormat = 'Digital Theater Systems DTS DS';
        break;
      case 0x0200:
        audioFormat = 'Creative Labs ADPCM';
        break;
      case 0x0202:
        audioFormat = 'Creative Labs FASTSPEECH8';
        break;
      case 0x0203:
        audioFormat = 'Creative Labs FASTSPEECH10';
        break;
      case 0x0210:
        audioFormat = 'UHER ADPCM';
        break;
      case 0x0215:
        audioFormat = 'Ulead DV ACM';
        break;
      case 0x0216:
        audioFormat = 'Ulead DV ACM';
        break;
      case 0x0220:
        audioFormat = 'Quarterdeck Corp.';
        break;
      case 0x0230:
        audioFormat = 'I-Link VC';
        break;
      case 0x0240:
        audioFormat = 'Aureal Semiconductor Raw Sport';
        break;
      case 0x0241:
        audioFormat = 'ESST AC3';
        break;
      case 0x0250:
        audioFormat = 'Interactive Products HSX';
        break;
      case 0x0251:
        audioFormat = 'Interactive Products RPELP';
        break;
      case 0x0260:
        audioFormat = 'Consistent CS2';
        break;
      case 0x0270:
        audioFormat = 'Sony SCX';
        break;
      case 0x0271:
        audioFormat = 'Sony SCY';
        break;
      case 0x0272:
        audioFormat = 'Sony ATRAC3';
        break;
      case 0x0273:
        audioFormat = 'Sony SPC';
        break;
      case 0x0280:
        audioFormat = 'TELUM Telum Inc.';
        break;
      case 0x0281:
        audioFormat = 'TELUMIA Telum Inc.';
        break;
      case 0x0285:
        audioFormat = 'Norcom Voice Systems ADPCM';
        break;
      case 0x0300:
        audioFormat = 'Fujitsu FM TOWNS SND';
        break;
      case 0x0301:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0302:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0303:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0304:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0305:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0306:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0307:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0308:
        audioFormat = 'Fujitsu (not specified)';
        break;
      case 0x0350:
        audioFormat = 'Micronas Semiconductors, Inc. Development';
        break;
      case 0x0351:
        audioFormat = 'Micronas Semiconductors, Inc. CELP833';
        break;
      case 0x0400:
        audioFormat = 'Brooktree Digital';
        break;
      case 0x0401:
        audioFormat = 'Intel Music Coder (IMC)';
        break;
      case 0x0402:
        audioFormat = 'Ligos Indeo Audio';
        break;
      case 0x0450:
        audioFormat = 'QDesign Music';
        break;
      case 0x0500:
        audioFormat = 'On2 VP7 On2 Technologies';
        break;
      case 0x0501:
        audioFormat = 'On2 VP6 On2 Technologies';
        break;
      case 0x0680:
        audioFormat = 'AT&T VME VMPCM';
        break;
      case 0x0681:
        audioFormat = 'AT&T TCP';
        break;
      case 0x0700:
        audioFormat = 'YMPEG Alpha (dummy for MPEG-2 compressor)';
        break;
      case 0x08AE:
        audioFormat = 'ClearJump LiteWave (lossless)';
        break;
      case 0x1000:
        audioFormat = 'Olivetti GSM';
        break;
      case 0x1001:
        audioFormat = 'Olivetti ADPCM';
        break;
      case 0x1002:
        audioFormat = 'Olivetti CELP';
        break;
      case 0x1003:
        audioFormat = 'Olivetti SBC';
        break;
      case 0x1004:
        audioFormat = 'Olivetti OPR';
        break;
      case 0x1100:
        audioFormat = 'Lernout & Hauspie';
        break;
      case 0x1101:
        audioFormat = 'Lernout & Hauspie CELP codec';
        break;
      case 0x1102:
        audioFormat = 'Lernout & Hauspie SBC codec';
        break;
      case 0x1103:
        audioFormat = 'Lernout & Hauspie SBC codec';
        break;
      case 0x1104:
        audioFormat = 'Lernout & Hauspie SBC codec';
        break;
      case 0x1400:
        audioFormat = 'Norris Comm. Inc.';
        break;
      case 0x1401:
        audioFormat = 'ISIAudio';
        break;
      case 0x1500:
        audioFormat = 'AT&T Soundspace Music Compression';
        break;
      case 0x181C:
        audioFormat = 'VoxWare RT24 speech codec';
        break;
      case 0x181E:
        audioFormat = 'Lucent elemedia AX24000P Music codec';
        break;
      case 0x1971:
        audioFormat = 'Sonic Foundry LOSSLESS';
        break;
      case 0x1979:
        audioFormat = 'Innings Telecom Inc. ADPCM';
        break;
      case 0x1C07:
        audioFormat = 'Lucent SX8300P speech codec';
        break;
      case 0x1C0C:
        audioFormat = 'Lucent SX5363S G.723 compliant codec';
        break;
      case 0x1F03:
        audioFormat = 'CUseeMe DigiTalk (ex-Rocwell)';
        break;
      case 0x1FC4:
        audioFormat = 'NCT Soft ALF2CD ACM';
        break;
      case 0x2000:
        audioFormat = 'FAST Multimedia DVM';
        break;
      case 0x2001:
        audioFormat = 'Dolby DTS (Digital Theater System)';
        break;
      case 0x2002:
        audioFormat = 'RealAudio 1 / 2 14.4';
        break;
      case 0x2003:
        audioFormat = 'RealAudio 1 / 2 28.8';
        break;
      case 0x2004:
        audioFormat = 'RealAudio G2 / 8 Cook (low bitrate)';
        break;
      case 0x2005:
        audioFormat = 'RealAudio 3 / 4 / 5 Music (DNET)';
        break;
      case 0x2006:
        audioFormat = 'RealAudio 10 AAC (RAAC)';
        break;
      case 0x2007:
        audioFormat = 'RealAudio 10 AAC+ (RACP)';
        break;
      case 0x2500:
        audioFormat = 'Reserved range to 0x2600 Microsoft';
        break;
      case 0x3313:
        audioFormat = 'makeAVIS (ffvfw fake AVI sound from AviSynth scripts)';
        break;
      case 0x4143:
        audioFormat = 'Divio MPEG-4 AAC audio';
        break;
      case 0x4201:
        audioFormat = 'Nokia adaptive multirate';
        break;
      case 0x4243:
        audioFormat = 'Divio G726 Divio, Inc.';
        break;
      case 0x434C:
        audioFormat = 'LEAD Speech';
        break;
      case 0x564C:
        audioFormat = 'LEAD Vorbis';
        break;
      case 0x5756:
        audioFormat = 'WavPack Audio';
        break;
      case 0x674F:
        audioFormat = 'Ogg Vorbis (mode 1)';
        break;
      case 0x6750:
        audioFormat = 'Ogg Vorbis (mode 2)';
        break;
      case 0x6751:
        audioFormat = 'Ogg Vorbis (mode 3)';
        break;
      case 0x676F:
        audioFormat = 'Ogg Vorbis (mode 1+)';
        break;
      case 0x6770:
        audioFormat = 'Ogg Vorbis (mode 2+)';
        break;
      case 0x6771:
        audioFormat = 'Ogg Vorbis (mode 3+)';
        break;
      case 0x7000:
        audioFormat = '3COM NBX 3Com Corporation';
        break;
      case 0x706D:
        audioFormat = 'FAAD AAC';
        break;
      case 0x7A21:
        audioFormat = 'GSM-AMR (CBR, no SID)';
        break;
      case 0x7A22:
        audioFormat = 'GSM-AMR (VBR, including SID)';
        break;
      case 0xA100:
        audioFormat = 'Comverse Infosys Ltd. G723 1';
        break;
      case 0xA101:
        audioFormat = 'Comverse Infosys Ltd. AVQSBC';
        break;
      case 0xA102:
        audioFormat = 'Comverse Infosys Ltd. OLDSBC';
        break;
      case 0xA103:
        audioFormat = 'Symbol Technologies G729A';
        break;
      case 0xA104:
        audioFormat = 'VoiceAge AMR WB VoiceAge Corporation';
        break;
      case 0xA105:
        audioFormat = 'Ingenient Technologies Inc. G726';
        break;
      case 0xA106:
        audioFormat = 'ISO/MPEG-4 advanced audio Coding';
        break;
      case 0xA107:
        audioFormat = 'Encore Software Ltd G726';
        break;
      case 0xA109:
        audioFormat = 'Speex ACM Codec xiph.org';
        break;
      case 0xDFAC:
        audioFormat = 'DebugMode SonicFoundry Vegas FrameServer ACM Codec';
        break;
      case 0xE708:
        audioFormat = 'Unknown -';
        break;
      case 0xF1AC:
        audioFormat = 'Free Lossless Audio Codec FLAC';
        break;
      case 0xFFFE:
        audioFormat = 'Extensible';
        break;
      case 0xFFFF:
        audioFormat = 'Development';
        break;
      default:
        audioFormat = `Unknown: ${this.audioFormat}`;
        break;
    }

    // Mono = 1, Stereo = 2, etc.
    const channels = format.readUInt16(true);

    // 8000, 44100, 96000, etc.
    const sampleRate = format.readUInt32(true);

    // Sample Rate * Channels * Bits per Sample / 8
    const byteRate = format.readUInt32(true);

    // Channels * Bits per Sample / 8
    // The number of bytes for one sample including all channels.
    const blockAlign = format.readUInt16(true);

    // 8 bits = 8, 16 bits = 16, etc.
    const bitsPerSample = format.readUInt16(true);

    const value = {
      chunkID,
      size,
      audioFormatValue,
      audioFormat,
      channels,
      sampleRate,
      byteRate,
      blockAlign,
      bitsPerSample,
    };

    // Not all formats contain these extra values.
    if (format.remainingBytes()) {
      value.extraParamSize = format.readUInt16(true);
      // RF64 specific fields
      /* istanbul ignore next */
      if (audioFormat === 0xFFFE) {
        // Valid bits per sample i.e. 8, 16, 20, 24
        value.validBitsPerSample = format.readUInt16(true);
        // Channel mask for channel allocation
        value.channelMask = format.readUInt32(true);

        switch (value.channelMask) {
          case 0x00000001: {
            value.channelMaskLabel = 'speaker_front_left';
            break;
          }
          case 0x00000002: {
            value.channelMaskLabel = 'speaker_front_right';
            break;
          }
          case 0x00000004: {
            value.channelMaskLabel = 'speaker_front_center';
            break;
          }
          case 0x00000008: {
            value.channelMaskLabel = 'speaker_low_frequency';
            break;
          }
          case 0x00000010: {
            value.channelMaskLabel = 'speaker_back_left';
            break;
          }
          case 0x00000020: {
            value.channelMaskLabel = 'speaker_back_right';
            break;
          }
          case 0x00000040: {
            value.channelMaskLabel = 'speaker_front_left_of_center';
            break;
          }
          case 0x00000080: {
            value.channelMaskLabel = 'speaker_front_right_of_center';
            break;
          }
          case 0x00000100: {
            value.channelMaskLabel = 'speaker_back_center';
            break;
          }
          case 0x00000200: {
            value.channelMaskLabel = 'speaker_side_left';
            break;
          }
          case 0x00000400: {
            value.channelMaskLabel = 'speaker_side_right';
            break;
          }
          case 0x00000800: {
            value.channelMaskLabel = 'speaker_top_center';
            break;
          }
          case 0x00001000: {
            value.channelMaskLabel = 'speaker_top_front_left';
            break;
          }
          case 0x00002000: {
            value.channelMaskLabel = 'speaker_top_front_center';
            break;
          }
          case 0x00004000: {
            value.channelMaskLabel = 'speaker_top_front_right';
            break;
          }
          case 0x00008000: {
            value.channelMaskLabel = 'speaker_top_back_left';
            break;
          }
          case 0x00010000: {
            value.channelMaskLabel = 'speaker_top_back_center';
            break;
          }
          case 0x00020000: {
            value.channelMaskLabel = 'speaker_top_back_right';
            break;
          }
          case 0x80000000: {
            value.channelMaskLabel = 'speaker_all';
            break;
          }
          default: {
            debug('Unknown Channel Mask:', value.channelMask);
            value.channelMaskLabel = `unknown_${value.channelMask}`;
          }
        }

        // GUID / Subformat
        value.subFormat_1 = format.readUInt32(true);
        value.subFormat_2 = format.readUInt16(true);
        value.subFormat_3 = format.readUInt16(true);
        value.subFormat_4 = format.readUInt32(true);
        value.subFormat_5 = format.readUInt32(true);
      } else {
        value.extraParams = format.read(value.extraParamSize, true);
      }
    }

    debug('decodeFMT =', JSON.stringify(value, null, 2));
    return value;
  }

  /**
   * Enocdes JSON values to a valid `fmt ` chunk Buffer.
   *
   * Defaults are set to Red Book Compact Disc Digital Audio (CDDA or CD-DA) / Audio CD standards.
   *
   * RF64 specific fields are currently unsupported.
   *
   * @param {object} [data={}] - The values to encode to the `fmt ` chunk.
   * @param {number} [data.audioFormat=1] - Format of the audio data, 1 is PCM and values other than 1 indicate some form of compression. See `decodeFMT` for a listing
   * @param {number} [data.channels=2] - Mono = 1, Stereo = 2, etc.
   * @param {number} [data.sampleRate=44100] - 8000, 44100, 96000, etc.
   * @param {number} [data.byteRate=176400] - Sample Rate * Channels * Bits per Sample / 8
   * @param {number} [data.blockAlign=4] -  The number of bytes for one sample including all channels. Channels * Bits per Sample / 8
   * @param {number} [data.bitsPerSample=16] - 8 bits = 8, 16 bits = 16, etc.
   * @param {number} [data.extraParamSiz=0] - The size of the extra paramteres to follow, or 0.
   * @param {number} [data.extraParams=0] - Any extra data to encode.
   * @returns {Buffer} - The newley encoded `fmt ` chunk.
   * @static
   */
  static encodeFMT(data = {}) {
    debug('encodeFMT:', data);
    const {
      audioFormat = 1,
      channels = 2,
      sampleRate = 44100,
      byteRate = 176400,
      blockAlign = 4,
      bitsPerSample = 16,
      extraParamSize = 0,
      extraParams = 0,
    } = data;

    // Padding
    const buffer = Buffer.alloc(26 + extraParamSize, 0);

    // Chunk ID
    buffer.write('fmt ', 0);

    // Chunk Size
    buffer.writeUInt32LE(26 - 8 + extraParamSize, 4);

    // Audio Format: 1 for PCM
    buffer.writeUInt16LE(audioFormat, 8);

    // Channels: 1 or 2
    buffer.writeUInt16LE(channels, 10);

    // Sample Rate: 44100 Hz (44 AC 00 00)
    buffer.writeUInt32LE(sampleRate, 12);

    // Byte Rate: Sample Rate × Channels × Bits Per Sample / 8, or more simply, Sample Rate × Block Align
    buffer.writeUInt32LE(byteRate, 16);

    // Block Align: Channels × Bits Per Sample / 8, example, 2 for a Mono sample and 4 for Stereo.
    buffer.writeUInt16LE(blockAlign, 20);

    // Bits Per Sample: 16-bit
    buffer.writeUInt16LE(bitsPerSample, 22);

    // Extra Param Size: Usually not set
    buffer.writeUInt16LE(extraParamSize, 24);

    // Extra Params
    /* istanbul ignore next */
    if (extraParamSize > 0 && extraParams) {
      // Fill the space incase the extraParamSize is larger than the extraParams.
      buffer.fill(0, 26, 26 + extraParamSize);
      buffer.write(extraParams, 26);
    }

    debug('Buffer:', buffer.toString('hex'));
    return buffer;
  }

  /**
   * Decode the LIST (LIST Information) chunk.
   *
   * A LIST chunk defines a list of sub-chunks and has the following format.
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @static
   */
  static decodeLIST(chunk) {
    debug('decodeLIST');
    const list = DataStream.fromData(chunk);
    const chunkID = list.readString(4);
    const size = list.readUInt32(true);
    const type = list.readString(4);
    const value = {
      chunkID,
      size,
      type,
    };

    switch (type) {
      case 'INFO': {
        value.data = AudioWAV.decodeLISTINFO(list);
        break;
      }
      case 'adtl': {
        value.data = AudioWAV.decodeLISTadtl(list);
        break;
      }
      /* istanbul ignore next */
      default: {
        debug(`Unknown LIST Type: ${type}`);
      }
    }

    debug('decodeLIST =', JSON.stringify(value, null, 2));
    return value;
  }

  /**
   * Decode the LIST INFO chunks.
   *
   * @param {DataStream} list - List DataStream
   * @returns {object} - The parsed list.
   */
  static decodeLISTINFO(list) {
    debug('decodeLISTINFO');
    const value = [];
    while (list.remainingBytes()) {
      const info = {};
      // TODO: Switch for listID to have nice human labels for IDs
      info.id = list.readString(4);
      info.size = list.readUInt32(true);
      info.text = list.readString(info.size);
      value.push(info);
    }
    return value;
  }

  /**
   * Decode the LIST adtl chunks.
   *
   * @param {DataStream} list - List DataStream
   * @returns {object} - The parsed list.
   */
  static decodeLISTadtl(list) {
    debug('decodeLISTadtl');
    const value = [];
    while (list.remainingBytes()) {
      const adtl = {};
      adtl.id = list.readString(4);
      adtl.size = list.readUInt32(true);

      switch (adtl.id) {
        case 'labl': {
          adtl.label = list.readString(adtl.size).trim();
          break;
        }
        /* istanbul ignore next */
        default: {
          debug(`Unknown ID: ${adtl.id}`);
          this.advance(adtl.size);
        }
      }
      value.push(adtl);
    }
    return value;
  }

  /**
   * Decode the data (Audio Data) chunk.
   *
   * @param {string | Buffer} chunk - Data Blob
   * @static
   */
  static decodeDATA(chunk) {
    debug(`decodeDATA: ${chunk.length} data bytes`);
  }

  /**
   * Decode the RLND (Roland) chunk.
   *
   * Useful for use on SP-404 / SP-404SX / SP-404A samplers, perhaps others.
   *
   * This chunk is sized and padded with zeros to ensure that the the sample data starts exactly at offset 512.
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @static
   */
  static decodeRLND(chunk) {
    debug('decodeRLND');
    const roland = DataStream.fromData(chunk);
    const chunkID = roland.readString(4);
    const size = roland.readUInt32(true);

    // SP-404SX Wave Converter v1.01 on macOS sets this value to `roifspsx`
    const device = roland.readString(8);

    // SP-404SX Wave Converter v1.01 on macOS sets this value to `0x04`
    const unknown1 = roland.readUInt8();
    // SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`
    const unknown2 = roland.readUInt8();
    // SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`
    const unknown3 = roland.readUInt8();
    // SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`
    const unknown4 = roland.readUInt8();

    // Sample Index starts at 0 for A1 and increases by 12 for each bank, i.e. A1 = 0x00 / 0, A5 = 0x04 / 4, B5 = 0x10 / 16, ..., J12 = 0x77 / 119.
    const sampleIndex = roland.readUInt8();
    let sampleLabel = '';
    /* istanbul ignore next */
    if (device === 'roifspsx') {
      switch (sampleIndex) {
        case 0: sampleLabel = 'A1'; break;
        case 1: sampleLabel = 'A2'; break;
        case 2: sampleLabel = 'A3'; break;
        case 3: sampleLabel = 'A4'; break;
        case 4: sampleLabel = 'A5'; break;
        case 5: sampleLabel = 'A6'; break;
        case 6: sampleLabel = 'A7'; break;
        case 7: sampleLabel = 'A8'; break;
        case 8: sampleLabel = 'A9'; break;
        case 9: sampleLabel = 'A10'; break;
        case 10: sampleLabel = 'A11'; break;
        case 11: sampleLabel = 'A12'; break;
        case 12: sampleLabel = 'B1'; break;
        case 13: sampleLabel = 'B2'; break;
        case 14: sampleLabel = 'B3'; break;
        case 15: sampleLabel = 'B4'; break;
        case 16: sampleLabel = 'B5'; break;
        case 17: sampleLabel = 'B6'; break;
        case 18: sampleLabel = 'B7'; break;
        case 19: sampleLabel = 'B8'; break;
        case 20: sampleLabel = 'B9'; break;
        case 21: sampleLabel = 'B10'; break;
        case 22: sampleLabel = 'B11'; break;
        case 23: sampleLabel = 'B12'; break;
        case 24: sampleLabel = 'C1'; break;
        case 25: sampleLabel = 'C2'; break;
        case 26: sampleLabel = 'C3'; break;
        case 27: sampleLabel = 'C4'; break;
        case 28: sampleLabel = 'C5'; break;
        case 29: sampleLabel = 'C6'; break;
        case 30: sampleLabel = 'C7'; break;
        case 31: sampleLabel = 'C8'; break;
        case 32: sampleLabel = 'C9'; break;
        case 33: sampleLabel = 'C10'; break;
        case 34: sampleLabel = 'C11'; break;
        case 35: sampleLabel = 'C12'; break;
        case 36: sampleLabel = 'D1'; break;
        case 37: sampleLabel = 'D2'; break;
        case 38: sampleLabel = 'D3'; break;
        case 39: sampleLabel = 'D4'; break;
        case 40: sampleLabel = 'D5'; break;
        case 41: sampleLabel = 'D6'; break;
        case 42: sampleLabel = 'D7'; break;
        case 43: sampleLabel = 'D8'; break;
        case 44: sampleLabel = 'D9'; break;
        case 45: sampleLabel = 'D10'; break;
        case 46: sampleLabel = 'D11'; break;
        case 47: sampleLabel = 'D12'; break;
        case 48: sampleLabel = 'E1'; break;
        case 49: sampleLabel = 'E2'; break;
        case 50: sampleLabel = 'E3'; break;
        case 51: sampleLabel = 'E4'; break;
        case 52: sampleLabel = 'E5'; break;
        case 53: sampleLabel = 'E6'; break;
        case 54: sampleLabel = 'E7'; break;
        case 55: sampleLabel = 'E8'; break;
        case 56: sampleLabel = 'E9'; break;
        case 57: sampleLabel = 'E10'; break;
        case 58: sampleLabel = 'E11'; break;
        case 59: sampleLabel = 'E12'; break;
        case 60: sampleLabel = 'F1'; break;
        case 61: sampleLabel = 'F2'; break;
        case 62: sampleLabel = 'F3'; break;
        case 63: sampleLabel = 'F4'; break;
        case 64: sampleLabel = 'F5'; break;
        case 65: sampleLabel = 'F6'; break;
        case 66: sampleLabel = 'F7'; break;
        case 67: sampleLabel = 'F8'; break;
        case 68: sampleLabel = 'F9'; break;
        case 69: sampleLabel = 'F10'; break;
        case 70: sampleLabel = 'F11'; break;
        case 71: sampleLabel = 'F12'; break;
        case 72: sampleLabel = 'G1'; break;
        case 73: sampleLabel = 'G2'; break;
        case 74: sampleLabel = 'G3'; break;
        case 75: sampleLabel = 'G4'; break;
        case 76: sampleLabel = 'G5'; break;
        case 77: sampleLabel = 'G6'; break;
        case 78: sampleLabel = 'G7'; break;
        case 79: sampleLabel = 'G8'; break;
        case 80: sampleLabel = 'G9'; break;
        case 81: sampleLabel = 'G10'; break;
        case 82: sampleLabel = 'G11'; break;
        case 83: sampleLabel = 'G12'; break;
        case 84: sampleLabel = 'H1'; break;
        case 85: sampleLabel = 'H2'; break;
        case 86: sampleLabel = 'H3'; break;
        case 87: sampleLabel = 'H4'; break;
        case 88: sampleLabel = 'H5'; break;
        case 89: sampleLabel = 'H6'; break;
        case 90: sampleLabel = 'H7'; break;
        case 91: sampleLabel = 'H8'; break;
        case 92: sampleLabel = 'H9'; break;
        case 93: sampleLabel = 'H10'; break;
        case 94: sampleLabel = 'H11'; break;
        case 95: sampleLabel = 'H12'; break;
        case 96: sampleLabel = 'I1'; break;
        case 97: sampleLabel = 'I2'; break;
        case 98: sampleLabel = 'I3'; break;
        case 99: sampleLabel = 'I4'; break;
        case 100: sampleLabel = 'I5'; break;
        case 101: sampleLabel = 'I6'; break;
        case 102: sampleLabel = 'I7'; break;
        case 103: sampleLabel = 'I8'; break;
        case 104: sampleLabel = 'I9'; break;
        case 105: sampleLabel = 'I10'; break;
        case 106: sampleLabel = 'I11'; break;
        case 107: sampleLabel = 'I12'; break;
        case 108: sampleLabel = 'J1'; break;
        case 109: sampleLabel = 'J2'; break;
        case 110: sampleLabel = 'J3'; break;
        case 111: sampleLabel = 'J4'; break;
        case 112: sampleLabel = 'J5'; break;
        case 113: sampleLabel = 'J6'; break;
        case 114: sampleLabel = 'J7'; break;
        case 115: sampleLabel = 'J8'; break;
        case 116: sampleLabel = 'J9'; break;
        case 117: sampleLabel = 'J10'; break;
        case 118: sampleLabel = 'J11'; break;
        case 119: sampleLabel = 'J12'; break;
        default: {
          debug('Unknown Pad:', sampleIndex);
        }
      }
    }

    const value = {
      chunkID,
      size,
      device,
      unknown1,
      unknown2,
      unknown3,
      unknown4,
      sampleIndex,
      sampleLabel,
    };

    debug('decodeRLND =', JSON.stringify(value, null, 2));
    return value;
  }

  /**
   * Enocdes JSON values to a valid `RLND` (Roland) chunk Buffer.
   *
   * Useful for use on SP-404 / SP-404SX / SP-404A samplers, perhaps others.
   *
   * The unknown value may be an unsigned 32bit integer.
   *
   * This chunk is sized and padded with zeros to ensure that the the sample data starts exactly at offset 512.
   *
   * @static
   * @param {object} data - The JSON values to set in the RLND chunk.
   * @param {string} data.device - An 8 character string representing the device label. SP-404SX Wave Converter v1.01 on macOS sets this value to `roifspsx`.
   * @param {number} [data.unknown1=4] - Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x04`.
   * @param {number} [data.unknown2=0] - Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`.
   * @param {number} [data.unknown3=0] - Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`.
   * @param {number} [data.unknown4=0] - Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`.
   * @param {number|string} data.sampleIndex - The pad the sample plays on, between `0` and `119` as a number or the pad label, `A1` - `J12`. Only the SP404SX (device === `roifspsx`) provided values can be converted from string corrently, and if it is not found it will defailt to `0` / `A1`.
   * @returns {Buffer} - The new RLND chunk.
   * @static
   * @see {@link https://www.roland.com/global/support/by_product/sp-404sx/updates_drivers/|SP-404SX Support Page}
   */
  static encodeRLND(data) {
    const {
      device,
      unknown1 = 4,
      unknown2 = 0,
      unknown3 = 0,
      unknown4 = 0,
    } = data;
    let { sampleIndex } = data;
    debug('encodeRLND:', device, unknown1, unknown2, unknown3, unknown4, sampleIndex);
    // Padding
    const buffer = Buffer.alloc(466, 0);

    // ChunkID
    buffer.write('RLND', 0);

    // Chunk Size
    buffer.writeUInt32LE(458, 4);

    // Device, ie: 'roifspsx'
    buffer.write(device, 8);

    // Unknown
    buffer.writeUInt8(unknown1, 16);
    buffer.writeUInt8(unknown2, 17);
    buffer.writeUInt8(unknown3, 18);
    buffer.writeUInt8(unknown4, 19);

    // Determine the sample index from the string.
    if (device === 'roifspsx' && typeof sampleIndex === 'string') {
      /* istanbul ignore next */
      switch (sampleIndex.toUpperCase()) {
        case 'A1': sampleIndex = 0; break;
        case 'A2': sampleIndex = 1; break;
        case 'A3': sampleIndex = 2; break;
        case 'A4': sampleIndex = 3; break;
        case 'A5': sampleIndex = 4; break;
        case 'A6': sampleIndex = 5; break;
        case 'A7': sampleIndex = 6; break;
        case 'A8': sampleIndex = 7; break;
        case 'A9': sampleIndex = 8; break;
        case 'A10': sampleIndex = 9; break;
        case 'A11': sampleIndex = 10; break;
        case 'A12': sampleIndex = 11; break;
        case 'B1': sampleIndex = 12; break;
        case 'B2': sampleIndex = 13; break;
        case 'B3': sampleIndex = 14; break;
        case 'B4': sampleIndex = 15; break;
        case 'B5': sampleIndex = 16; break;
        case 'B6': sampleIndex = 17; break;
        case 'B7': sampleIndex = 18; break;
        case 'B8': sampleIndex = 19; break;
        case 'B9': sampleIndex = 20; break;
        case 'B10': sampleIndex = 21; break;
        case 'B11': sampleIndex = 22; break;
        case 'B12': sampleIndex = 23; break;
        case 'C1': sampleIndex = 24; break;
        case 'C2': sampleIndex = 25; break;
        case 'C3': sampleIndex = 26; break;
        case 'C4': sampleIndex = 27; break;
        case 'C5': sampleIndex = 28; break;
        case 'C6': sampleIndex = 29; break;
        case 'C7': sampleIndex = 30; break;
        case 'C8': sampleIndex = 31; break;
        case 'C9': sampleIndex = 32; break;
        case 'C10': sampleIndex = 33; break;
        case 'C11': sampleIndex = 34; break;
        case 'C12': sampleIndex = 35; break;
        case 'D1': sampleIndex = 36; break;
        case 'D2': sampleIndex = 37; break;
        case 'D3': sampleIndex = 38; break;
        case 'D4': sampleIndex = 39; break;
        case 'D5': sampleIndex = 40; break;
        case 'D6': sampleIndex = 41; break;
        case 'D7': sampleIndex = 42; break;
        case 'D8': sampleIndex = 43; break;
        case 'D9': sampleIndex = 44; break;
        case 'D10': sampleIndex = 45; break;
        case 'D11': sampleIndex = 46; break;
        case 'D12': sampleIndex = 47; break;
        case 'E1': sampleIndex = 48; break;
        case 'E2': sampleIndex = 49; break;
        case 'E3': sampleIndex = 50; break;
        case 'E4': sampleIndex = 51; break;
        case 'E5': sampleIndex = 52; break;
        case 'E6': sampleIndex = 53; break;
        case 'E7': sampleIndex = 54; break;
        case 'E8': sampleIndex = 55; break;
        case 'E9': sampleIndex = 56; break;
        case 'E10': sampleIndex = 57; break;
        case 'E11': sampleIndex = 58; break;
        case 'E12': sampleIndex = 59; break;
        case 'F1': sampleIndex = 60; break;
        case 'F2': sampleIndex = 61; break;
        case 'F3': sampleIndex = 62; break;
        case 'F4': sampleIndex = 63; break;
        case 'F5': sampleIndex = 64; break;
        case 'F6': sampleIndex = 65; break;
        case 'F7': sampleIndex = 66; break;
        case 'F8': sampleIndex = 67; break;
        case 'F9': sampleIndex = 68; break;
        case 'F10': sampleIndex = 69; break;
        case 'F11': sampleIndex = 70; break;
        case 'F12': sampleIndex = 71; break;
        case 'G1': sampleIndex = 72; break;
        case 'G2': sampleIndex = 73; break;
        case 'G3': sampleIndex = 74; break;
        case 'G4': sampleIndex = 75; break;
        case 'G5': sampleIndex = 76; break;
        case 'G6': sampleIndex = 77; break;
        case 'G7': sampleIndex = 78; break;
        case 'G8': sampleIndex = 79; break;
        case 'G9': sampleIndex = 80; break;
        case 'G10': sampleIndex = 81; break;
        case 'G11': sampleIndex = 82; break;
        case 'G12': sampleIndex = 83; break;
        case 'H1': sampleIndex = 84; break;
        case 'H2': sampleIndex = 85; break;
        case 'H3': sampleIndex = 86; break;
        case 'H4': sampleIndex = 87; break;
        case 'H5': sampleIndex = 88; break;
        case 'H6': sampleIndex = 89; break;
        case 'H7': sampleIndex = 90; break;
        case 'H8': sampleIndex = 91; break;
        case 'H9': sampleIndex = 92; break;
        case 'H10': sampleIndex = 93; break;
        case 'H11': sampleIndex = 94; break;
        case 'H12': sampleIndex = 95; break;
        case 'I1': sampleIndex = 96; break;
        case 'I2': sampleIndex = 97; break;
        case 'I3': sampleIndex = 98; break;
        case 'I4': sampleIndex = 99; break;
        case 'I5': sampleIndex = 100; break;
        case 'I6': sampleIndex = 101; break;
        case 'I7': sampleIndex = 102; break;
        case 'I8': sampleIndex = 103; break;
        case 'I9': sampleIndex = 104; break;
        case 'I10': sampleIndex = 105; break;
        case 'I11': sampleIndex = 106; break;
        case 'I12': sampleIndex = 107; break;
        case 'J1': sampleIndex = 108; break;
        case 'J2': sampleIndex = 109; break;
        case 'J3': sampleIndex = 110; break;
        case 'J4': sampleIndex = 111; break;
        case 'J5': sampleIndex = 112; break;
        case 'J6': sampleIndex = 113; break;
        case 'J7': sampleIndex = 114; break;
        case 'J8': sampleIndex = 115; break;
        case 'J9': sampleIndex = 116; break;
        case 'J10': sampleIndex = 117; break;
        case 'J11': sampleIndex = 118; break;
        case 'J12': sampleIndex = 119; break;
        default: {
          debug('Unknown Pad:', sampleIndex);
          sampleIndex = 0;
        }
      }
    }

    // Sample Index
    buffer.writeUInt8(sampleIndex, 20);

    debug('Buffer:', buffer.toString('hex'));
    return buffer;
  }

  /**
   * Decode the JUNK (Padding) chunk.
   *
   * To align RIFF chunks to certain boundaries (i.e. 2048 bytes for CD-ROMs) the RIFF specification includes a JUNK chunk.
   * The contents are to be skipped when reading.
   * When writing RIFFs, JUNK chunks should not have an odd Size.
   *
   * @param {string | Buffer} chunk - Data Blob
   * @static
   */
  static decodeJUNK(chunk) {
    const junk = DataStream.fromData(chunk);
    const chunkID = junk.readString(4);
    let size = junk.readUInt32(true);
    if (size % 2 !== 0) {
      size += 1;
    }
    debug(`decodeJUNK: ${chunk.length} bytes, chunkID: ${chunkID}, junk size: ${size}`);
  }

  /**
   * Decode the bext (Broadcast Wave Format (BWF) Broadcast Extension) chunk.
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @static
   * @see {@link https://sites.google.com/site/musicgapi/technical-documents/wav-file-format#cue|Cue Chunk}
   * @see {@link https://tech.ebu.ch/docs/tech/tech3285.pdf|Spec}
   */
  static decodeBEXT(chunk) {
    debug('decodeBEXT');
    const bext = DataStream.fromData(chunk);
    const chunkID = bext.readString(4);
    let size = bext.readUInt32(true);

    /* istanbul ignore next */
    if (size % 2 !== 0) {
      size += 1;
    }

    const value = {
      chunkID,
      size,
    };
    // Description of the sound sequence
    value.description = bext.readString(256);
    // Name of the originator
    value.originator = bext.readString(32);
    // Reference of the originator
    value.originatorReference = bext.readString(32);
    // yyyy:mm:dd
    value.originationDate = bext.readString(10);
    // hh:mm:ss
    value.originationTime = bext.readString(8);
    // First sample count since midnight, low word
    value.timeReferenceLow = bext.readUInt32(true);
    // First sample count since midnight, high word
    value.timeReferenceHigh = bext.readUInt32(true);
    // Version of the BWF; unsigned binary number
    value.version = bext.readUInt16(true);
    // SMPTE UMID
    value.umid = bext.read(64, true);
    // Integrated Loudness Value of the file in LUFS (multiplied by 100)
    value.loudnessValue = bext.readUInt16(true);
    // Loudness Range of the file in LU (multiplied by 100)
    value.loudnessRange = bext.readUInt16(true);
    // Maximum True Peak Level of the file expressed as dBTP (multiplied by 100)
    value.maxTruePeakLevel = bext.readUInt16(true);
    // Highest value of the Momentary Loudness Level of the file in LUFS (multiplied by 100)
    value.maxMomentaryLoudness = bext.readUInt16(true);
    // Highest value of the Short-Term Loudness Level of the file in LUFS (multiplied by 100)
    value.maxShortTermLoudness = bext.readUInt16(true);
    // 180 bytes, reserved for future use
    value.reserved = bext.read(180, true);
    // History coding
    value.codingHistory = bext.read(bext.remainingBytes(), true);

    debug('decodeBEXT =', JSON.stringify(value, null, 2));
    return value;
  }

  /**
   * Decode the 'cue ' (Cue Points) chunk.
   *
   * A cue chunk specifies one or more sample offsets which are often used to mark noteworthy sections of audio.
   * For example, the beginning and end of a verse in a song may have cue points to make them easier to find.
   * The cue chunk is optional and if included, a single cue chunk should specify all cue points for the "WAVE" chunk.
   * No more than one cue chunk is allowed in a "WAVE" chunk.
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @static
   * @see {@link https://sites.google.com/site/musicgapi/technical-documents/wav-file-format#cue|Cue Chunk}
   */
  static decodeCue(chunk) {
    debug('decodeCue');
    const cue = DataStream.fromData(chunk);
    const chunkID = cue.readString(4);
    const size = cue.readUInt32(true);

    // This value specifies the number of following cue points in this chunk.
    const numberCuePoints = cue.readUInt32(true);

    const value = {
      chunkID,
      size,
      numberCuePoints,
      data: [],
    };
    for (let i = 0; i < numberCuePoints; i++) {
      const point = {};

      // Each cue point has a unique identification value used to associate cue points with information in other chunks.
      // For example, a Label chunk contains text that describes a point in the wave file by referencing the associated cue point.
      point.id = cue.readUInt32(true);

      // Position
      // The position specifies the sample offset associated with the cue point in terms of the sample's position in the final stream of samples generated by the play list.
      // Said in another way, if a play list chunk is specified, the position value is equal to the sample number at which this cue point will occur during playback of the entire play list as defined by the play list's order.
      // If no play list chunk is specified this value should be 0.
      point.position = cue.readUInt32(true);

      // This value specifies the four byte ID used by the chunk containing the sample that corresponds to this cue point.
      // A Wave file with no play list is always "data".
      // A Wave file with a play list containing both sample data and silence may be either "data" or "slnt".
      point.chunkID = cue.readString(4);

      // The Chunk Start value specifies the byte offset into the Wave List Chunk of the chunk containing the sample that corresponds to this cue point.
      // This is the same chunk described by the Data Chunk ID value.
      // If no Wave List Chunk exists in the Wave file, this value is 0.
      // If a Wave List Chunk exists, this is the offset into the "wavl" chunk.
      // The first chunk in the Wave List Chunk would be specified with a value of 0.
      point.chunkStart = cue.readUInt32(true);

      // The Block Start value specifies the byte offset into the "data" or "slnt" Chunk to the start of the block containing the sample.
      // The start of a block is defined as the first byte in uncompressed PCM wave data or the last byte in compressed wave data where decompression can begin to find the value of the corresponding sample value.
      point.blockStart = cue.readUInt32(true);

      // The Sample Offset specifies an offset into the block (specified by Block Start) for the sample that corresponds to the cue point.
      // In uncompressed PCM waveform data, this is simply the byte offset into the "data" chunk.
      // In compressed waveform data, this value is equal to the number of samples (may or may not be bytes) from the Block Start to the sample that corresponds to the cue point.
      point.sampleOffset = cue.readUInt32(true);

      value.data.push(point);
    }

    /* istanbul ignore next */
    if (cue.remainingBytes() > 0) {
      debug(`Unexpected ${cue.remainingBytes()} bytes remaining`);
    }

    debug('decodeCue =', JSON.stringify(value, null, 2));
    return value;
  }

  /**
   * Decode the 'ResU' chunk, a ZIP compressed JSON Data containg Time Signature, Tempo and other data for Logic Pro X.
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @static
   */
  static decodeResU(chunk) {
    debug('decodeResU');
    const resu = DataStream.fromData(chunk);
    const chunkID = resu.readString(4);
    const size = resu.readUInt32(true);
    const data = resu.read(size, true);

    let decompressed;
    try {
      decompressed = zlib.inflateSync(data);
      debug('Inflated Size:', decompressed.length);
    } catch (error) {
      /* istanbul ignore next */
      debug('Error Inflating ResU:', error);
    }

    const value = {
      chunkID,
      size,
    };
    try {
      value.data = JSON.parse(decompressed);
    } catch (error) {
      /* istanbul ignore next */
      debug('Error Parsing ResU JSON:', error);
    }

    debug('decodeResU =', JSON.stringify(value, null, 2));
    return value;
  }

  /**
   * DataSize 64 Parsing
   *
   * @param {string | Buffer} chunk - Data Blob
   * @returns {object} - The decoded values.
   * @see {@link https://tech.ebu.ch/docs/tech/tech3306v1_0.pdf|RF64: An extended File Format for Audio}
   * @static
   */
  static decodeDS64(chunk) {
    const ds64 = DataStream.fromData(chunk);
    const chunkID = ds64.readString(4);
    const size = ds64.readUInt32(true);

    // low 4 byte size of RF64 block
    const riffSizeLow = ds64.readUInt32(true);
    // high 4 byte size of RF64 block
    const riffSizeHigh = ds64.readUInt32(true);
    // low 4 byte size of data chunk
    const dataSizeLow = ds64.readUInt32(true);
    // high 4 byte size of data chunk
    const dataSizeHigh = ds64.readUInt32(true);
    // low 4 byte sample count of fact chunk
    const sampleCountLow = ds64.readUInt32(true);
    // high 4 byte sample count of fact chunk
    const sampleCountHigh = ds64.readUInt32(true);
    // Number of valid entries in the following table
    const tableLength = ds64.readUInt32(true);

    const table = [];
    /* istanbul ignore next */
    if (tableLength > 0) {
      while (ds64.remainingBytes() > 0) {
        table.push({
          chunkID: ds64.readString(4),
          chunkSizeLow: ds64.readUInt32(true),
          chunkSizeHigh: ds64.readUInt32(true),
        });
      }
    }

    const value = {
      chunkID,
      size,
      riffSizeLow,
      riffSizeHigh,
      dataSizeLow,
      dataSizeHigh,
      sampleCountLow,
      sampleCountHigh,
      tableLength,
      table,
    };

    debug('decodeDS64 =', JSON.stringify(value, null, 2));
    return value;
  }
}

module.exports = AudioWAV;