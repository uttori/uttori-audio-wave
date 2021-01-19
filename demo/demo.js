import AudioWAV from '../esm/index.js';

// fetch('https://localhost:8000/test/assets/A0000001.wav')
//   .then((r) => r.arrayBuffer())
//   .then((buffer) => {
//     const image = AudioWAV.fromFile(buffer);
//     image.decodePixels();
//     // eslint-disable-next-line no-console
//     console.log('Image', image);
//   });

const makeDetail = (key, value, keyClass = '', valueClass = '') => {
  const detail = document.createElement('div');
  detail.className ='detail';

  const keyNode = document.createElement('div');
  keyNode.className = `key ${keyClass}`;
  keyNode.textContent = key;

  const valueNode = document.createElement('div');
  valueNode.className = `value ${valueClass}`;
  valueNode.textContent = value;

  detail.append(keyNode);
  detail.append(valueNode);

  return detail;
};


const known = ['header', 'format', 'list', 'data', 'roland', 'display', 'broadcast_extension', 'logic_resu', 'cue_points', 'sample', 'instrument', 'trigger_list', 'data_size_64', 'acid'];
const labelType = 'Chunk Type:';
const labelSize = 'Chunk Size';

const renderChunk = (chunk) => {
  const chunkNode = document.createElement('div');
  chunkNode.className ='chunk';

  chunkNode.append(makeDetail(labelType, chunk.type, '', known.includes(chunk.type) ? 'known' : 'unknown'));
  if (chunk.value) {
    for (const [key, value] of Object.entries(chunk.value)) {
      if (Array.isArray(value))  {
        value.forEach((v) => {
          for (const [subkey, subvalue] of Object.entries(v)) {
            chunkNode.append(makeDetail(subkey, subvalue));
          }
        });
      } else {
        chunkNode.append(makeDetail(key, value));
      }
    }
  }

  document.querySelector('.chunk-list').append(chunkNode);
}

const outputChunks = (wav) => {
  const { chunks } = wav;
  document.querySelector('.chunk-list').innerHTML = '';
  chunks.forEach((chunk) => {
    console.log('Chunk:', chunk);
    renderChunk(chunk);
  });
};

document.querySelector('#wav-file').addEventListener('change', (e) => {
  const { files } = e.target;
  if (!files || files.length < 1) {
      return;
  }
  const [file] = files;
  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    const output = AudioWAV.fromFile(event.target.result);
    outputChunks(output)
  });
  reader.readAsArrayBuffer(file);
});
