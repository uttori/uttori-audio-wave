const adler32 = (adler, buf, len, pos) => {
  let s1 = adler & 0xffff | 0,
      s2 = adler >>> 16 & 0xffff | 0,
      n = 0;
  while (len !== 0) {
    n = len > 2000 ? 2000 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
};
var adler32_1 = adler32;

const makeTable = () => {
  let c,
      table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};
const crcTable = new Uint32Array(makeTable());
const crc32 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) {
    crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 0xFF];
  }
  return crc ^ -1;
};
var crc32_1 = crc32;

const BAD = 30;
const TYPE = 12;
var inffast = function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top: do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }
    here = lcode[hold & lmask];
    dolen: for (;;) {
      op = here >>> 24
      ;
      hold >>>= op;
      bits -= op;
      op = here >>> 16 & 0xff
      ;
      if (op === 0) {
        output[_out++] = here & 0xffff
        ;
      } else if (op & 16) {
        len = here & 0xffff
        ;
        op &= 15;
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & (1 << op) - 1;
          hold >>>= op;
          bits -= op;
        }
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];
        dodist: for (;;) {
          op = here >>> 24
          ;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 0xff
          ;
          if (op & 16) {
            dist = here & 0xffff
            ;
            op &= 15;
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & (1 << op) - 1;
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break top;
            }
            hold >>>= op;
            bits -= op;
            op = _out - beg;
            if (dist > op) {
              op = dist - op;
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }
              }
              from = 0;
              from_source = s_window;
              if (wnext === 0) {
                from += wsize - op;
                if (op < len) {
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;
                  from_source = output;
                }
              } else if (wnext < op) {
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;
                    from_source = output;
                  }
                }
              } else {
                from += wnext - op;
                if (op < len) {
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            } else {
              from = _out - dist;
              do {
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          } else if ((op & 64) === 0) {
            here = dcode[(here & 0xffff) + (
            hold & (1 << op) - 1)];
            continue dodist;
          } else {
            strm.msg = 'invalid distance code';
            state.mode = BAD;
            break top;
          }
          break;
        }
      } else if ((op & 64) === 0) {
        here = lcode[(here & 0xffff) + (
        hold & (1 << op) - 1)];
        continue dolen;
      } else if (op & 32) {
        state.mode = TYPE;
        break top;
      } else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break top;
      }
      break;
    }
  } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
  return;
};

const MAXBITS = 15;
const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592;
const CODES = 0;
const LENS = 1;
const DISTS = 2;
const lbase = new Uint16Array([
3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0]);
const lext = new Uint8Array([
16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78]);
const dbase = new Uint16Array([
1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0]);
const dext = new Uint8Array([
16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64]);
const inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min = 0,
      max = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next;
  let base = null;
  let base_index = 0;
  let end;
  const count = new Uint16Array(MAXBITS + 1);
  const offs = new Uint16Array(MAXBITS + 1);
  let extra = null;
  let extra_index = 0;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) {
      break;
    }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    opts.bits = 1;
    return 0;
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) {
      break;
    }
  }
  if (root < min) {
    root = min;
  }
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }
  }
  if (left > 0 && (type === CODES || max !== 1)) {
    return -1;
  }
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  if (type === CODES) {
    base = extra = work;
    end = 19;
  } else if (type === LENS) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;
  } else {
    base = dbase;
    extra = dext;
    end = -1;
  }
  huff = 0;
  sym = 0;
  len = min;
  next = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
    return 1;
  }
  for (;;) {
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    } else {
      here_op = 32 + 64;
      here_val = 0;
    }
    incr = 1 << len - drop;
    fill = 1 << curr;
    min = fill;
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    incr = 1 << len - 1;
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    sym++;
    if (--count[len] === 0) {
      if (len === max) {
        break;
      }
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) {
        drop = root;
      }
      next += min;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) {
          break;
        }
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
        return 1;
      }
      low = huff & mask;
      table[low] = root << 24 | curr << 16 | next - table_index | 0;
    }
  }
  if (huff !== 0) {
    table[next + huff] = len - drop << 24 | 64 << 16 | 0;
  }
  opts.bits = root;
  return 0;
};
var inftrees = inflate_table;

var constants = {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  Z_BINARY: 0,
  Z_TEXT: 1,
  Z_UNKNOWN: 2,
  Z_DEFLATED: 8
};

const CODES$1 = 0;
const LENS$1 = 1;
const DISTS$1 = 2;
const {
  Z_FINISH,
  Z_BLOCK,
  Z_TREES,
  Z_OK,
  Z_STREAM_END,
  Z_NEED_DICT,
  Z_STREAM_ERROR,
  Z_DATA_ERROR,
  Z_MEM_ERROR,
  Z_BUF_ERROR,
  Z_DEFLATED
} = constants;
const HEAD = 1;
const FLAGS = 2;
const TIME = 3;
const OS = 4;
const EXLEN = 5;
const EXTRA = 6;
const NAME = 7;
const COMMENT = 8;
const HCRC = 9;
const DICTID = 10;
const DICT = 11;
const TYPE$1 = 12;
const TYPEDO = 13;
const STORED = 14;
const COPY_ = 15;
const COPY = 16;
const TABLE = 17;
const LENLENS = 18;
const CODELENS = 19;
const LEN_ = 20;
const LEN = 21;
const LENEXT = 22;
const DIST = 23;
const DISTEXT = 24;
const MATCH = 25;
const LIT = 26;
const CHECK = 27;
const LENGTH = 28;
const DONE = 29;
const BAD$1 = 30;
const MEM = 31;
const SYNC = 32;
const ENOUGH_LENS$1 = 852;
const ENOUGH_DISTS$1 = 592;
const MAX_WBITS = 15;
const DEF_WBITS = MAX_WBITS;
const zswap32 = q => {
  return (q >>> 24 & 0xff) + (q >>> 8 & 0xff00) + ((q & 0xff00) << 8) + ((q & 0xff) << 24);
};
function InflateState() {
  this.mode = 0;
  this.last = false;
  this.wrap = 0;
  this.havedict = false;
  this.flags = 0;
  this.dmax = 0;
  this.check = 0;
  this.total = 0;
  this.head = null;
  this.wbits = 0;
  this.wsize = 0;
  this.whave = 0;
  this.wnext = 0;
  this.window = null;
  this.hold = 0;
  this.bits = 0;
  this.length = 0;
  this.offset = 0;
  this.extra = 0;
  this.lencode = null;
  this.distcode = null;
  this.lenbits = 0;
  this.distbits = 0;
  this.ncode = 0;
  this.nlen = 0;
  this.ndist = 0;
  this.have = 0;
  this.next = null;
  this.lens = new Uint16Array(320);
  this.work = new Uint16Array(288);
  this.lendyn = null;
  this.distdyn = null;
  this.sane = 0;
  this.back = 0;
  this.was = 0;
}
const inflateResetKeep = strm => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR;
  }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = '';
  if (state.wrap) {
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null
  ;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS$1);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS$1);
  state.sane = 1;
  state.back = -1;
  return Z_OK;
};
const inflateReset = strm => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR;
  }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
const inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR;
  }
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
const inflateInit2 = (strm, windowBits) => {
  if (!strm) {
    return Z_STREAM_ERROR;
  }
  const state = new InflateState();
  strm.state = state;
  state.window = null
  ;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK) {
    strm.state = null
    ;
  }
  return ret;
};
const inflateInit = strm => {
  return inflateInit2(strm, DEF_WBITS);
};
let virgin = true;
let lenfix, distfix;
const fixedtables = state => {
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    let sym = 0;
    while (sym < 144) {
      state.lens[sym++] = 8;
    }
    while (sym < 256) {
      state.lens[sym++] = 9;
    }
    while (sym < 280) {
      state.lens[sym++] = 7;
    }
    while (sym < 288) {
      state.lens[sym++] = 8;
    }
    inftrees(LENS$1, state.lens, 0, 288, lenfix, 0, state.work, {
      bits: 9
    });
    sym = 0;
    while (sym < 32) {
      state.lens[sym++] = 5;
    }
    inftrees(DISTS$1, state.lens, 0, 32, distfix, 0, state.work, {
      bits: 5
    });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
const updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;
      if (state.wnext === state.wsize) {
        state.wnext = 0;
      }
      if (state.whave < state.wsize) {
        state.whave += dist;
      }
    }
  }
  return 0;
};
const inflate = (strm, flush) => {
  let state;
  let input, output;
  let next;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy;
  let from;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = new Uint8Array(4);
  let opts;
  let n;
  const order =
  new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
    return Z_STREAM_ERROR;
  }
  state = strm.state;
  if (state.mode === TYPE$1) {
    state.mode = TYPEDO;
  }
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = Z_OK;
  inf_leave:
  for (;;) {
    switch (state.mode) {
      case HEAD:
        if (state.wrap === 0) {
          state.mode = TYPEDO;
          break;
        }
        while (bits < 16) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (state.wrap & 2 && hold === 0x8b1f) {
          state.check = 0
          ;
          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
          hold = 0;
          bits = 0;
          state.mode = FLAGS;
          break;
        }
        state.flags = 0;
        if (state.head) {
          state.head.done = false;
        }
        if (!(state.wrap & 1) ||
        (((hold & 0xff) <<
        8) + (hold >> 8)) % 31) {
          strm.msg = 'incorrect header check';
          state.mode = BAD$1;
          break;
        }
        if ((hold & 0x0f) !==
        Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD$1;
          break;
        }
        hold >>>= 4;
        bits -= 4;
        len = (hold & 0x0f) +
        8;
        if (state.wbits === 0) {
          state.wbits = len;
        } else if (len > state.wbits) {
          strm.msg = 'invalid window size';
          state.mode = BAD$1;
          break;
        }
        state.dmax = 1 << state.wbits;
        strm.adler = state.check = 1
        ;
        state.mode = hold & 0x200 ? DICTID : TYPE$1;
        hold = 0;
        bits = 0;
        break;
      case FLAGS:
        while (bits < 16) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.flags = hold;
        if ((state.flags & 0xff) !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD$1;
          break;
        }
        if (state.flags & 0xe000) {
          strm.msg = 'unknown header flags set';
          state.mode = BAD$1;
          break;
        }
        if (state.head) {
          state.head.text = hold >> 8 & 1;
        }
        if (state.flags & 0x0200) {
          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
        }
        hold = 0;
        bits = 0;
        state.mode = TIME;
      case TIME:
        while (bits < 32) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (state.head) {
          state.head.time = hold;
        }
        if (state.flags & 0x0200) {
          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          hbuf[2] = hold >>> 16 & 0xff;
          hbuf[3] = hold >>> 24 & 0xff;
          state.check = crc32_1(state.check, hbuf, 4, 0);
        }
        hold = 0;
        bits = 0;
        state.mode = OS;
      case OS:
        while (bits < 16) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (state.head) {
          state.head.xflags = hold & 0xff;
          state.head.os = hold >> 8;
        }
        if (state.flags & 0x0200) {
          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
        }
        hold = 0;
        bits = 0;
        state.mode = EXLEN;
      case EXLEN:
        if (state.flags & 0x0400) {
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.length = hold;
          if (state.head) {
            state.head.extra_len = hold;
          }
          if (state.flags & 0x0200) {
            hbuf[0] = hold & 0xff;
            hbuf[1] = hold >>> 8 & 0xff;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
        } else if (state.head) {
          state.head.extra = null
          ;
        }
        state.mode = EXTRA;
      case EXTRA:
        if (state.flags & 0x0400) {
          copy = state.length;
          if (copy > have) {
            copy = have;
          }
          if (copy) {
            if (state.head) {
              len = state.head.extra_len - state.length;
              if (!state.head.extra) {
                state.head.extra = new Uint8Array(state.head.extra_len);
              }
              state.head.extra.set(input.subarray(next,
              next + copy),
              len);
            }
            if (state.flags & 0x0200) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            state.length -= copy;
          }
          if (state.length) {
            break inf_leave;
          }
        }
        state.length = 0;
        state.mode = NAME;
      case NAME:
        if (state.flags & 0x0800) {
          if (have === 0) {
            break inf_leave;
          }
          copy = 0;
          do {
            len = input[next + copy++];
            if (state.head && len && state.length < 65536
            ) {
              state.head.name += String.fromCharCode(len);
            }
          } while (len && copy < have);
          if (state.flags & 0x0200) {
            state.check = crc32_1(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) {
            break inf_leave;
          }
        } else if (state.head) {
          state.head.name = null;
        }
        state.length = 0;
        state.mode = COMMENT;
      case COMMENT:
        if (state.flags & 0x1000) {
          if (have === 0) {
            break inf_leave;
          }
          copy = 0;
          do {
            len = input[next + copy++];
            if (state.head && len && state.length < 65536
            ) {
              state.head.comment += String.fromCharCode(len);
            }
          } while (len && copy < have);
          if (state.flags & 0x0200) {
            state.check = crc32_1(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) {
            break inf_leave;
          }
        } else if (state.head) {
          state.head.comment = null;
        }
        state.mode = HCRC;
      case HCRC:
        if (state.flags & 0x0200) {
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (hold !== (state.check & 0xffff)) {
            strm.msg = 'header crc mismatch';
            state.mode = BAD$1;
            break;
          }
          hold = 0;
          bits = 0;
        }
        if (state.head) {
          state.head.hcrc = state.flags >> 9 & 1;
          state.head.done = true;
        }
        strm.adler = state.check = 0;
        state.mode = TYPE$1;
        break;
      case DICTID:
        while (bits < 32) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        strm.adler = state.check = zswap32(hold);
        hold = 0;
        bits = 0;
        state.mode = DICT;
      case DICT:
        if (state.havedict === 0) {
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          return Z_NEED_DICT;
        }
        strm.adler = state.check = 1
        ;
        state.mode = TYPE$1;
      case TYPE$1:
        if (flush === Z_BLOCK || flush === Z_TREES) {
          break inf_leave;
        }
      case TYPEDO:
        if (state.last) {
          hold >>>= bits & 7;
          bits -= bits & 7;
          state.mode = CHECK;
          break;
        }
        while (bits < 3) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.last = hold & 0x01
        ;
        hold >>>= 1;
        bits -= 1;
        switch (hold & 0x03) {
          case 0:
            state.mode = STORED;
            break;
          case 1:
            fixedtables(state);
            state.mode = LEN_;
            if (flush === Z_TREES) {
              hold >>>= 2;
              bits -= 2;
              break inf_leave;
            }
            break;
          case 2:
            state.mode = TABLE;
            break;
          case 3:
            strm.msg = 'invalid block type';
            state.mode = BAD$1;
        }
        hold >>>= 2;
        bits -= 2;
        break;
      case STORED:
        hold >>>= bits & 7;
        bits -= bits & 7;
        while (bits < 32) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if ((hold & 0xffff) !== (hold >>> 16 ^ 0xffff)) {
          strm.msg = 'invalid stored block lengths';
          state.mode = BAD$1;
          break;
        }
        state.length = hold & 0xffff;
        hold = 0;
        bits = 0;
        state.mode = COPY_;
        if (flush === Z_TREES) {
          break inf_leave;
        }
      case COPY_:
        state.mode = COPY;
      case COPY:
        copy = state.length;
        if (copy) {
          if (copy > have) {
            copy = have;
          }
          if (copy > left) {
            copy = left;
          }
          if (copy === 0) {
            break inf_leave;
          }
          output.set(input.subarray(next, next + copy), put);
          have -= copy;
          next += copy;
          left -= copy;
          put += copy;
          state.length -= copy;
          break;
        }
        state.mode = TYPE$1;
        break;
      case TABLE:
        while (bits < 14) {
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.nlen = (hold & 0x1f) +
        257;
        hold >>>= 5;
        bits -= 5;
        state.ndist = (hold & 0x1f) +
        1;
        hold >>>= 5;
        bits -= 5;
        state.ncode = (hold & 0x0f) +
        4;
        hold >>>= 4;
        bits -= 4;
        if (state.nlen > 286 || state.ndist > 30) {
          strm.msg = 'too many length or distance symbols';
          state.mode = BAD$1;
          break;
        }
        state.have = 0;
        state.mode = LENLENS;
      case LENLENS:
        while (state.have < state.ncode) {
          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.lens[order[state.have++]] = hold & 0x07;
          hold >>>= 3;
          bits -= 3;
        }
        while (state.have < 19) {
          state.lens[order[state.have++]] = 0;
        }
        state.lencode = state.lendyn;
        state.lenbits = 7;
        opts = {
          bits: state.lenbits
        };
        ret = inftrees(CODES$1, state.lens, 0, 19, state.lencode, 0, state.work, opts);
        state.lenbits = opts.bits;
        if (ret) {
          strm.msg = 'invalid code lengths set';
          state.mode = BAD$1;
          break;
        }
        state.have = 0;
        state.mode = CODELENS;
      case CODELENS:
        while (state.have < state.nlen + state.ndist) {
          for (;;) {
            here = state.lencode[hold & (1 << state.lenbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 0xff;
            here_val = here & 0xffff;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (here_val < 16) {
            hold >>>= here_bits;
            bits -= here_bits;
            state.lens[state.have++] = here_val;
          } else {
            if (here_val === 16) {
              n = here_bits + 2;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              if (state.have === 0) {
                strm.msg = 'invalid bit length repeat';
                state.mode = BAD$1;
                break;
              }
              len = state.lens[state.have - 1];
              copy = 3 + (hold & 0x03);
              hold >>>= 2;
              bits -= 2;
            } else if (here_val === 17) {
              n = here_bits + 3;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              len = 0;
              copy = 3 + (hold & 0x07);
              hold >>>= 3;
              bits -= 3;
            } else {
              n = here_bits + 7;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              len = 0;
              copy = 11 + (hold & 0x7f);
              hold >>>= 7;
              bits -= 7;
            }
            if (state.have + copy > state.nlen + state.ndist) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD$1;
              break;
            }
            while (copy--) {
              state.lens[state.have++] = len;
            }
          }
        }
        if (state.mode === BAD$1) {
          break;
        }
        if (state.lens[256] === 0) {
          strm.msg = 'invalid code -- missing end-of-block';
          state.mode = BAD$1;
          break;
        }
        state.lenbits = 9;
        opts = {
          bits: state.lenbits
        };
        ret = inftrees(LENS$1, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
        state.lenbits = opts.bits;
        if (ret) {
          strm.msg = 'invalid literal/lengths set';
          state.mode = BAD$1;
          break;
        }
        state.distbits = 6;
        state.distcode = state.distdyn;
        opts = {
          bits: state.distbits
        };
        ret = inftrees(DISTS$1, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
        state.distbits = opts.bits;
        if (ret) {
          strm.msg = 'invalid distances set';
          state.mode = BAD$1;
          break;
        }
        state.mode = LEN_;
        if (flush === Z_TREES) {
          break inf_leave;
        }
      case LEN_:
        state.mode = LEN;
      case LEN:
        if (have >= 6 && left >= 258) {
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          inffast(strm, _out);
          put = strm.next_out;
          output = strm.output;
          left = strm.avail_out;
          next = strm.next_in;
          input = strm.input;
          have = strm.avail_in;
          hold = state.hold;
          bits = state.bits;
          if (state.mode === TYPE$1) {
            state.back = -1;
          }
          break;
        }
        state.back = 0;
        for (;;) {
          here = state.lencode[hold & (1 << state.lenbits) - 1];
          here_bits = here >>> 24;
          here_op = here >>> 16 & 0xff;
          here_val = here & 0xffff;
          if (here_bits <= bits) {
            break;
          }
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (here_op && (here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >>
            last_bits)];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 0xff;
            here_val = here & 0xffff;
            if (last_bits + here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          hold >>>= last_bits;
          bits -= last_bits;
          state.back += last_bits;
        }
        hold >>>= here_bits;
        bits -= here_bits;
        state.back += here_bits;
        state.length = here_val;
        if (here_op === 0) {
          state.mode = LIT;
          break;
        }
        if (here_op & 32) {
          state.back = -1;
          state.mode = TYPE$1;
          break;
        }
        if (here_op & 64) {
          strm.msg = 'invalid literal/length code';
          state.mode = BAD$1;
          break;
        }
        state.extra = here_op & 15;
        state.mode = LENEXT;
      case LENEXT:
        if (state.extra) {
          n = state.extra;
          while (bits < n) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.length += hold & (1 << state.extra) - 1
          ;
          hold >>>= state.extra;
          bits -= state.extra;
          state.back += state.extra;
        }
        state.was = state.length;
        state.mode = DIST;
      case DIST:
        for (;;) {
          here = state.distcode[hold & (1 << state.distbits) - 1];
          here_bits = here >>> 24;
          here_op = here >>> 16 & 0xff;
          here_val = here & 0xffff;
          if (here_bits <= bits) {
            break;
          }
          if (have === 0) {
            break inf_leave;
          }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if ((here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >>
            last_bits)];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 0xff;
            here_val = here & 0xffff;
            if (last_bits + here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          hold >>>= last_bits;
          bits -= last_bits;
          state.back += last_bits;
        }
        hold >>>= here_bits;
        bits -= here_bits;
        state.back += here_bits;
        if (here_op & 64) {
          strm.msg = 'invalid distance code';
          state.mode = BAD$1;
          break;
        }
        state.offset = here_val;
        state.extra = here_op & 15;
        state.mode = DISTEXT;
      case DISTEXT:
        if (state.extra) {
          n = state.extra;
          while (bits < n) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.offset += hold & (1 << state.extra) - 1
          ;
          hold >>>= state.extra;
          bits -= state.extra;
          state.back += state.extra;
        }
        if (state.offset > state.dmax) {
          strm.msg = 'invalid distance too far back';
          state.mode = BAD$1;
          break;
        }
        state.mode = MATCH;
      case MATCH:
        if (left === 0) {
          break inf_leave;
        }
        copy = _out - left;
        if (state.offset > copy) {
          copy = state.offset - copy;
          if (copy > state.whave) {
            if (state.sane) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD$1;
              break;
            }
          }
          if (copy > state.wnext) {
            copy -= state.wnext;
            from = state.wsize - copy;
          } else {
            from = state.wnext - copy;
          }
          if (copy > state.length) {
            copy = state.length;
          }
          from_source = state.window;
        } else {
          from_source = output;
          from = put - state.offset;
          copy = state.length;
        }
        if (copy > left) {
          copy = left;
        }
        left -= copy;
        state.length -= copy;
        do {
          output[put++] = from_source[from++];
        } while (--copy);
        if (state.length === 0) {
          state.mode = LEN;
        }
        break;
      case LIT:
        if (left === 0) {
          break inf_leave;
        }
        output[put++] = state.length;
        left--;
        state.mode = LEN;
        break;
      case CHECK:
        if (state.wrap) {
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold |= input[next++] << bits;
            bits += 8;
          }
          _out -= left;
          strm.total_out += _out;
          state.total += _out;
          if (_out) {
            strm.adler = state.check =
            state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out);
          }
          _out = left;
          if ((state.flags ? hold : zswap32(hold)) !== state.check) {
            strm.msg = 'incorrect data check';
            state.mode = BAD$1;
            break;
          }
          hold = 0;
          bits = 0;
        }
        state.mode = LENGTH;
      case LENGTH:
        if (state.wrap && state.flags) {
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (hold !== (state.total & 0xffffffff)) {
            strm.msg = 'incorrect length check';
            state.mode = BAD$1;
            break;
          }
          hold = 0;
          bits = 0;
        }
        state.mode = DONE;
      case DONE:
        ret = Z_STREAM_END;
        break inf_leave;
      case BAD$1:
        ret = Z_DATA_ERROR;
        break inf_leave;
      case MEM:
        return Z_MEM_ERROR;
      case SYNC:
      default:
        return Z_STREAM_ERROR;
    }
  }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || _out !== strm.avail_out && state.mode < BAD$1 && (state.mode < CHECK || flush !== Z_FINISH)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check =
    state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out);
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE$1 ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};
const inflateEnd = strm => {
  if (!strm || !strm.state
  ) {
      return Z_STREAM_ERROR;
    }
  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK;
};
const inflateGetHeader = (strm, head) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR;
  }
  const state = strm.state;
  if ((state.wrap & 2) === 0) {
    return Z_STREAM_ERROR;
  }
  state.head = head;
  head.done = false;
  return Z_OK;
};
const inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (!strm
  || !strm.state
  ) {
      return Z_STREAM_ERROR;
    }
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR;
  }
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR;
    }
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR;
  }
  state.havedict = 1;
  return Z_OK;
};
var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2 = inflate;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = 'pako inflate (from Nodeca project)';
var inflate_1 = {
  inflateReset: inflateReset_1,
  inflateReset2: inflateReset2_1,
  inflateResetKeep: inflateResetKeep_1,
  inflateInit: inflateInit_1,
  inflateInit2: inflateInit2_1,
  inflate: inflate_2,
  inflateEnd: inflateEnd_1,
  inflateGetHeader: inflateGetHeader_1,
  inflateSetDictionary: inflateSetDictionary_1,
  inflateInfo: inflateInfo
};

