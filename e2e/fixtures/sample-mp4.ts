/**
 * Pure TypeScript generator for a deterministic valid H.264 Baseline MP4 buffer.
 * Zero external binary dependencies; decodable by Chromium/HTML5 <video>.
 */

function box(type: string, ...payloads: Uint8Array[]): Uint8Array {
  const totalLen = 8 + payloads.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(totalLen);
  const view = new DataView(out.buffer);
  view.setUint32(0, totalLen, false);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  let offset = 8;
  for (const p of payloads) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function fullBox(type: string, version: number, flags: number, ...payloads: Uint8Array[]): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = version & 0xff;
  header[1] = (flags >> 16) & 0xff;
  header[2] = (flags >> 8) & 0xff;
  header[3] = flags & 0xff;
  return box(type, header, ...payloads);
}

function u32(val: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, val >>> 0, false);
  return b;
}

function u16(val: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, val & 0xffff, false);
  return b;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * Builds a single 16x16 H.264 Baseline IDR slice using I_PCM macroblock (all 128 gray YCbCr).
 */
function buildH264IdrFrame(colorByte: number = 0x80): Uint8Array {
  // Header bits before byte alignment for I_PCM:
  // first_mb_in_slice=0 (1)
  // slice_type=7 (I slice: 0001000)
  // pic_parameter_set_id=0 (1)
  // frame_num=0 (0000)
  // idr_pic_id=0 (1)
  // pic_order_cnt_lsb=0 (0000)
  // no_output_of_prior_pics_flag=0 (0), long_term_reference_flag=0 (0)
  // slice_qp_delta=0 (1)
  // mb_type=25 (I_PCM: 000011010)
  // Bit count after NAL header: 1 + 7 + 1 + 4 + 1 + 4 + 2 + 1 + 9 = 30 bits -> pad 2 zero bits to 32 bits (4 bytes)!
  // Bits:
  // Byte 0: 1000 1000 = 0x88
  // Byte 1: 1000 0100 = 0x84
  // Byte 2: 0000 1000 = 0x08
  // Byte 3: 0110 1000 = 0x68 (last two 0s = pcm_alignment_zero_bit)
  const sliceHeaderAndMbType = new Uint8Array([0x65, 0x88, 0x84, 0x08, 0x68]);
  const pixels = new Uint8Array(384).fill(colorByte); // 256 Y + 64 Cb + 64 Cr
  const rbspStop = new Uint8Array([0x80]); // rbsp_trailing_bits (1 + 7 zeroes)
  const nal = concat(sliceHeaderAndMbType, pixels, rbspStop);
  return concat(u32(nal.length), nal);
}

