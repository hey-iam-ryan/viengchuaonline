import { test, expect } from 'vitest';
import { parseClientMsg } from '../src/protocol';

test('parse hợp lệ', () => {
  expect(parseClientMsg('{"t":"s","x":1,"z":2,"ry":0.5,"p":1}')).toEqual({ t: 's', x: 1, z: 2, ry: 0.5, p: 1 });
  expect(parseClientMsg('{"t":"inc","b":"yard"}')).toEqual({ t: 'inc', b: 'yard' });
  expect(parseClientMsg('{"t":"a","a":"bow"}')).toEqual({ t: 'a', a: 'bow' });
  expect(parseClientMsg('{"t":"hello","name":"An","robe":"lam"}')).toEqual({ t: 'hello', name: 'An', robe: 'lam' });
});

test('parse ArrayBuffer', () => {
  expect(parseClientMsg(new TextEncoder().encode('{"t":"a","a":"mo"}').buffer)).toEqual({ t: 'a', a: 'mo' });
});

test('loại tin rác', () => {
  expect(parseClientMsg('x'.repeat(513))).toBeNull();
  expect(parseClientMsg('{not json')).toBeNull();
  expect(parseClientMsg('null')).toBeNull();
  expect(parseClientMsg('{"t":"s","x":"1","z":2,"ry":0,"p":1}')).toBeNull();
  expect(parseClientMsg('{"t":"s","x":1e999,"z":2,"ry":0,"p":1}')).toBeNull();
  expect(parseClientMsg('{"t":"s","x":1,"z":2,"ry":0,"p":9}')).toBeNull();
  expect(parseClientMsg('{"t":"a","a":"dance"}')).toBeNull();
  expect(parseClientMsg('{"t":"hello","name":"A","robe":"do"}')).toBeNull();
  expect(parseClientMsg('{"t":"inc","b":"roof"}')).toBeNull();
  expect(parseClientMsg('{"t":"zzz"}')).toBeNull();
});

test('chỉ giữ trường đã biết', () => {
  expect(parseClientMsg('{"t":"a","a":"bow","evil":1}')).toEqual({ t: 'a', a: 'bow' });
});