const _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
var assign = function (obj
) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) {
      continue;
    }
    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }
    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }
  return obj;
};
var flattenChunks = chunks => {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var common = {
  assign: assign,
  flattenChunks: flattenChunks
};

let STR_APPLY_UIA_OK = true;
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch (__) {
  STR_APPLY_UIA_OK = false;
}
const _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
}
_utf8len[254] = _utf8len[254] = 1;
var string2buf = str => {
  let buf,
      c,
      c2,
      m_pos,
      i,
      str_len = str.length,
      buf_len = 0;
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + (c - 0xd800 << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  buf = new Uint8Array(buf_len);
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + (c - 0xd800 << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      buf[i++] = c;
    } else if (c < 0x800) {
      buf[i++] = 0xC0 | c >>> 6;
      buf[i++] = 0x80 | c & 0x3f;
    } else if (c < 0x10000) {
      buf[i++] = 0xE0 | c >>> 12;
      buf[i++] = 0x80 | c >>> 6 & 0x3f;
      buf[i++] = 0x80 | c & 0x3f;
    } else {
      buf[i++] = 0xf0 | c >>> 18;
      buf[i++] = 0x80 | c >>> 12 & 0x3f;
      buf[i++] = 0x80 | c >>> 6 & 0x3f;
      buf[i++] = 0x80 | c & 0x3f;
    }
  }
  return buf;
};
const buf2binstring = (buf, len) => {
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }
  let result = '';
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};
var buf2string = (buf, max) => {
  let i, out;
  const len = max || buf.length;
  const utf16buf = new Array(len * 2);
  for (out = 0, i = 0; i < len;) {
    let c = buf[i++];
    if (c < 0x80) {
      utf16buf[out++] = c;
      continue;
    }
    let c_len = _utf8len[c];
    if (c_len > 4) {
      utf16buf[out++] = 0xfffd;
      i += c_len - 1;
      continue;
    }
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
    while (c_len > 1 && i < len) {
      c = c << 6 | buf[i++] & 0x3f;
      c_len--;
    }
    if (c_len > 1) {
      utf16buf[out++] = 0xfffd;
      continue;
    }
    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | c >> 10 & 0x3ff;
      utf16buf[out++] = 0xdc00 | c & 0x3ff;
    }
  }
  return buf2binstring(utf16buf, out);
};
var utf8border = (buf, max) => {
  max = max || buf.length;
  if (max > buf.length) {
    max = buf.length;
  }
  let pos = max - 1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) {
    pos--;
  }
  if (pos < 0) {
    return max;
  }
  if (pos === 0) {
    return max;
  }
  return pos + _utf8len[buf[pos]] > max ? pos : max;
};
var strings = {
  string2buf: string2buf,
  buf2string: buf2string,
  utf8border: utf8border
};

var messages = {
  2: 'need dictionary',
  1: 'stream end',
  0: '',
  '-1': 'file error',
  '-2': 'stream error',
  '-3': 'data error',
  '-4': 'insufficient memory',
  '-5': 'buffer error',
  '-6': 'incompatible version'
};

function ZStream() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = ''
  ;
  this.state = null;
  this.data_type = 2
  ;
  this.adler = 0;
}
var zstream = ZStream;

function GZheader() {
  this.text = 0;
  this.time = 0;
  this.xflags = 0;
  this.os = 0;
  this.extra = null;
  this.extra_len = 0;
  this.name = '';
  this.comment = '';
  this.hcrc = 0;
  this.done = false;
}
var gzheader = GZheader;

const toString = Object.prototype.toString;
const {
  Z_NO_FLUSH,
  Z_FINISH: Z_FINISH$1,
  Z_OK: Z_OK$1,
  Z_STREAM_END: Z_STREAM_END$1,
  Z_NEED_DICT: Z_NEED_DICT$1,
  Z_STREAM_ERROR: Z_STREAM_ERROR$1,
  Z_DATA_ERROR: Z_DATA_ERROR$1,
  Z_MEM_ERROR: Z_MEM_ERROR$1
} = constants;
function Inflate(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ''
  }, options || {});
  const opt = this.options;
  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) {
      opt.windowBits = -15;
    }
  }
  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if (opt.windowBits > 15 && opt.windowBits < 48) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }
  this.err = 0;
  this.msg = '';
  this.ended = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = inflate_1.inflateInit2(this.strm, opt.windowBits);
  if (status !== Z_OK$1) {
    throw new Error(messages[status]);
  }
  this.header = new gzheader();
  inflate_1.inflateGetHeader(this.strm, this.header);
  if (opt.dictionary) {
    if (typeof opt.dictionary === 'string') {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) {
      status = inflate_1.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK$1) {
        throw new Error(messages[status]);
      }
    }
  }
}
Inflate.prototype.push = function (data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;
  if (this.ended) return false;
  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;else _flush_mode = flush_mode === true ? Z_FINISH$1 : Z_NO_FLUSH;
  if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (;;) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = inflate_1.inflate(strm, _flush_mode);
    if (status === Z_NEED_DICT$1 && dictionary) {
      status = inflate_1.inflateSetDictionary(strm, dictionary);
      if (status === Z_OK$1) {
        status = inflate_1.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR$1) {
        status = Z_NEED_DICT$1;
      }
    }
    while (strm.avail_in > 0 && status === Z_STREAM_END$1 && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
      inflate_1.inflateReset(strm);
      status = inflate_1.inflate(strm, _flush_mode);
    }
    switch (status) {
      case Z_STREAM_ERROR$1:
      case Z_DATA_ERROR$1:
      case Z_NEED_DICT$1:
      case Z_MEM_ERROR$1:
        this.onEnd(status);
        this.ended = true;
        return false;
    }
    last_avail_out = strm.avail_out;
    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END$1) {
        if (this.options.to === 'string') {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }
    if (status === Z_OK$1 && last_avail_out === 0) continue;
    if (status === Z_STREAM_END$1) {
      status = inflate_1.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }
    if (strm.avail_in === 0) break;
  }
  return true;
};
Inflate.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};
Inflate.prototype.onEnd = function (status) {
  if (status === Z_OK$1) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function inflate$1(input, options) {
  const inflator = new Inflate(options);
  inflator.push(input);
  if (inflator.err) throw inflator.msg || messages[inflator.err];
  return inflator.result;
}
function inflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}
var Inflate_1 = Inflate;
var inflate_2$1 = inflate$1;
var inflateRaw_1 = inflateRaw;
var ungzip = inflate$1;
var constants$1 = constants;
var inflate_1$1 = {
  Inflate: Inflate_1,
  inflate: inflate_2$1,
  inflateRaw: inflateRaw_1,
  ungzip: ungzip,
  constants: constants$1
};

