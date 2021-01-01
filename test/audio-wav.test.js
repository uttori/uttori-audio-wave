const fs = require('fs');
const test = require('ava');
const { DataBuffer, DataBufferList } = require('@uttori/data-tools');
const { AudioWAV } = require('../src');

test('constructor(list, options): can initialize', (t) => {
  const data = fs.readFileSync('./test/assets/Kount Challenge November Drums.wav');
  const buffer = new DataBuffer(data);
  const list = new DataBufferList();
  list.append(buffer);

  let audio;
  t.notThrows(() => {
    audio = new AudioWAV(list, { size: data.length });
  });
  t.is(audio.chunks.length, 8);
});

test('AudioWAV.fromFile(data): can read a valid file', (t) => {
  const data = fs.readFileSync('./test/assets/Kount Challenge November Drums.wav');
  t.notThrows(() => {
    AudioWAV.fromFile(data);
  });
});

test('AudioWAV.fromBuffer(buffer): can read a valid file buffer', (t) => {
  const data = fs.readFileSync('./test/assets/Kount Challenge November Drums.wav');
  const buffer = new DataBuffer(data);
  t.notThrows(() => {
    AudioWAV.fromBuffer(buffer);
  });
});

test('AudioWAV.decodeHeader(): can detect a valid RF64 heade & decode DS64 tags', (t) => {
  const data = fs.readFileSync('./test/assets/rect_24bit_rf64.wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 4);
  t.is(audio.chunks[0].type, 'header');
  t.is(audio.chunks[1].type, 'data_size_64');
  t.is(audio.chunks[2].type, 'format');
  t.is(audio.chunks[3].type, 'data');
  t.deepEqual(audio.chunks[3].value, { duration: 0.5 });
});

test('AudioWAV.decodeHeader(): can detect a broken RIFF header', (t) => {
  const data = fs.readFileSync('./test/assets/bad_header_riff.wav');
  t.throws(() => {
    AudioWAV.fromFile(data);
  }, { message: 'Invalid WAV header, expected \'RIFF\' and got \'RIFD\'' });
});

test('AudioWAV.decodeHeader(): can detect a broken WAVE header', (t) => {
  const data = fs.readFileSync('./test/assets/bad_header_wave.wav');
  t.throws(() => {
    AudioWAV.fromFile(data);
  }, { message: 'Invalid WAV header, expected \'WAVE\' and got \'WAVF\'' });
});

test('AudioWAV.encodeHeader(data): can encode a header chunk', (t) => {
  const valid = fs.readFileSync('./test/assets/header_chunk.bin');
  const data = {
    size: 26590,
  };
  const chunk = AudioWAV.encodeHeader(data);
  t.deepEqual(chunk, valid);
});

test('AudioWAV.encodeHeader(data): can encode a header with nonsense', (t) => {
  const valid = fs.readFileSync('./test/assets/header_chunk_bad.bin');
  const data = {
    riff: 'WIFF',
    size: 26590,
    format: 'RAVE',
  };
  const chunk = AudioWAV.encodeHeader(data);
  t.deepEqual(chunk, valid);
});

test('AudioWAV.decodeChunk(): can decode an unknown chunk', (t) => {
  const data = fs.readFileSync('./test/assets/unknown_chunk.wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 2);
  t.is(audio.chunks[0].type, 'header');
  t.is(audio.chunks[1].type, 'zmt ');
});

test('AudioWAV.decodeChunk(): can decode an odd JUNK size', (t) => {
  const data = fs.readFileSync('./test/assets/odd_junk_size.wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 3);
});

test('AudioWAV.decodeLISTINFO(): can decode a LIST INFO chunk', (t) => {
  const data = fs.readFileSync('./test/assets/pluck-pcm8.wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 4);
  t.is(audio.chunks[2].type, 'list');
  t.is(audio.chunks[2].value.type, 'INFO');
});

test('AudioWAV.decodeLISTINFO(): can handle the odd chunk alignment quirk', (t) => {
  const data = fs.readFileSync('./test/assets/ODD-CHUNK-LIST-INFO.bin');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 3);
  t.is(audio.chunks[2].type, 'list');
  t.is(audio.chunks[2].value.type, 'INFO');
});

test('AudioWAV.decodeFMT(): can decode a Format chunk', (t) => {
  const data = fs.readFileSync('./test/assets/A0000001.wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 4);
  t.deepEqual(audio.chunks[1].value, {
    audioFormat: 'Microsoft Pulse Code Modulation (PCM) / Uncompressed',
    audioFormatValue: 1,
    bitsPerSample: 16,
    blockAlign: 4,
    byteRate: 176400,
    channels: 2,
    chunkID: 'fmt ',
    extraParamSize: 0,
    extraParams: new Uint8Array(),
    sampleRate: 44100,
    size: 18,
  });
  t.deepEqual(audio.chunks[3].value, { duration: 2.1818367346938774 });
});

test('AudioWAV.encodeFMT(data): can encode a fmt chunk', (t) => {
  const valid = fs.readFileSync('./test/assets/fmt_chunk.bin');
  const data = {
    audioFormatValue: 1,
    channels: 2,
    sampleRate: 44100,
    byteRate: 176400,
    blockAlign: 4,
    bitsPerSample: 16,
    extraParamSize: 0,
    extraParams: new Uint8Array(),
  };
  let chunk = AudioWAV.encodeFMT(data);
  t.deepEqual(chunk, valid);
  chunk = AudioWAV.encodeFMT();
  t.deepEqual(chunk, valid);
});

test('AudioWAV.decodeRLND(): can decode a Roland SP-404SX chunk', (t) => {
  const data = fs.readFileSync('./test/assets/J0000012.WAV');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 4);
  t.is(audio.chunks[2].type, 'roland');
  t.deepEqual(audio.chunks[2].value, {
    chunkID: 'RLND',
    device: 'roifspsx',
    sampleIndex: 119,
    sampleLabel: 'J12',
    size: 458,
    unknown1: 4,
    unknown2: 0,
    unknown3: 0,
    unknown4: 0,
  });
  t.deepEqual(audio.chunks[3].value, { duration: 0.2999546485260771 });
});

test('AudioWAV.encodeRLND(data): can encode a RLND chunk', (t) => {
  const valid = fs.readFileSync('./test/assets/rldn_chunk.bin');
  const data = { device: 'roifspsx', unknown1: 4, unknown2: 0, unknown3: 0, unknown4: 0, sampleIndex: 0 };
  let chunk = AudioWAV.encodeRLND(data);
  t.deepEqual(chunk, valid);
  chunk = AudioWAV.encodeRLND({ device: 'roifspsx', sampleIndex: 'a1' });
  t.deepEqual(chunk, valid);
});

test('AudioWAV.decodeResU(data): can read a valid ResU (Logic Pro X) chunk', (t) => {
  const data = fs.readFileSync('./test/assets/Kount Challenge November Drums.wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 8);
  t.is(audio.chunks[4].type, 'logic_resu');
  t.is(audio.chunks[4].value.data.duration, 35.17240363);
});

test('AudioWAV.decodeChunk(): can decode an acid & instrument chunk (AM - Dark (808).wav)', (t) => {
  const data = fs.readFileSync('./test/assets/AM - Dark (808).wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 9);
  t.is(audio.chunks[0].type, 'header');
  t.is(audio.chunks[1].type, 'format');
  t.is(audio.chunks[2].type, 'fact');
  t.is(audio.chunks[3].type, 'data');
  t.is(audio.chunks[4].type, 'sample');
  t.is(audio.chunks[5].type, 'instrument');
  t.deepEqual(audio.chunks[5].value, {
    unshiftedNote: 60,
    fineTuning: 0,
    gain: 0,
    lowNote: 0,
    highNote: 127,
    lowVelocity: 0,
    highVelocity: 127,
  });
  t.is(audio.chunks[6].type, 'acid');
  t.deepEqual(audio.chunks[6].value, {
    beats: 12,
    meterDenominator: 4,
    meterNumerator: 4,
    rootNote: 60,
    tempo: 0,
    type: 1,
    unknown1: 128,
    unknown2: 0,
  });
  t.is(audio.chunks[7].type, 'list');
  t.is(audio.chunks[8].type, 'list');
});

test('AudioWAV.decodeChunk(): can decode a sample chunk (AM - Heaven (808).wav)', (t) => {
  const data = fs.readFileSync('./test/assets/AM - Heaven (808).wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 5);
  t.is(audio.chunks[0].type, 'header');
  t.is(audio.chunks[1].type, 'format');
  t.is(audio.chunks[2].type, 'data');
  t.is(audio.chunks[3].type, 'sample');
  t.is(audio.chunks[4].type, 'list');
});

// https://www.yumpu.com/en/document/read/49734369/sound-forge-50-manualpdf page 362
test('AudioWAV.decodeChunk(): can decode a `tlst` chunk and an edge case LIST adtl chunk (AM - Quick (Fill).wav)', (t) => {
  const data = fs.readFileSync('./test/assets/AM - Quick (Fill).wav');
  const audio = AudioWAV.fromFile(data);
  t.is(audio.chunks.length, 8);
  t.is(audio.chunks[0].type, 'header');
  t.is(audio.chunks[1].type, 'format');
  t.is(audio.chunks[2].type, 'data');
  t.is(audio.chunks[3].type, 'sample');
  t.is(audio.chunks[4].type, 'cue_points');
  t.is(audio.chunks[5].type, 'list');
  t.is(audio.chunks[6].type, 'trigger_list');
  t.deepEqual(audio.chunks[6].value, {
    extra: 0,
    extraData: 0,
    function: 9452799,
    list: 1,
    name: 'cue ',
    triggerOn1: 1,
    triggerOn2: 0,
    triggerOn3: 0,
    triggerOn4: 0,
    type: 0,
  });
  t.is(audio.chunks[7].type, 'list');
});