export function createTestMp4Buffer(durationSeconds: number = 6, colorByte: number = 0x80): Buffer {
  const timescale = 1000;
  const durationUnits = Math.round(durationSeconds * timescale);
  const fps = 1; // 1 frame per second across durationSeconds so playback visibly progresses
  const frameCount = Math.max(1, Math.round(durationSeconds * fps));
  const sampleDelta = Math.round(durationUnits / frameCount);

  // H.264 Baseline Profile (0x42), constraints (0xc0), Level 1.0 (0x0a), 16x16
  const sps = new Uint8Array([0x67, 0x42, 0xc0, 0x0a, 0xfb, 0x88]);
  const pps = new Uint8Array([0x68, 0xce, 0x38, 0x80]);

  const sampleBytes = buildH264IdrFrame(colorByte);
  const samples = Array.from({ length: frameCount }, () => sampleBytes);
  const mdatPayload = concat(...samples);
  const mdatBox = box('mdat', mdatPayload);

  const ftyp = box(
    'ftyp',
    Uint8Array.from([...'isom'].map((c) => c.charCodeAt(0))),
    u32(512),
    Uint8Array.from([...'isomiso2avc1mp41'].map((c) => c.charCodeAt(0)))
  );

  // mvhd (version 0: 96 bytes payload after fullBox header = total 108)
  const matrix = concat(
    u32(0x00010000), u32(0), u32(0),
    u32(0), u32(0x00010000), u32(0),
    u32(0), u32(0), u32(0x40000000)
  );
  const mvhd = fullBox(
    'mvhd', 0, 0,
    u32(0), u32(0), // create/mod time
    u32(timescale),
    u32(durationUnits),
    u32(0x00010000), // rate 1.0
    u16(0x0100), // volume 1.0
    new Uint8Array(10), // reserved
    matrix,
    new Uint8Array(24), // pre-defined
    u32(2) // next_track_id
  );

  const tkhd = fullBox(
    'tkhd', 0, 3, // enabled + in_movie
    u32(0), u32(0),
    u32(1), // track_id
    u32(0),
    u32(durationUnits),
    new Uint8Array(8),
    u16(0), u16(0), u16(0), u16(0),
    matrix,
    u32(16 << 16), // width 16.0
    u32(16 << 16)  // height 16.0
  );

  const mdhd = fullBox(
    'mdhd', 0, 0,
    u32(0), u32(0),
    u32(timescale),
    u32(durationUnits),
    u16(0x55c4), // 'und'
    u16(0)
  );

  const hdlr = fullBox(
    'hdlr', 0, 0,
    u32(0),
    Uint8Array.from([...'vide'].map((c) => c.charCodeAt(0))),
    new Uint8Array(12),
    Uint8Array.from([...'VideoHandler\0'].map((c) => c.charCodeAt(0)))
  );

  const vmhd = fullBox('vmhd', 0, 1, new Uint8Array(8));
  const urlBox = fullBox('url ', 0, 1);
  const dref = fullBox('dref', 0, 0, u32(1), urlBox);
  const dinf = box('dinf', dref);

  const avcC = box(
    'avcC',
    new Uint8Array([
      1,          // configurationVersion
      0x42,       // AVCProfileIndication (Baseline)
      0xc0,       // profile_compatibility
      0x0a,       // AVCLevelIndication
      0xff,       // lengthSizeMinusOne = 3 (4-byte NAL length prefix)
      0xe1,       // numOfSequenceParameterSets = 1
    ]),
    u16(sps.length),
    sps,
    new Uint8Array([1]), // numOfPictureParameterSets = 1
    u16(pps.length),
    pps
  );

  const avc1 = box(
    'avc1',
    new Uint8Array(6), // reserved
    u16(1),            // data_reference_index
    new Uint8Array(16),
    u16(16), u16(16),  // width, height
    u32(0x00480000),   // 72 dpi
    u32(0x00480000),
    u32(0),
    u16(1),            // frame_count
    new Uint8Array(32),// compressorname
    u16(0x0018),       // depth 24
    u16(0xffff),       // pre-defined -1
    avcC
  );

  const stsd = fullBox('stsd', 0, 0, u32(1), avc1);
  const stts = fullBox('stts', 0, 0, u32(1), u32(frameCount), u32(sampleDelta));
  const stsc = fullBox('stsc', 0, 0, u32(1), u32(1), u32(frameCount), u32(1));

  const sampleSizes = concat(...samples.map((s) => u32(s.length)));
  const stsz = fullBox('stsz', 0, 0, u32(0), u32(frameCount), sampleSizes);

  const syncSamples = concat(...samples.map((_, i) => u32(i + 1)));
  const stss = fullBox('stss', 0, 0, u32(frameCount), syncSamples);

  // First build stco with placeholder chunk offset 0 to know moov exact size, then patch chunk offset = ftyp.length + moov.length + 8
  const stcoPlaceholder = fullBox('stco', 0, 0, u32(1), u32(0));
  const stblTemp = box('stbl', stsd, stts, stsc, stsz, stss, stcoPlaceholder);
  const minfTemp = box('minf', vmhd, dinf, stblTemp);
  const mdiaTemp = box('mdia', mdhd, hdlr, minfTemp);
  const trakTemp = box('trak', tkhd, mdiaTemp);
  const moovTemp = box('moov', mvhd, trakTemp);

  const chunkOffset = ftyp.length + moovTemp.length + 8;
  const stco = fullBox('stco', 0, 0, u32(1), u32(chunkOffset));
  const stbl = box('stbl', stsd, stts, stsc, stsz, stss, stco);
  const minf = box('minf', vmhd, dinf, stbl);
  const mdia = box('mdia', mdhd, hdlr, minf);
  const trak = box('trak', tkhd, mdia);
  const moov = box('moov', mvhd, trak);

  return Buffer.from(concat(ftyp, moov, mdatBox));
}