class DataBuffer {
  constructor(input) {
    if (!input) {
      const error = 'Missing input data.';
      throw new TypeError(error);
    }
    if (typeof Buffer !== 'undefined' && (Buffer.isBuffer(input) || typeof input === 'string')) {
      this.data = Buffer.from(input);
    } else if (input instanceof Uint8Array) {
      this.data = input;
    } else if (input instanceof ArrayBuffer) {
      this.data = new Uint8Array(input);
    } else if (Array.isArray(input)) {
      this.data = new Uint8Array(input);
    } else if (typeof input === 'number') {
      this.data = new Uint8Array(input);
    } else if (input instanceof DataBuffer) {
      this.data = input.data;
    } else if (input.buffer instanceof ArrayBuffer) {
      this.data = new Uint8Array(input.buffer, input.byteOffset, input.length * input.BYTES_PER_ELEMENT);
    } else {
      const error = `Unknown type of input for DataBuffer: ${typeof input}`;
      throw new TypeError(error);
    }
    this.length = this.data.length;
    this.next = null;
    this.prev = null;
  }
  static allocate(size) {
    return new DataBuffer(size);
  }
  compare(input, offset = 0) {
    const buffer = new DataBuffer(input);
    const {
      length
    } = buffer;
    if (!length) {
      return false;
    }
    const local = this.slice(offset, length);
    const {
      data
    } = buffer;
    for (let i = 0; i < length; i++) {
      if (local.data[i] !== data[i]) {
        return false;
      }
    }
    return true;
  }
  copy() {
    return new DataBuffer(new Uint8Array(this.data));
  }
  slice(position, length = this.length) {
    if (position === 0 && length >= this.length) {
      return new DataBuffer(this.data);
    }
    return new DataBuffer(this.data.subarray(position, position + length));
  }
}
var dataBuffer = DataBuffer;

let debug = () => {};
class DataBufferList {
  constructor() {
    this.first = null;
    this.last = null;
    this.totalBuffers = 0;
    this.availableBytes = 0;
    this.availableBuffers = 0;
  }
  copy() {
    const result = new DataBufferList();
    result.first = this.first;
    result.last = this.last;
    result.totalBuffers = this.totalBuffers;
    result.availableBytes = this.availableBytes;
    result.availableBuffers = this.availableBuffers;
    return result;
  }
  append(buffer) {
    buffer.prev = this.last;
    if (this.last) {
      this.last.next = buffer;
    }
    this.last = buffer;
    if (this.first == null) {
      this.first = buffer;
    }
    this.availableBytes += buffer.length;
    this.availableBuffers++;
    this.totalBuffers++;
    debug('append:', this.totalBuffers);
    return this.totalBuffers;
  }
  moreAvailable() {
    if (this.first && this.first.next != null) {
      return true;
    }
    return false;
  }
  advance() {
    if (this.first) {
      this.availableBytes -= this.first.length;
      this.availableBuffers--;
    }
    if (this.first && this.first.next) {
      this.first = this.first.next;
      return true;
    }
    this.first = null;
    return false;
  }
  rewind() {
    if (this.first && !this.first.prev) {
      return false;
    }
    this.first = this.first ? this.first.prev : this.last;
    if (this.first) {
      this.availableBytes += this.first.length;
      this.availableBuffers++;
    }
    return this.first != null;
  }
  reset() {
    while (this.rewind()) {
      continue;
    }
  }
}
var dataBufferList = DataBufferList;

let debug$1 = () => {};
class UnderflowError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnderflowError';
    this.stack = new Error(message).stack;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
class DataStream {
  constructor(list, options = {}) {
    options.size = options.size || 16;
    if (options && options.size % 8 !== 0) {
      options.size += 8 - options.size % 8;
    }
    this.size = options.size;
    this.buf = new ArrayBuffer(this.size);
    this.uint8 = new Uint8Array(this.buf);
    this.int8 = new Int8Array(this.buf);
    this.uint16 = new Uint16Array(this.buf);
    this.int16 = new Int16Array(this.buf);
    this.uint32 = new Uint32Array(this.buf);
    this.int32 = new Int32Array(this.buf);
    this.float32 = new Float32Array(this.buf);
    this.float64 = new Float64Array(this.buf);
    this.int64 = new BigInt64Array(this.buf);
    this.uint64 = new BigUint64Array(this.buf);
    this.nativeEndian = new Uint16Array(new Uint8Array([0x12, 0x34]).buffer)[0] === 0x3412;
    this.list = list;
    this.localOffset = 0;
    this.offset = 0;
  }
  static fromData(data) {
    const buffer = new dataBuffer(data);
    const list = new dataBufferList();
    list.append(buffer);
    return new DataStream(list, {
      size: buffer.length
    });
  }
  static fromBuffer(buffer) {
    const list = new dataBufferList();
    list.append(buffer);
    return new DataStream(list, {
      size: buffer.length
    });
  }
  compare(input, offset = 0) {
    if (!input || !input.list || !input.list.availableBytes) {
      return false;
    }
    let {
      availableBytes
    } = input.list;
    if (offset) {
      availableBytes -= offset;
      this.seek(offset);
      input.seek(offset);
    }
    let local;
    let external;
    for (let i = 0; i < availableBytes; i++) {
      local = this.readUInt8();
      external = input.readUInt8();
      if (local !== external) {
        return false;
      }
    }
    return true;
  }
  next(input) {
    if (!input || typeof input.length !== 'number' || input.length === 0) {
      return false;
    }
    if (!this.available(input.length)) {
      debug$1(`Insufficient Bytes: ${input.length} <= ${this.remainingBytes()}`);
      return false;
    }
    debug$1('next: this.offset =', this.offset);
    for (let i = 0; i < input.length; i++) {
      const data = this.peekUInt8(this.offset + i);
      if (input[i] !== data) {
        debug$1('next: first failed match at', i, ', where:', input[i]);
        return false;
      }
    }
    return true;
  }
  copy() {
    const result = new DataStream(this.list.copy(), {
      size: this.size
    });
    result.localOffset = this.localOffset;
    result.offset = this.offset;
    return result;
  }
  available(bytes) {
    return bytes <= this.remainingBytes();
  }
  availableAt(bytes, offset) {
    return bytes <= this.list.availableBytes - offset;
  }
  remainingBytes() {
    return this.list.availableBytes - this.localOffset;
  }
  advance(bytes) {
    if (!this.available(bytes)) {
      throw new UnderflowError(`Insufficient Bytes: ${bytes} <= ${this.remainingBytes()}`);
    }
    this.localOffset += bytes;
    this.offset += bytes;
    while (this.list.first && this.localOffset >= this.list.first.length && this.list.moreAvailable()) {
      this.localOffset -= this.list.first.length;
      this.list.advance();
    }
    return this;
  }
  rewind(bytes) {
    if (bytes > this.offset) {
      throw new UnderflowError(`Insufficient Bytes: ${bytes} > ${this.offset}`);
    }
    this.localOffset -= bytes;
    this.offset -= bytes;
    while (this.list.first.prev && this.localOffset < 0) {
      this.list.rewind();
      this.localOffset += this.list.first.length;
    }
    return this;
  }
  seek(position) {
    if (position > this.offset) {
      return this.advance(position - this.offset);
    }
    if (position < this.offset) {
      return this.rewind(this.offset - position);
    }
    return this;
  }
  readUInt8() {
    if (!this.available(1)) {
      throw new UnderflowError('Insufficient Bytes: 1');
    }
    const output = this.list.first.data[this.localOffset];
    this.localOffset += 1;
    this.offset += 1;
    if (this.localOffset === this.list.first.length) {
      this.localOffset = 0;
      this.list.advance();
    }
    return output;
  }
  peekUInt8(offset = 0) {
    if (!this.availableAt(1, offset)) {
      throw new UnderflowError(`Insufficient Bytes: ${offset} + 1`);
    }
    let buffer = this.list.first;
    while (buffer) {
      if (buffer.length > offset) {
        return buffer.data[offset];
      }
      offset -= buffer.length;
      buffer = buffer.next;
    }
    return 0;
  }
  read(bytes, littleEndian = false) {
    if (littleEndian === this.nativeEndian) {
      for (let i = 0; i < bytes; i++) {
        this.uint8[i] = this.readUInt8();
      }
    } else {
      for (let i = bytes - 1; i >= 0; i--) {
        this.uint8[i] = this.readUInt8();
      }
    }
    const output = this.uint8.slice(0, bytes);
    return output;
  }
  peek(bytes, offset = 0, littleEndian = false) {
    if (littleEndian === this.nativeEndian) {
      for (let i = 0; i < bytes; i++) {
        this.uint8[i] = this.peekUInt8(offset + i);
      }
    } else {
      for (let i = 0; i < bytes; i++) {
        this.uint8[bytes - i - 1] = this.peekUInt8(offset + i);
      }
    }
    const output = this.uint8.slice(0, bytes);
    return output;
  }
  peekBit(position, length = 1, offset = 0) {
    if (Number.isNaN(position) || !Number.isInteger(position) || position < 0 || position > 7) {
      throw new Error(`peekBit position is invalid: ${position}, must be an Integer between 0 and 7`);
    }
    if (Number.isNaN(length) || !Number.isInteger(length) || length < 1 || length > 8) {
      throw new Error(`peekBit length is invalid: ${length}, must be an Integer between 1 and 8`);
    }
    const value = this.peekUInt8(offset);
    return (value << position & 0xFF) >>> 8 - length;
  }
  readInt8() {
    this.read(1);
    return this.int8[0];
  }
  peekInt8(offset = 0) {
    this.peek(1, offset);
    return this.int8[0];
  }
  readUInt16(littleEndian) {
    this.read(2, littleEndian);
    return this.uint16[0];
  }
  peekUInt16(offset = 0, littleEndian = false) {
    this.peek(2, offset, littleEndian);
    return this.uint16[0];
  }
  readInt16(littleEndian = false) {
    this.read(2, littleEndian);
    return this.int16[0];
  }
  peekInt16(offset = 0, littleEndian = false) {
    this.peek(2, offset, littleEndian);
    return this.int16[0];
  }
  readUInt24(littleEndian = false) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readUInt8() << 16);
    }
    return (this.readUInt16() << 8) + this.readUInt8();
  }
  peekUInt24(offset = 0, littleEndian = false) {
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekUInt8(offset + 2) << 16);
    }
    return (this.peekUInt16(offset) << 8) + this.peekUInt8(offset + 2);
  }
  readInt24(littleEndian = false) {
    if (littleEndian) {
      return this.readUInt16(true) + (this.readInt8() << 16);
    }
    return (this.readInt16() << 8) + this.readUInt8();
  }
  peekInt24(offset = 0, littleEndian = false) {
    if (littleEndian) {
      return this.peekUInt16(offset, true) + (this.peekInt8(offset + 2) << 16);
    }
    return (this.peekInt16(offset) << 8) + this.peekUInt8(offset + 2);
  }
  readUInt32(littleEndian = false) {
    this.read(4, littleEndian);
    return this.uint32[0];
  }
  peekUInt32(offset = 0, littleEndian = false) {
    this.peek(4, offset, littleEndian);
    return this.uint32[0];
  }
  readInt32(littleEndian = false) {
    this.read(4, littleEndian);
    return this.int32[0];
  }
  peekInt32(offset = 0, littleEndian = false) {
    this.peek(4, offset, littleEndian);
    return this.int32[0];
  }
  readFloat32(littleEndian = false) {
    this.read(4, littleEndian);
    return this.float32[0];
  }
  peekFloat32(offset = 0, littleEndian = false) {
    this.peek(4, offset, littleEndian);
    return this.float32[0];
  }
  readFloat48(littleEndian = false) {
    this.read(6, littleEndian);
    return this.float48();
  }
  peekFloat48(offset, littleEndian = false) {
    this.peek(6, offset, littleEndian);
    return this.float48();
  }
  readFloat64(littleEndian = false) {
    this.read(8, littleEndian);
    return this.float64[0];
  }
  peekFloat64(offset = 0, littleEndian = false) {
    this.peek(8, offset, littleEndian);
    return this.float64[0];
  }
  readFloat80(littleEndian = false) {
    this.read(10, littleEndian);
    return this.float80();
  }
  peekFloat80(offset = 0, littleEndian = false) {
    this.peek(10, offset, littleEndian);
    return this.float80();
  }
  readBuffer(length) {
    const result = dataBuffer.allocate(length);
    const to = result.data;
    for (let i = 0; i < length; i++) {
      to[i] = this.readUInt8();
    }
    return result;
  }
  peekBuffer(offset, length) {
    const result = dataBuffer.allocate(length);
    const to = result.data;
    for (let i = 0; i < length; i++) {
      to[i] = this.peekUInt8(offset + i);
    }
    return result;
  }
  readSingleBuffer(length) {
    const result = this.list.first.slice(this.localOffset, length);
    this.advance(result.length);
    return result;
  }
  peekSingleBuffer(offset, length) {
    return this.list.first.slice(this.localOffset + offset, length);
  }
  readString(length, encoding = 'ascii') {
    return this.decodeString(this.offset, length, encoding, true);
  }
  peekString(offset, length, encoding = 'ascii') {
    return this.decodeString(offset, length, encoding, false);
  }
  float48() {
    let mantissa = 0;
    let exponent = this.uint8[0];
    if (exponent === 0) {
      return 0;
    }
    exponent = this.uint8[0] - 0x81;
    for (let i = 1; i <= 4; i++) {
      mantissa += this.uint8[i];
      mantissa /= 256;
    }
    mantissa += this.uint8[5] & 0x7F;
    mantissa /= 128;
    mantissa += 1;
    if (this.uint8[5] & 0x80) {
      mantissa = -mantissa;
    }
    const output = mantissa * 2 ** exponent;
    return Number.parseFloat(output.toFixed(4));
  }
  float80() {
    const [high, low] = [...this.uint32];
    const a0 = this.uint8[9];
    const a1 = this.uint8[8];
    const sign = 1 - (a0 >>> 7) * 2;
    let exponent = (a0 & 0x7F) << 8 | a1;
    if (exponent === 0 && low === 0 && high === 0) {
      return 0;
    }
    if (exponent === 0x7FFF) {
      if (low === 0 && high === 0) {
        return sign * Number.POSITIVE_INFINITY;
      }
      return Number.NaN;
    }
    exponent -= 0x3FFF;
    let out = low * 2 ** (exponent - 31);
    out += high * 2 ** (exponent - 63);
    return sign * out;
  }
  reset() {
    this.localOffset = 0;
    this.offset = 0;
  }
  decodeString(offset, length, encoding, advance) {
    encoding = encoding.toLowerCase();
    const nullEnd = length === null ? 0 : -1;
    if (!length) {
      length = this.remainingBytes();
    }
    const end = offset + length;
    let result = '';
    switch (encoding) {
      case 'ascii':
      case 'latin1':
        {
          while (offset < end) {
            const char = this.peekUInt8(offset++);
            if (char === nullEnd) {
              break;
            }
            result += String.fromCharCode(char);
          }
          break;
        }
      case 'utf8':
      case 'utf-8':
        {
          while (offset < end) {
            const b1 = this.peekUInt8(offset++);
            if (b1 === nullEnd) {
              break;
            }
            let b2;
            let b3;
            if ((b1 & 0x80) === 0) {
              result += String.fromCharCode(b1);
            } else if ((b1 & 0xE0) === 0xC0) {
              b2 = this.peekUInt8(offset++) & 0x3F;
              result += String.fromCharCode((b1 & 0x1F) << 6 | b2);
            } else if ((b1 & 0xF0) === 0xE0) {
              b2 = this.peekUInt8(offset++) & 0x3F;
              b3 = this.peekUInt8(offset++) & 0x3F;
              result += String.fromCharCode((b1 & 0x0F) << 12 | b2 << 6 | b3);
            } else if ((b1 & 0xF8) === 0xF0) {
              b2 = this.peekUInt8(offset++) & 0x3F;
              b3 = this.peekUInt8(offset++) & 0x3F;
              const b4 = this.peekUInt8(offset++) & 0x3F;
              const pt = ((b1 & 0x0F) << 18 | b2 << 12 | b3 << 6 | b4) - 0x10000;
              result += String.fromCharCode(0xD800 + (pt >> 10), 0xDC00 + (pt & 0x3FF));
            }
          }
          break;
        }
      case 'utf16-be':
      case 'utf16be':
      case 'utf16le':
      case 'utf16-le':
      case 'utf16bom':
      case 'utf16-bom':
        {
          let littleEndian;
          switch (encoding) {
            case 'utf16be':
            case 'utf16-be':
              {
                littleEndian = false;
                break;
              }
            case 'utf16le':
            case 'utf16-le':
              {
                littleEndian = true;
                break;
              }
            case 'utf16bom':
            case 'utf16-bom':
            default:
              {
                const bom = this.peekUInt16(offset);
                if (length < 2 || bom === nullEnd) {
                  if (advance) {
                    this.advance(offset += 2);
                  }
                  return result;
                }
                littleEndian = bom === 0xFFFE;
                offset += 2;
                break;
              }
          }
          let w1;
          while (offset < end && (w1 = this.peekUInt16(offset, littleEndian)) !== nullEnd) {
            offset += 2;
            if (w1 < 0xD800 || w1 > 0xDFFF) {
              result += String.fromCharCode(w1);
            } else {
              const w2 = this.peekUInt16(offset, littleEndian);
              if (w2 < 0xDC00 || w2 > 0xDFFF) {
                throw new Error('Invalid utf16 sequence.');
              }
              result += String.fromCharCode(w1, w2);
              offset += 2;
            }
          }
          if (w1 === nullEnd) {
            offset += 2;
          }
          break;
        }
      default:
        {
          throw new Error(`Unknown encoding: ${encoding}`);
        }
    }
    if (advance) {
      this.advance(length);
    }
    return result;
  }
}
var dataStream = DataStream;

