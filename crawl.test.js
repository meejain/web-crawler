const {normalizeURL} = require('./crawl.js');
const {test, expect} = require('@jest/globals');

test('normalizeURL strip protocol', () => {
    const input = "https://blog.boot.dev/path";
    const expected = "blog.boot.dev/path";
    const actual = normalizeURL(input);
    expect(actual).toBe(expected);
});

test('normalizeURL strip trailing slash', () => {
    const input = "https://blog.boot.dev/path/";
    const expected = "blog.boot.dev/path";
    const actual = normalizeURL(input);
    expect(actual).toBe(expected);
});

test('normalizeURL capitals', () => {
    const input = "https://BLOG.boot.dev/path/";
    const expected = "blog.boot.dev/path";
    const actual = normalizeURL(input);
    expect(actual).toBe(expected);
});

test('normalizeURL strip http', () => {
    const input = "http://BLOG.boot.dev/path/";
    const expected = "blog.boot.dev/path";
    const actual = normalizeURL(input);
    expect(actual).toBe(expected);
});


