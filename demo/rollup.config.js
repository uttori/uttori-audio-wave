import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import cleanup from 'rollup-plugin-cleanup';
import replace from '@rollup/plugin-replace';

const config = {
  input: 'demo/demo.js',
  output: {
    file: 'demo/wav.js',
    format: 'es',
    name: 'AudioWAV',
    sourcemap: false,
  },
  plugins: [
    // Replace zlib with pako for brwosers
    replace({
      "const zlib = require('zlib');": "const pako = require('pako/lib/inflate.js');",
      'zlib.inflateSync(': 'pako.inflate(',
      delimiters: ['', ''],
    }),
    nodeResolve({
      mainFields: ['module', 'main'],
    }),
    replace({
      'process.env.UTTORI_DATA_DEBUG': 'false',
      'process.env.UTTORI_AUDIOWAV_DEBUG': 'false',
      delimiters: ['', ''],
    }),
    commonjs(),
    babel(),
    cleanup({
      comments: 'none',
    }),
  ],
};

export default config;
