[![view on npm](https://img.shields.io/npm/v/uttori-audio-wave.svg)](https://www.npmjs.org/package/uttori-audio-wave)
[![npm module downloads](https://img.shields.io/npm/dt/uttori-audio-wave.svg)](https://www.npmjs.org/package/uttori-audio-wave)
[![Build Status](https://travis-ci.org/uttori/uttori-audio-wave.svg?branch=master)](https://travis-ci.org/uttori/uttori-audio-wave)
[![Dependency Status](https://david-dm.org/uttori/uttori-audio-wave.svg)](https://david-dm.org/uttori/uttori-audio-wave)
[![Coverage Status](https://coveralls.io/repos/github/uttori/uttori-audio-wave/badge.svg?branch=master)](https://coveralls.io/github/uttori/uttori-audio-wave?branch=master)

# Uttori AudioWAV

Utility for reading, parsing and basic encoding for Waveform Audio File Format (WAVE / WAV) files.

## Install

```bash
npm install --save uttori-audio-wave
```

* * *

# Example

In this example we convert a valid 16 bit, 44.1kHz Wave file to be used with an SP-404SX by adding the appropriate header.

```js
const fs = require('fs');
const { AudioWAV } = require('uttori-audio-wave');

// Read in a WAV file with AudioWAV
const data = fs.readFileSync('./test/assets/input.wav');
const input = AudioWAV.fromFile(data);
const { chunks } = input;

// Remove the header, we will make a new one with our new size.
chunks.splice(0, 1);

// Remove any existing RLND chunks, should be after `fmt `
const roland_index = chunks.findIndex((chunk) => chunk.type === 'roland');
if (roland_index > 0) {
  chunks.splice(roland_index, 1);
}

// Create a RLND chunk and set the pad to J12
const rlnd = AudioWAV.encodeRLND({ device: 'roifspsx', sampleIndex: 'J12' });

// Add the new RLND after the format chunk
const index = chunks.findIndex((chunk) => chunk.type === 'format');
chunks.splice(index + 1, 0, { type: 'roland', chunk: rlnd });

// Calculate the total size, include `WAVE` text (4 bytes)
const size = chunks.reduce((total, chunk) => {
  total += chunk.chunk.length;
  return total;
}, 4);

// Build the binary data
const header = AudioWAV.encodeHeader({ size });
const parts = chunks.reduce((arr, chunk) => {
  arr.push(Buffer.from(chunk.chunk));
  return arr;
}, [header]);
const output = Buffer.concat(parts);

// Write file, *.WAV as that is what the offical software uses.
fs.writeFileSync('./test/assets/output.WAV', output);
```

# API Reference

<a name="AudioWAV"></a>

## AudioWAV
AudioWAV - WAVE Audio Utility

The WAVE file format is a subset of Microsoft's RIFF specification for the storage of multimedia files.

**Kind**: global class  

* [AudioWAV](#AudioWAV)
    * [new AudioWAV(list, [overrides])](#new_AudioWAV_new)
    * _instance_
        * [.parse()](#AudioWAV+parse)
        * [.decodeChunk()](#AudioWAV+decodeChunk) ⇒ <code>string</code>
    * _static_
        * [.fromFile(data)](#AudioWAV.fromFile) ⇒ [<code>AudioWAV</code>](#AudioWAV)
        * [.fromBuffer(buffer)](#AudioWAV.fromBuffer) ⇒ [<code>AudioWAV</code>](#AudioWAV)
        * [.decodeHeader(chunk)](#AudioWAV.decodeHeader) ⇒ <code>object</code>
        * [.encodeHeader(data)](#AudioWAV.encodeHeader) ⇒ <code>Buffer</code>
        * [.decodeFMT(chunk)](#AudioWAV.decodeFMT) ⇒ <code>object</code>
        * [.encodeFMT([data])](#AudioWAV.encodeFMT) ⇒ <code>Buffer</code>
        * [.decodeLIST(chunk)](#AudioWAV.decodeLIST) ⇒ <code>object</code>
        * [.decodeLISTINFO(list)](#AudioWAV.decodeLISTINFO) ⇒ <code>object</code>
        * [.decodeLISTadtl(list)](#AudioWAV.decodeLISTadtl) ⇒ <code>object</code>
        * [.decodeDATA(chunk)](#AudioWAV.decodeDATA)
        * [.decodeRLND(chunk)](#AudioWAV.decodeRLND) ⇒ <code>object</code>
        * [.encodeRLND(data)](#AudioWAV.encodeRLND) ⇒ <code>Buffer</code>
        * [.decodeJUNK(chunk)](#AudioWAV.decodeJUNK)
        * [.decodeBEXT(chunk)](#AudioWAV.decodeBEXT) ⇒ <code>object</code>
        * [.decodeCue(chunk)](#AudioWAV.decodeCue) ⇒ <code>object</code>
        * [.decodeResU(chunk)](#AudioWAV.decodeResU) ⇒ <code>object</code>
        * [.decodeDS64(chunk)](#AudioWAV.decodeDS64) ⇒ <code>object</code>

<a name="new_AudioWAV_new"></a>

### new AudioWAV(list, [overrides])
Creates a new AudioWAV.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| list | <code>DataBufferList</code> |  | The DataBufferList of the audio file to process. |
| [overrides] | <code>object</code> |  | Options for this instance. |
| [overrides.size] | <code>number</code> | <code>16</code> | ArrayBuffer byteLength for the underlying binary parsing. |

**Example** *(AudioWAV)*  
```js
const data = fs.readFileSync('./audio.wav');
const file = AudioWAV.fromFile(data);
console.log('Chunks:', file.chunks);
```
<a name="AudioWAV+parse"></a>

### audioWAV.parse()
Parse the WAV file, decoding the supported chunks.

**Kind**: instance method of [<code>AudioWAV</code>](#AudioWAV)  
<a name="AudioWAV+decodeChunk"></a>

### audioWAV.decodeChunk() ⇒ <code>string</code>
Decodes the chunk type, and attempts to parse that chunk if supported.
Supported Chunk Types: IHDR, PLTE, IDAT, IEND, tRNS, pHYs

Chunk Structure:
Length: 4 bytes
Type:   4 bytes (IHDR, PLTE, IDAT, IEND, etc.)
Chunk:  {length} bytes
CRC:    4 bytes

**Kind**: instance method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>string</code> - Chunk Type  
**Throws**:

- <code>Error</code> Invalid Chunk Length when less than 0

**See**: [Chunk Layout](http://www.w3.org/TR/2003/REC-PNG-20031110/#5Chunk-layout)  
<a name="AudioWAV.fromFile"></a>

### AudioWAV.fromFile(data) ⇒ [<code>AudioWAV</code>](#AudioWAV)
Creates a new AudioWAV from file data.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: [<code>AudioWAV</code>](#AudioWAV) - the new AudioWAV instance for the provided file data  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Buffer</code> | The data of the image to process. |

<a name="AudioWAV.fromBuffer"></a>

### AudioWAV.fromBuffer(buffer) ⇒ [<code>AudioWAV</code>](#AudioWAV)
Creates a new AudioWAV from a DataBuffer.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: [<code>AudioWAV</code>](#AudioWAV) - the new AudioWAV instance for the provided DataBuffer  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>DataBuffer</code> | The DataBuffer of the image to process. |

<a name="AudioWAV.decodeHeader"></a>

### AudioWAV.decodeHeader(chunk) ⇒ <code>object</code>
Decodes and validates WAV Header.

Signature (Decimal): [82, 73, 70, 70, ..., ..., ..., ..., 87, 65, 86, 69]
Signature (Hexadecimal): [52, 49, 46, 46, ..., ..., ..., ..., 57, 41, 56, 45]
Signature (ASCII): [R, I, F, F, ..., ..., ..., ..., W, A, V, E]

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  
**Throws**:

- <code>Error</code> Invalid WAV header, expected 'WAVE'


| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.encodeHeader"></a>

### AudioWAV.encodeHeader(data) ⇒ <code>Buffer</code>
Enocdes JSON values to a valid Wave Header chunk Buffer.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>Buffer</code> - - The newley encoded `fmt ` chunk.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| data | <code>object</code> |  | The values to encode to the header chunk chunk. |
| [data.riff] | <code>string</code> | <code>&quot;&#x27;RIFF&#x27;&quot;</code> | RIFF Header, should contains the string `RIFF`, `RF64`, or `BW64` in ASCII form. |
| data.size | <code>number</code> |  | This is the size of the entire file in bytes minus 8 bytes for the 2 fields not included in this count. RF64 sets this to -1 = 0xFFFFFFFF as it doesn't use this to support larger sizes in the DS64 chunk. |
| [data.format] | <code>string</code> | <code>&quot;&#x27;WAVE&#x27;&quot;</code> | Contains the string `WAVE` in ASCII form |

<a name="AudioWAV.decodeFMT"></a>

### AudioWAV.decodeFMT(chunk) ⇒ <code>object</code>
Decode the FMT (Format) chunk.
Should be the first chunk in the data stream.

Audio Format:       2 bytes
Channels:           2 bytes
Sample Rate:        4 bytes
Byte Rate:          4 bytes
Block Align:        2 bytes
Bits per Sample     2 bytes
[Extra Param Size]  2 bytes
[Extra Params]      n bytes

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.encodeFMT"></a>

### AudioWAV.encodeFMT([data]) ⇒ <code>Buffer</code>
Enocdes JSON values to a valid `fmt ` chunk Buffer.

Defaults are set to Red Book Compact Disc Digital Audio (CDDA or CD-DA) / Audio CD standards.

RF64 specific fields are currently unsupported.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>Buffer</code> - - The newley encoded `fmt ` chunk.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [data] | <code>object</code> | <code>{}</code> | The values to encode to the `fmt ` chunk. |
| [data.audioFormat] | <code>number</code> | <code>1</code> | Format of the audio data, 1 is PCM and values other than 1 indicate some form of compression. See `decodeFMT` for a listing |
| [data.channels] | <code>number</code> | <code>2</code> | Mono = 1, Stereo = 2, etc. |
| [data.sampleRate] | <code>number</code> | <code>44100</code> | 8000, 44100, 96000, etc. |
| [data.byteRate] | <code>number</code> | <code>176400</code> | Sample Rate * Channels * Bits per Sample / 8 |
| [data.blockAlign] | <code>number</code> | <code>4</code> | The number of bytes for one sample including all channels. Channels * Bits per Sample / 8 |
| [data.bitsPerSample] | <code>number</code> | <code>16</code> | 8 bits = 8, 16 bits = 16, etc. |
| [data.extraParamSiz] | <code>number</code> | <code>0</code> | The size of the extra paramteres to follow, or 0. |
| [data.extraParams] | <code>number</code> | <code>0</code> | Any extra data to encode. |

<a name="AudioWAV.decodeLIST"></a>

### AudioWAV.decodeLIST(chunk) ⇒ <code>object</code>
Decode the LIST (LIST Information) chunk.

A LIST chunk defines a list of sub-chunks and has the following format.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.decodeLISTINFO"></a>

### AudioWAV.decodeLISTINFO(list) ⇒ <code>object</code>
Decode the LIST INFO chunks.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The parsed list.  

| Param | Type | Description |
| --- | --- | --- |
| list | <code>DataStream</code> | List DataStream |

<a name="AudioWAV.decodeLISTadtl"></a>

### AudioWAV.decodeLISTadtl(list) ⇒ <code>object</code>
Decode the LIST adtl chunks.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The parsed list.  

| Param | Type | Description |
| --- | --- | --- |
| list | <code>DataStream</code> | List DataStream |

<a name="AudioWAV.decodeDATA"></a>

### AudioWAV.decodeDATA(chunk)
Decode the data (Audio Data) chunk.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.decodeRLND"></a>

### AudioWAV.decodeRLND(chunk) ⇒ <code>object</code>
Decode the RLND (Roland) chunk.

Useful for use on SP-404 / SP-404SX / SP-404A samplers, perhaps others.

This chunk is sized and padded with zeros to ensure that the the sample data starts exactly at offset 512.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.encodeRLND"></a>

### AudioWAV.encodeRLND(data) ⇒ <code>Buffer</code>
Enocdes JSON values to a valid `RLND` (Roland) chunk Buffer.

Useful for use on SP-404 / SP-404SX / SP-404A samplers, perhaps others.

The unknown value may be an unsigned 32bit integer.

This chunk is sized and padded with zeros to ensure that the the sample data starts exactly at offset 512.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>Buffer</code> - - The new RLND chunk.  
**See**: [SP-404SX Support Page](https://www.roland.com/global/support/by_product/sp-404sx/updates_drivers/)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| data | <code>object</code> |  | The JSON values to set in the RLND chunk. |
| data.device | <code>string</code> |  | An 8 character string representing the device label. SP-404SX Wave Converter v1.01 on macOS sets this value to `roifspsx`. |
| [data.unknown1] | <code>number</code> | <code>4</code> | Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x04`. |
| [data.unknown2] | <code>number</code> | <code>0</code> | Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`. |
| [data.unknown3] | <code>number</code> | <code>0</code> | Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`. |
| [data.unknown4] | <code>number</code> | <code>0</code> | Unknown, SP-404SX Wave Converter v1.01 on macOS sets this value to `0x00`. |
| data.sampleIndex | <code>number</code> \| <code>string</code> |  | The pad the sample plays on, between `0` and `119` as a number or the pad label, `A1` - `J12`. Only the SP404SX (device === `roifspsx`) provided values can be converted from string corrently, and if it is not found it will defailt to `0` / `A1`. |

<a name="AudioWAV.decodeJUNK"></a>

### AudioWAV.decodeJUNK(chunk)
Decode the JUNK (Padding) chunk.

To align RIFF chunks to certain boundaries (i.e. 2048 bytes for CD-ROMs) the RIFF specification includes a JUNK chunk.
The contents are to be skipped when reading.
When writing RIFFs, JUNK chunks should not have an odd Size.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.decodeBEXT"></a>

### AudioWAV.decodeBEXT(chunk) ⇒ <code>object</code>
Decode the bext (Broadcast Wave Format (BWF) Broadcast Extension) chunk.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  
**See**

- [Cue Chunk](https://sites.google.com/site/musicgapi/technical-documents/wav-file-format#cue)
- [Spec](https://tech.ebu.ch/docs/tech/tech3285.pdf)


| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.decodeCue"></a>

### AudioWAV.decodeCue(chunk) ⇒ <code>object</code>
Decode the 'cue ' (Cue Points) chunk.

A cue chunk specifies one or more sample offsets which are often used to mark noteworthy sections of audio.
For example, the beginning and end of a verse in a song may have cue points to make them easier to find.
The cue chunk is optional and if included, a single cue chunk should specify all cue points for the "WAVE" chunk.
No more than one cue chunk is allowed in a "WAVE" chunk.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  
**See**: [Cue Chunk](https://sites.google.com/site/musicgapi/technical-documents/wav-file-format#cue)  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.decodeResU"></a>

### AudioWAV.decodeResU(chunk) ⇒ <code>object</code>
Decode the 'ResU' chunk, a ZIP compressed JSON Data containg Time Signature, Tempo and other data for Logic Pro X.

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |

<a name="AudioWAV.decodeDS64"></a>

### AudioWAV.decodeDS64(chunk) ⇒ <code>object</code>
DataSize 64 Parsing

**Kind**: static method of [<code>AudioWAV</code>](#AudioWAV)  
**Returns**: <code>object</code> - - The decoded values.  
**See**: [RF64: An extended File Format for Audio](https://tech.ebu.ch/docs/tech/tech3306v1_0.pdf)  

| Param | Type | Description |
| --- | --- | --- |
| chunk | <code>string</code> \| <code>Buffer</code> | Data Blob |


* * *

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```bash
npm install
npm test
DEBUG=Uttori* npm test
```

## Contributors

* [Matthew Callis](https://github.com/MatthewCallis)

## Thanks

* [Paul Battley](https://github.com/threedaymonk) - His [Roland SP-404SX sample file format](https://gist.github.com/threedaymonk/701ca30e5d363caa288986ad972ab3e0) was a huge help.

## License

* [MIT](LICENSE)
