'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

// --- Core tokify utilities under test -------------------------------------

function maskKey(k) {
  return (!k || k.length < 10) ? '***' : k.slice(0, 7) + '…' + k.slice(-4);
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function stripAnsi(str) {
  return (str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function wrapWords(text, maxWidth) {
  if (!text || maxWidth <= 10) return [text || ''];
  const words = text.split(' ');
  const lines = [];
  let curLine = '';

  for (const w of words) {
    if (!curLine) {
      curLine = w;
    } else if (stripAnsi(curLine + ' ' + w).length <= maxWidth) {
      curLine += ' ' + w;
    } else {
      lines.push(curLine);
      curLine = w;
    }
  }
  if (curLine) lines.push(curLine);
  return lines;
}

// --- Tests -----------------------------------------------------------------

describe('maskKey', () => {
  test('returns *** for null, undefined, empty, and short keys', () => {
    assert.equal(maskKey(null), '***');
    assert.equal(maskKey(undefined), '***');
    assert.equal(maskKey(''), '***');
    assert.equal(maskKey('123456789'), '***');
  });

  test('masks a key of exactly 10 characters', () => {
    assert.equal(maskKey('1234567890'), '1234567…7890');
  });

  test('returns first 7 and last 4 characters for longer keys', () => {
    assert.equal(maskKey('abcdefghijklmnopqrstuvwxyz'), 'abcdefg…wxyz');
    assert.equal(maskKey('sk-1234567890abcdef'), 'sk-1234…cdef');
  });
});

describe('formatDuration', () => {
  test('handles sub-minute durations', () => {
    assert.equal(formatDuration(0), '0s');
    assert.equal(formatDuration(999), '0s');
    assert.equal(formatDuration(1000), '1s');
    assert.equal(formatDuration(59999), '59s');
  });

  test('handles minute + second durations', () => {
    assert.equal(formatDuration(60000), '1m 0s');
    assert.equal(formatDuration(61000), '1m 1s');
    assert.equal(formatDuration(3599999), '59m 59s');
    assert.equal(formatDuration(3600000), '60m 0s');
  });

  test('handles larger durations', () => {
    assert.equal(formatDuration(3723000), '62m 3s');
    assert.equal(formatDuration(12345678), '205m 45s');
  });
});

describe('stripAnsi', () => {
  test('returns an empty string for nullish or empty input', () => {
    assert.equal(stripAnsi(null), '');
    assert.equal(stripAnsi(undefined), '');
    assert.equal(stripAnsi(''), '');
  });

  test('leaves plain text untouched', () => {
    assert.equal(stripAnsi('hello world'), 'hello world');
  });

  test('strips basic ANSI color codes', () => {
    assert.equal(stripAnsi('\x1b[31mred\x1b[0m'), 'red');
  });

  test('strips codes with semicolon-separated parameters', () => {
    assert.equal(stripAnsi('\x1b[1;38;5;123mhello\x1b[0m world'), 'hello world');
  });

  test('strips multiple codes in one string', () => {
    assert.equal(stripAnsi('\x1b[32mgreen\x1b[0m \x1b[1mbold\x1b[0m'), 'green bold');
  });
});

describe('wrapWords', () => {
  test('handles empty or nullish text', () => {
    assert.deepEqual(wrapWords('', 20), ['']);
    assert.deepEqual(wrapWords(null, 20), ['']);
    assert.deepEqual(wrapWords(undefined, 20), ['']);
  });

  test('returns original text when maxWidth <= 10', () => {
    assert.deepEqual(wrapWords('hello world', 10), ['hello world']);
    assert.deepEqual(wrapWords('one two three', 5), ['one two three']);
  });

  test('wraps at word boundaries', () => {
    assert.deepEqual(wrapWords('one two three', 11), ['one two', 'three']);
  });

  test('does not split a line when it is exactly at maxWidth', () => {
    assert.deepEqual(wrapWords('a bcdefghij', 11), ['a bcdefghij']);
  });

  test('wraps when the next word would exceed maxWidth', () => {
    assert.deepEqual(
      wrapWords('a bcdefghij last', 11),
      ['a bcdefghij', 'last']
    );
  });

  test('keeps a single word longer than maxWidth on its own line', () => {
    assert.deepEqual(
      wrapWords('hello supercalifragilistic world', 11),
      ['hello', 'supercalifragilistic', 'world']
    );
  });

  test('preserves consecutive spaces from the input split', () => {
    assert.deepEqual(wrapWords('a  b', 20), ['a  b']);
  });

  test('uses visible width, not raw ANSI width, and preserves codes', () => {
    const wrapped = wrapWords('\x1b[1malpha\x1b[0m beta gamma', 11);

    assert.deepEqual(wrapped, ['\x1b[1malpha\x1b[0m beta', 'gamma']);
    assert.equal(stripAnsi(wrapped[0]).length, 10);
  });
});