let debug$2 = () => {};
class AudioWAV extends dataStream {
  constructor(list, overrides, opts) {
    const options = {
      size: 16,
      ...overrides
    };
    super(list, options);
    this.chunks = [];
    this.options = {
      roundOddChunks: true,
      ...opts
    };
    this.parse();
  }
  static fromFile(data, options) {
    debug$2('fromFile:', data.length, data.byteLength);
    const buffer = new dataBuffer(data);
    const list = new dataBufferList();
    list.append(buffer);
    return new AudioWAV(list, {
      size: buffer.length
    }, options);
  }
  static fromBuffer(buffer, options) {
    debug$2('fromBuffer:', buffer.length);
    const list = new dataBufferList();
    list.append(buffer);
    return new AudioWAV(list, {
      size: buffer.length
    }, options);
  }
  parse() {
    const chunk = this.read(12, true);
    const value = AudioWAV.decodeHeader(chunk);
    this.chunks.push({
      type: 'header',
      value
    });
    while (this.remainingBytes()) {
      try {
        this.decodeChunk();
      } catch (error) {
        console.error(error);
      }
    }
  }
  static decodeHeader(chunk) {
    const header = dataStream.fromData(chunk);
    const chunkID = header.readString(4);
    if (!['RIFF', 'RF64', 'BW64'].includes(chunkID)) {
      throw new Error(`Invalid WAV header, expected 'RIFF', 'RF64', or 'BW64' and got '${chunkID}'`);
    }
    const size = header.readUInt32(true);
    const format = header.readString(4);
    if (format !== 'WAVE') {
      throw new Error(`Invalid WAV header, expected 'WAVE' and got '${format}'`);
    }
    return {
      chunkID,
      size,
      format
    };
  }
  static encodeHeader(data) {
    const {
      riff = 'RIFF',
      size,
      format = 'WAVE'
    } = data;
    const header = Buffer.alloc(12);
    header.write(riff, 0);
    header.writeUInt32LE(size, 4);
    header.write(format, 8);
    return header;
  }
  decodeChunk() {
    debug$2('decodeChunk at offset', this.offset, 'with', this.remainingBytes());
    const type = this.readString(4);
    let size = this.readUInt32(true);
    if (size < 0) {
      throw new Error(`Invalid SubChunk Size: ${0xFFFFFFFF & size}`);
    }
    if (this.options.roundOddChunks && size % 2 !== 0) {
      size += 1;
    }
    if (size > this.remainingBytes()) {
      debug$2('decodeChunk size', size, 'too large, using remaining bytes', this.remainingBytes());
      size = this.remainingBytes();
    }
    switch (type) {
      case 'fmt ':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeFMT(chunk);
          this.chunks.push({
            type: 'format',
            value,
            chunk
          });
          break;
        }
      case 'fact':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeFACT(chunk);
          this.chunks.push({
            type: 'fact',
            value,
            chunk
          });
          break;
        }
      case 'inst':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeINST(chunk);
          this.chunks.push({
            type: 'instrument',
            value,
            chunk
          });
          break;
        }
      case 'DISP':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeDISP(chunk);
          this.chunks.push({
            type: 'display',
            value,
            chunk
          });
          break;
        }
      case 'smpl':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeSMPL(chunk);
          this.chunks.push({
            type: 'sample',
            value,
            chunk
          });
          break;
        }
      case 'tlst':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeTLST(chunk);
          this.chunks.push({
            type: 'trigger_list',
            value,
            chunk
          });
          break;
        }
      case 'data':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          AudioWAV.decodeDATA(chunk);
          const format = this.chunks.find(c => c.type === 'format');
          const duration = size / format.value.byteRate;
          this.chunks.push({
            type: 'data',
            chunk,
            value: {
              duration
            }
          });
          break;
        }
      case 'LIST':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeLIST(chunk);
          this.chunks.push({
            type: 'list',
            value,
            chunk
          });
          break;
        }
      case 'RLND':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeRLND(chunk);
          this.chunks.push({
            type: 'roland',
            value,
            chunk
          });
          break;
        }
      case 'JUNK':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          AudioWAV.decodeJUNK(chunk, this.options);
          this.chunks.push({
            type: 'junk',
            chunk
          });
          break;
        }
      case 'acid':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeACID(chunk);
          this.chunks.push({
            type: 'acid',
            value,
            chunk
          });
          break;
        }
      case 'cue ':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeCue(chunk);
          this.chunks.push({
            type: 'cue_points',
            value,
            chunk
          });
          break;
        }
      case 'bext':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeBEXT(chunk, this.options);
          this.chunks.push({
            type: 'broadcast_extension',
            value,
            chunk
          });
          break;
        }
      case 'ResU':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeResU(chunk);
          this.chunks.push({
            type: 'logic_resu',
            value,
            chunk
          });
          break;
        }
      case 'ds64':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          const value = AudioWAV.decodeDS64(chunk);
          this.chunks.push({
            type: 'data_size_64',
            value,
            chunk
          });
          break;
        }
      case 'cart':
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          this.chunks.push({
            type: 'cart',
            chunk,
            unknown: true
          });
          break;
        }
      default:
        {
          this.rewind(8);
          const chunk = this.read(8 + size, true);
          this.chunks.push({
            type,
            chunk,
            unknown: true
          });
          break;
        }
    }
    return type;
  }
  static decodeFMT(chunk) {
    const format = dataStream.fromData(chunk);
    const chunkID = format.readString(4);
    const size = format.readUInt32(true);
    const audioFormatValue = format.readUInt16(true);
    let audioFormat = '';
    switch (audioFormatValue) {
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
    const channels = format.readUInt16(true);
    const sampleRate = format.readUInt32(true);
    const byteRate = format.readUInt32(true);
    const blockAlign = format.readUInt16(true);
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
      bitsPerSample
    };
    if (format.remainingBytes()) {
      value.extraParamSize = format.readUInt16(true);
      if (audioFormat === 0xFFFE) {
        value.validBitsPerSample = format.readUInt16(true);
        value.channelMask = format.readUInt32(true);
        switch (value.channelMask) {
          case 0x00000001:
            {
              value.channelMaskLabel = 'speaker_front_left';
              break;
            }
          case 0x00000002:
            {
              value.channelMaskLabel = 'speaker_front_right';
              break;
            }
          case 0x00000004:
            {
              value.channelMaskLabel = 'speaker_front_center';
              break;
            }
          case 0x00000008:
            {
              value.channelMaskLabel = 'speaker_low_frequency';
              break;
            }
          case 0x00000010:
            {
              value.channelMaskLabel = 'speaker_back_left';
              break;
            }
          case 0x00000020:
            {
              value.channelMaskLabel = 'speaker_back_right';
              break;
            }
          case 0x00000040:
            {
              value.channelMaskLabel = 'speaker_front_left_of_center';
              break;
            }
          case 0x00000080:
            {
              value.channelMaskLabel = 'speaker_front_right_of_center';
              break;
            }
          case 0x00000100:
            {
              value.channelMaskLabel = 'speaker_back_center';
              break;
            }
          case 0x00000200:
            {
              value.channelMaskLabel = 'speaker_side_left';
              break;
            }
          case 0x00000400:
            {
              value.channelMaskLabel = 'speaker_side_right';
              break;
            }
          case 0x00000800:
            {
              value.channelMaskLabel = 'speaker_top_center';
              break;
            }
          case 0x00001000:
            {
              value.channelMaskLabel = 'speaker_top_front_left';
              break;
            }
          case 0x00002000:
            {
              value.channelMaskLabel = 'speaker_top_front_center';
              break;
            }
          case 0x00004000:
            {
              value.channelMaskLabel = 'speaker_top_front_right';
              break;
            }
          case 0x00008000:
            {
              value.channelMaskLabel = 'speaker_top_back_left';
              break;
            }
          case 0x00010000:
            {
              value.channelMaskLabel = 'speaker_top_back_center';
              break;
            }
          case 0x00020000:
            {
              value.channelMaskLabel = 'speaker_top_back_right';
              break;
            }
          case 0x80000000:
            {
              value.channelMaskLabel = 'speaker_all';
              break;
            }
          default:
            {
              value.channelMaskLabel = `unknown_${value.channelMask}`;
            }
        }
        value.subFormat_1 = format.readUInt32(true);
        value.subFormat_2 = format.readUInt16(true);
        value.subFormat_3 = format.readUInt16(true);
        value.subFormat_4 = format.readUInt32(true);
        value.subFormat_5 = format.readUInt32(true);
      } else {
        value.extraParams = format.read(value.extraParamSize, true);
      }
    }
    debug$2('decodeFMT =', JSON.stringify(value, null, 2));
    return value;
  }
  static encodeFMT(data = {}) {
    const {
      audioFormatValue = 1,
      channels = 2,
      sampleRate = 44100,
      byteRate = 176400,
      blockAlign = 4,
      bitsPerSample = 16,
      extraParamSize = 0,
      extraParams = 0
    } = data;
    const buffer = Buffer.alloc(26 + extraParamSize, 0);
    buffer.write('fmt ', 0);
    buffer.writeUInt32LE(26 - 8 + extraParamSize, 4);
    buffer.writeUInt16LE(audioFormatValue, 8);
    buffer.writeUInt16LE(channels, 10);
    buffer.writeUInt32LE(sampleRate, 12);
    buffer.writeUInt32LE(byteRate, 16);
    buffer.writeUInt16LE(blockAlign, 20);
    buffer.writeUInt16LE(bitsPerSample, 22);
    buffer.writeUInt16LE(extraParamSize, 24);
    if (extraParamSize > 0 && extraParams) {
      buffer.fill(0, 26, 26 + extraParamSize);
      buffer.write(extraParams, 26);
    }
    debug$2('Buffer:', buffer.toString('hex'));
    return buffer;
  }
  static decodeLIST(chunk) {
    const list = dataStream.fromData(chunk);
    const chunkID = list.readString(4);
    const size = list.readUInt32(true);
    const type = list.readString(4);
    const value = {
      chunkID,
      size,
      type
    };
    switch (type) {
      case 'INFO':
        {
          value.data = AudioWAV.decodeLISTINFO(list);
          break;
        }
      case 'adtl':
        {
          value.data = AudioWAV.decodeLISTadtl(list);
          break;
        }
    }
    debug$2('decodeLIST =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeLISTINFO(list) {
    const value = [];
    while (list.remainingBytes()) {
      const info = {};
      info.id = list.readString(4);
      info.size = list.readUInt32(true);
      info.text = list.readString(info.size);
      if (info.size % 2 !== 0) {
        list.advance(1);
      }
      value.push(info);
    }
    return value;
  }
  static decodeLISTadtl(list) {
    const value = [];
    while (list.remainingBytes()) {
      const adtl = {};
      adtl.id = list.readString(4);
      adtl.size = list.readUInt32(true);
      switch (adtl.id) {
        case 'labl':
          {
            adtl.label = list.readString(adtl.size).trim();
            break;
          }
        case 'ltxt':
          {
            adtl.ltxt = list.readString(adtl.size).trim();
            break;
          }
        default:
          {
            list.advance(adtl.size);
          }
      }
      value.push(adtl);
    }
    return value;
  }
  static decodeDATA(chunk) {
    debug$2(`decodeDATA: ${chunk.length} data bytes`);
  }
  static decodeTLST(chunk) {
    const tlst = dataStream.fromData(chunk);
    const _chunkID = tlst.readString(4);
    const size = tlst.readUInt32(true);
    const list = tlst.readUInt32(true);
    const name = tlst.readString(4);
    const type = tlst.readUInt32(true);
    const triggerOn1 = tlst.readUInt8(true);
    const triggerOn2 = tlst.readUInt8(true);
    const triggerOn3 = tlst.readUInt8(true);
    const triggerOn4 = tlst.readUInt8(true);
    const func = tlst.readUInt32(true);
    const extra = tlst.readUInt32(true);
    const extraData = tlst.readUInt32(true);
    const value = {
      list,
      name,
      type,
      triggerOn1,
      triggerOn2,
      triggerOn3,
      triggerOn4,
      extra,
      extraData,
      function: func
    };
    debug$2('decodeTLST =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeFACT(chunk) {
    const fact = dataStream.fromData(chunk);
    const _chunkID = fact.readString(4);
    const size = fact.readUInt32(true);
    const data = fact.readUInt8();
    const value = {
      data
    };
    debug$2('decodeFACT =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeDISP(chunk) {
    const disp = dataStream.fromData(chunk);
    const _chunkID = disp.readString(4);
    const size = disp.readUInt32(true);
    const type = disp.readUInt32(true);
    const data = disp.readUInt16(true);
    const value = {
      type,
      data
    };
    debug$2('decodeDISP =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeACID(chunk) {
    const acid = dataStream.fromData(chunk);
    const _chunkID = acid.readString(4);
    const size = acid.readUInt32(true);
    const type = acid.readUInt32(true);
    const rootNote = acid.readUInt16(true);
    const unknown1 = acid.readUInt16(true);
    const unknown2 = acid.readUInt32(true);
    const beats = acid.readUInt32(true);
    const meterDenominator = acid.readUInt16(true);
    const meterNumerator = acid.readUInt16(true);
    const tempo = acid.readUInt32(true);
    const value = {
      type,
      rootNote,
      unknown1,
      unknown2,
      beats,
      meterDenominator,
      meterNumerator,
      tempo
    };
    debug$2('decodeACID =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeINST(chunk) {
    const inst = dataStream.fromData(chunk);
    const _chunkID = inst.readString(4);
    const size = inst.readUInt32(true);
    const unshiftedNote = inst.readUInt8();
    const fineTuning = inst.readUInt8();
    const gain = inst.readUInt8();
    const lowNote = inst.readUInt8();
    const highNote = inst.readUInt8();
    const lowVelocity = inst.readUInt8();
    const highVelocity = inst.readUInt8();
    const value = {
      unshiftedNote,
      fineTuning,
      gain,
      lowNote,
      highNote,
      lowVelocity,
      highVelocity
    };
    debug$2('decodeINST =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeSMPL(chunk) {
    const smpl = dataStream.fromData(chunk);
    const _chunkID = smpl.readString(4);
    const size = smpl.readUInt32(true);
    const manufacturer1 = smpl.readUInt8();
    const manufacturer2 = smpl.readUInt8();
    const manufacturer3 = smpl.readUInt8();
    const manufacturer4 = smpl.readUInt8();
    const product = smpl.readUInt8();
    const samplePeriod = smpl.readUInt8();
    const midiUnityNote = smpl.readUInt8();
    const midiPitchFraction = smpl.readUInt8();
    const SMPTEFormat = smpl.readUInt8();
    const SMPTEOffset1 = smpl.readUInt8();
    const SMPTEOffset2 = smpl.readUInt8();
    const SMPTEOffset3 = smpl.readUInt8();
    const SMPTEOffset4 = smpl.readUInt8();
    const sampleLoopsCount = smpl.readUInt8();
    const sampleDataSize = smpl.readUInt8();
    if (sampleLoopsCount > 0) {
      for (let i = 0; i < sampleLoopsCount; i++) {
        const ID = smpl.readUInt8();
        const type = smpl.readUInt8();
        const start = smpl.readUInt8();
        const end = smpl.readUInt8();
        const fraction = smpl.readUInt8();
        const count = smpl.readUInt8();
      }
    }
    let sampleData;
    if (sampleDataSize > 0) {
      sampleData = smpl.read(sampleDataSize, true);
    }
    const value = {
      manufacturer1,
      manufacturer2,
      manufacturer3,
      manufacturer4,
      product,
      samplePeriod,
      midiUnityNote,
      midiPitchFraction,
      SMPTEFormat,
      SMPTEOffset1,
      SMPTEOffset2,
      SMPTEOffset3,
      SMPTEOffset4,
      sampleLoopsCount,
      sampleDataSize,
      sampleData
    };
    debug$2('decodeSMPL =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeRLND(chunk) {
    const roland = dataStream.fromData(chunk);
    const chunkID = roland.readString(4);
    const size = roland.readUInt32(true);
    const device = roland.readString(8);
    const unknown1 = roland.readUInt8();
    const unknown2 = roland.readUInt8();
    const unknown3 = roland.readUInt8();
    const unknown4 = roland.readUInt8();
    const sampleIndex = roland.readUInt8();
    let sampleLabel = '';
    if (device === 'roifspsx') {
      switch (sampleIndex) {
        case 0:
          sampleLabel = 'A1';
          break;
        case 1:
          sampleLabel = 'A2';
          break;
        case 2:
          sampleLabel = 'A3';
          break;
        case 3:
          sampleLabel = 'A4';
          break;
        case 4:
          sampleLabel = 'A5';
          break;
        case 5:
          sampleLabel = 'A6';
          break;
        case 6:
          sampleLabel = 'A7';
          break;
        case 7:
          sampleLabel = 'A8';
          break;
        case 8:
          sampleLabel = 'A9';
          break;
        case 9:
          sampleLabel = 'A10';
          break;
        case 10:
          sampleLabel = 'A11';
          break;
        case 11:
          sampleLabel = 'A12';
          break;
        case 12:
          sampleLabel = 'B1';
          break;
        case 13:
          sampleLabel = 'B2';
          break;
        case 14:
          sampleLabel = 'B3';
          break;
        case 15:
          sampleLabel = 'B4';
          break;
        case 16:
          sampleLabel = 'B5';
          break;
        case 17:
          sampleLabel = 'B6';
          break;
        case 18:
          sampleLabel = 'B7';
          break;
        case 19:
          sampleLabel = 'B8';
          break;
        case 20:
          sampleLabel = 'B9';
          break;
        case 21:
          sampleLabel = 'B10';
          break;
        case 22:
          sampleLabel = 'B11';
          break;
        case 23:
          sampleLabel = 'B12';
          break;
        case 24:
          sampleLabel = 'C1';
          break;
        case 25:
          sampleLabel = 'C2';
          break;
        case 26:
          sampleLabel = 'C3';
          break;
        case 27:
          sampleLabel = 'C4';
          break;
        case 28:
          sampleLabel = 'C5';
          break;
        case 29:
          sampleLabel = 'C6';
          break;
        case 30:
          sampleLabel = 'C7';
          break;
        case 31:
          sampleLabel = 'C8';
          break;
        case 32:
          sampleLabel = 'C9';
          break;
        case 33:
          sampleLabel = 'C10';
          break;
        case 34:
          sampleLabel = 'C11';
          break;
        case 35:
          sampleLabel = 'C12';
          break;
        case 36:
          sampleLabel = 'D1';
          break;
        case 37:
          sampleLabel = 'D2';
          break;
        case 38:
          sampleLabel = 'D3';
          break;
        case 39:
          sampleLabel = 'D4';
          break;
        case 40:
          sampleLabel = 'D5';
          break;
        case 41:
          sampleLabel = 'D6';
          break;
        case 42:
          sampleLabel = 'D7';
          break;
        case 43:
          sampleLabel = 'D8';
          break;
        case 44:
          sampleLabel = 'D9';
          break;
        case 45:
          sampleLabel = 'D10';
          break;
        case 46:
          sampleLabel = 'D11';
          break;
        case 47:
          sampleLabel = 'D12';
          break;
        case 48:
          sampleLabel = 'E1';
          break;
        case 49:
          sampleLabel = 'E2';
          break;
        case 50:
          sampleLabel = 'E3';
          break;
        case 51:
          sampleLabel = 'E4';
          break;
        case 52:
          sampleLabel = 'E5';
          break;
        case 53:
          sampleLabel = 'E6';
          break;
        case 54:
          sampleLabel = 'E7';
          break;
        case 55:
          sampleLabel = 'E8';
          break;
        case 56:
          sampleLabel = 'E9';
          break;
        case 57:
          sampleLabel = 'E10';
          break;
        case 58:
          sampleLabel = 'E11';
          break;
        case 59:
          sampleLabel = 'E12';
          break;
        case 60:
          sampleLabel = 'F1';
          break;
        case 61:
          sampleLabel = 'F2';
          break;
        case 62:
          sampleLabel = 'F3';
          break;
        case 63:
          sampleLabel = 'F4';
          break;
        case 64:
          sampleLabel = 'F5';
          break;
        case 65:
          sampleLabel = 'F6';
          break;
        case 66:
          sampleLabel = 'F7';
          break;
        case 67:
          sampleLabel = 'F8';
          break;
        case 68:
          sampleLabel = 'F9';
          break;
        case 69:
          sampleLabel = 'F10';
          break;
        case 70:
          sampleLabel = 'F11';
          break;
        case 71:
          sampleLabel = 'F12';
          break;
        case 72:
          sampleLabel = 'G1';
          break;
        case 73:
          sampleLabel = 'G2';
          break;
        case 74:
          sampleLabel = 'G3';
          break;
        case 75:
          sampleLabel = 'G4';
          break;
        case 76:
          sampleLabel = 'G5';
          break;
        case 77:
          sampleLabel = 'G6';
          break;
        case 78:
          sampleLabel = 'G7';
          break;
        case 79:
          sampleLabel = 'G8';
          break;
        case 80:
          sampleLabel = 'G9';
          break;
        case 81:
          sampleLabel = 'G10';
          break;
        case 82:
          sampleLabel = 'G11';
          break;
        case 83:
          sampleLabel = 'G12';
          break;
        case 84:
          sampleLabel = 'H1';
          break;
        case 85:
          sampleLabel = 'H2';
          break;
        case 86:
          sampleLabel = 'H3';
          break;
        case 87:
          sampleLabel = 'H4';
          break;
        case 88:
          sampleLabel = 'H5';
          break;
        case 89:
          sampleLabel = 'H6';
          break;
        case 90:
          sampleLabel = 'H7';
          break;
        case 91:
          sampleLabel = 'H8';
          break;
        case 92:
          sampleLabel = 'H9';
          break;
        case 93:
          sampleLabel = 'H10';
          break;
        case 94:
          sampleLabel = 'H11';
          break;
        case 95:
          sampleLabel = 'H12';
          break;
        case 96:
          sampleLabel = 'I1';
          break;
        case 97:
          sampleLabel = 'I2';
          break;
        case 98:
          sampleLabel = 'I3';
          break;
        case 99:
          sampleLabel = 'I4';
          break;
        case 100:
          sampleLabel = 'I5';
          break;
        case 101:
          sampleLabel = 'I6';
          break;
        case 102:
          sampleLabel = 'I7';
          break;
        case 103:
          sampleLabel = 'I8';
          break;
        case 104:
          sampleLabel = 'I9';
          break;
        case 105:
          sampleLabel = 'I10';
          break;
        case 106:
          sampleLabel = 'I11';
          break;
        case 107:
          sampleLabel = 'I12';
          break;
        case 108:
          sampleLabel = 'J1';
          break;
        case 109:
          sampleLabel = 'J2';
          break;
        case 110:
          sampleLabel = 'J3';
          break;
        case 111:
          sampleLabel = 'J4';
          break;
        case 112:
          sampleLabel = 'J5';
          break;
        case 113:
          sampleLabel = 'J6';
          break;
        case 114:
          sampleLabel = 'J7';
          break;
        case 115:
          sampleLabel = 'J8';
          break;
        case 116:
          sampleLabel = 'J9';
          break;
        case 117:
          sampleLabel = 'J10';
          break;
        case 118:
          sampleLabel = 'J11';
          break;
        case 119:
          sampleLabel = 'J12';
          break;
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
      sampleLabel
    };
    debug$2('decodeRLND =', JSON.stringify(value, null, 2));
    return value;
  }
  static encodeRLND(data) {
    const {
      device,
      unknown1 = 4,
      unknown2 = 0,
      unknown3 = 0,
      unknown4 = 0
    } = data;
    let {
      sampleIndex
    } = data;
    const buffer = Buffer.alloc(466, 0);
    buffer.write('RLND', 0);
    buffer.writeUInt32LE(458, 4);
    buffer.write(device, 8);
    buffer.writeUInt8(unknown1, 16);
    buffer.writeUInt8(unknown2, 17);
    buffer.writeUInt8(unknown3, 18);
    buffer.writeUInt8(unknown4, 19);
    if (device === 'roifspsx' && typeof sampleIndex === 'string') {
      switch (sampleIndex.toUpperCase()) {
        case 'A1':
          sampleIndex = 0;
          break;
        case 'A2':
          sampleIndex = 1;
          break;
        case 'A3':
          sampleIndex = 2;
          break;
        case 'A4':
          sampleIndex = 3;
          break;
        case 'A5':
          sampleIndex = 4;
          break;
        case 'A6':
          sampleIndex = 5;
          break;
        case 'A7':
          sampleIndex = 6;
          break;
        case 'A8':
          sampleIndex = 7;
          break;
        case 'A9':
          sampleIndex = 8;
          break;
        case 'A10':
          sampleIndex = 9;
          break;
        case 'A11':
          sampleIndex = 10;
          break;
        case 'A12':
          sampleIndex = 11;
          break;
        case 'B1':
          sampleIndex = 12;
          break;
        case 'B2':
          sampleIndex = 13;
          break;
        case 'B3':
          sampleIndex = 14;
          break;
        case 'B4':
          sampleIndex = 15;
          break;
        case 'B5':
          sampleIndex = 16;
          break;
        case 'B6':
          sampleIndex = 17;
          break;
        case 'B7':
          sampleIndex = 18;
          break;
        case 'B8':
          sampleIndex = 19;
          break;
        case 'B9':
          sampleIndex = 20;
          break;
        case 'B10':
          sampleIndex = 21;
          break;
        case 'B11':
          sampleIndex = 22;
          break;
        case 'B12':
          sampleIndex = 23;
          break;
        case 'C1':
          sampleIndex = 24;
          break;
        case 'C2':
          sampleIndex = 25;
          break;
        case 'C3':
          sampleIndex = 26;
          break;
        case 'C4':
          sampleIndex = 27;
          break;
        case 'C5':
          sampleIndex = 28;
          break;
        case 'C6':
          sampleIndex = 29;
          break;
        case 'C7':
          sampleIndex = 30;
          break;
        case 'C8':
          sampleIndex = 31;
          break;
        case 'C9':
          sampleIndex = 32;
          break;
        case 'C10':
          sampleIndex = 33;
          break;
        case 'C11':
          sampleIndex = 34;
          break;
        case 'C12':
          sampleIndex = 35;
          break;
        case 'D1':
          sampleIndex = 36;
          break;
        case 'D2':
          sampleIndex = 37;
          break;
        case 'D3':
          sampleIndex = 38;
          break;
        case 'D4':
          sampleIndex = 39;
          break;
        case 'D5':
          sampleIndex = 40;
          break;
        case 'D6':
          sampleIndex = 41;
          break;
        case 'D7':
          sampleIndex = 42;
          break;
        case 'D8':
          sampleIndex = 43;
          break;
        case 'D9':
          sampleIndex = 44;
          break;
        case 'D10':
          sampleIndex = 45;
          break;
        case 'D11':
          sampleIndex = 46;
          break;
        case 'D12':
          sampleIndex = 47;
          break;
        case 'E1':
          sampleIndex = 48;
          break;
        case 'E2':
          sampleIndex = 49;
          break;
        case 'E3':
          sampleIndex = 50;
          break;
        case 'E4':
          sampleIndex = 51;
          break;
        case 'E5':
          sampleIndex = 52;
          break;
        case 'E6':
          sampleIndex = 53;
          break;
        case 'E7':
          sampleIndex = 54;
          break;
        case 'E8':
          sampleIndex = 55;
          break;
        case 'E9':
          sampleIndex = 56;
          break;
        case 'E10':
          sampleIndex = 57;
          break;
        case 'E11':
          sampleIndex = 58;
          break;
        case 'E12':
          sampleIndex = 59;
          break;
        case 'F1':
          sampleIndex = 60;
          break;
        case 'F2':
          sampleIndex = 61;
          break;
        case 'F3':
          sampleIndex = 62;
          break;
        case 'F4':
          sampleIndex = 63;
          break;
        case 'F5':
          sampleIndex = 64;
          break;
        case 'F6':
          sampleIndex = 65;
          break;
        case 'F7':
          sampleIndex = 66;
          break;
        case 'F8':
          sampleIndex = 67;
          break;
        case 'F9':
          sampleIndex = 68;
          break;
        case 'F10':
          sampleIndex = 69;
          break;
        case 'F11':
          sampleIndex = 70;
          break;
        case 'F12':
          sampleIndex = 71;
          break;
        case 'G1':
          sampleIndex = 72;
          break;
        case 'G2':
          sampleIndex = 73;
          break;
        case 'G3':
          sampleIndex = 74;
          break;
        case 'G4':
          sampleIndex = 75;
          break;
        case 'G5':
          sampleIndex = 76;
          break;
        case 'G6':
          sampleIndex = 77;
          break;
        case 'G7':
          sampleIndex = 78;
          break;
        case 'G8':
          sampleIndex = 79;
          break;
        case 'G9':
          sampleIndex = 80;
          break;
        case 'G10':
          sampleIndex = 81;
          break;
        case 'G11':
          sampleIndex = 82;
          break;
        case 'G12':
          sampleIndex = 83;
          break;
        case 'H1':
          sampleIndex = 84;
          break;
        case 'H2':
          sampleIndex = 85;
          break;
        case 'H3':
          sampleIndex = 86;
          break;
        case 'H4':
          sampleIndex = 87;
          break;
        case 'H5':
          sampleIndex = 88;
          break;
        case 'H6':
          sampleIndex = 89;
          break;
        case 'H7':
          sampleIndex = 90;
          break;
        case 'H8':
          sampleIndex = 91;
          break;
        case 'H9':
          sampleIndex = 92;
          break;
        case 'H10':
          sampleIndex = 93;
          break;
        case 'H11':
          sampleIndex = 94;
          break;
        case 'H12':
          sampleIndex = 95;
          break;
        case 'I1':
          sampleIndex = 96;
          break;
        case 'I2':
          sampleIndex = 97;
          break;
        case 'I3':
          sampleIndex = 98;
          break;
        case 'I4':
          sampleIndex = 99;
          break;
        case 'I5':
          sampleIndex = 100;
          break;
        case 'I6':
          sampleIndex = 101;
          break;
        case 'I7':
          sampleIndex = 102;
          break;
        case 'I8':
          sampleIndex = 103;
          break;
        case 'I9':
          sampleIndex = 104;
          break;
        case 'I10':
          sampleIndex = 105;
          break;
        case 'I11':
          sampleIndex = 106;
          break;
        case 'I12':
          sampleIndex = 107;
          break;
        case 'J1':
          sampleIndex = 108;
          break;
        case 'J2':
          sampleIndex = 109;
          break;
        case 'J3':
          sampleIndex = 110;
          break;
        case 'J4':
          sampleIndex = 111;
          break;
        case 'J5':
          sampleIndex = 112;
          break;
        case 'J6':
          sampleIndex = 113;
          break;
        case 'J7':
          sampleIndex = 114;
          break;
        case 'J8':
          sampleIndex = 115;
          break;
        case 'J9':
          sampleIndex = 116;
          break;
        case 'J10':
          sampleIndex = 117;
          break;
        case 'J11':
          sampleIndex = 118;
          break;
        case 'J12':
          sampleIndex = 119;
          break;
        default:
          {
            sampleIndex = 0;
          }
      }
    }
    buffer.writeUInt8(sampleIndex, 20);
    debug$2('Buffer:', buffer.toString('hex'));
    return buffer;
  }
  static decodeJUNK(chunk, options) {
    const junk = dataStream.fromData(chunk);
    const chunkID = junk.readString(4);
    let size = junk.readUInt32(true);
    if (options.roundOddChunks && size % 2 !== 0) {
      size += 1;
    }
    debug$2(`decodeJUNK: ${chunk.length} bytes, chunkID: ${chunkID}, junk size: ${size}`);
  }
  static decodeBEXT(chunk, options) {
    const bext = dataStream.fromData(chunk);
    const chunkID = bext.readString(4);
    let size = bext.readUInt32(true);
    if (options.roundOddChunks && size % 2 !== 0) {
      size += 1;
    }
    const value = {
      chunkID,
      size
    };
    value.description = bext.readString(256);
    value.originator = bext.readString(32);
    value.originatorReference = bext.readString(32);
    value.originationDate = bext.readString(10);
    value.originationTime = bext.readString(8);
    value.timeReferenceLow = bext.readUInt32(true);
    value.timeReferenceHigh = bext.readUInt32(true);
    value.version = bext.readUInt16(true);
    value.umid = bext.read(64, true);
    value.loudnessValue = bext.readUInt16(true);
    value.loudnessRange = bext.readUInt16(true);
    value.maxTruePeakLevel = bext.readUInt16(true);
    value.maxMomentaryLoudness = bext.readUInt16(true);
    value.maxShortTermLoudness = bext.readUInt16(true);
    value.reserved = bext.read(180, true);
    value.codingHistory = bext.read(bext.remainingBytes(), true);
    debug$2('decodeBEXT =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeCue(chunk) {
    const cue = dataStream.fromData(chunk);
    const chunkID = cue.readString(4);
    const size = cue.readUInt32(true);
    const numberCuePoints = cue.readUInt32(true);
    const value = {
      chunkID,
      size,
      numberCuePoints,
      data: []
    };
    for (let i = 0; i < numberCuePoints; i++) {
      const point = {};
      point.id = cue.readUInt32(true);
      point.position = cue.readUInt32(true);
      point.chunkID = cue.readString(4);
      point.chunkStart = cue.readUInt32(true);
      point.blockStart = cue.readUInt32(true);
      point.sampleOffset = cue.readUInt32(true);
      value.data.push(point);
    }
    if (cue.remainingBytes() > 0) {
      debug$2(`Unexpected ${cue.remainingBytes()} bytes remaining`);
    }
    debug$2('decodeCue =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeResU(chunk) {
    const resu = dataStream.fromData(chunk);
    const chunkID = resu.readString(4);
    const size = resu.readUInt32(true);
    const data = resu.read(size, true);
    let decompressed;
    try {
      decompressed = inflate_1$1.inflate(data);
      debug$2('Inflated Size:', decompressed.length);
    } catch (error) {
    }
    const value = {
      chunkID,
      size
    };
    try {
      value.data = JSON.parse(decompressed);
    } catch (error) {
    }
    debug$2('decodeResU =', JSON.stringify(value, null, 2));
    return value;
  }
  static decodeDS64(chunk) {
    const ds64 = dataStream.fromData(chunk);
    const chunkID = ds64.readString(4);
    const size = ds64.readUInt32(true);
    const riffSizeLow = ds64.readUInt32(true);
    const riffSizeHigh = ds64.readUInt32(true);
    const dataSizeLow = ds64.readUInt32(true);
    const dataSizeHigh = ds64.readUInt32(true);
    const sampleCountLow = ds64.readUInt32(true);
    const sampleCountHigh = ds64.readUInt32(true);
    const tableLength = ds64.readUInt32(true);
    const table = [];
    if (tableLength > 0) {
      while (ds64.remainingBytes() > 0) {
        table.push({
          chunkID: ds64.readString(4),
          chunkSizeLow: ds64.readUInt32(true),
          chunkSizeHigh: ds64.readUInt32(true)
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
      table
    };
    debug$2('decodeDS64 =', JSON.stringify(value, null, 2));
    return value;
  }
}
var audioWav = AudioWAV;

const makeDetail = (key, value, keyClass = '', valueClass = '') => {
  const detail = document.createElement('div');
  detail.className = 'detail';
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
const known = ['header', 'format', 'list', 'data', 'roland', 'display', 'broadcast_extension', 'logic_resu', 'cue_points', 'sample', 'data_size_64', 'acid'];
const labelType = 'Chunk Type:';
const renderChunk = chunk => {
  const chunkNode = document.createElement('div');
  chunkNode.className = 'chunk';
  chunkNode.append(makeDetail(labelType, chunk.type, '', known.includes(chunk.type) ? 'known' : 'unknown'));
  if (chunk.value) {
    for (const [key, value] of Object.entries(chunk.value)) {
      if (Array.isArray(value)) {
        value.forEach(v => {
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
};
const outputChunks = wav => {
  const {
    chunks
  } = wav;
  document.querySelector('.chunk-list').innerHTML = '';
  chunks.forEach(chunk => {
    console.log('Chunk:', chunk);
    renderChunk(chunk);
  });
};
document.querySelector('#wav-file').addEventListener('change', e => {
  const {
    files
  } = e.target;
  if (!files || files.length < 1) {
    return;
  }
  const [file] = files;
  const reader = new FileReader();
  reader.addEventListener('load', event => {
    const output = audioWav.fromFile(event.target.result);
    outputChunks(output);
  });
  reader.readAsArrayBuffer(file);
});
