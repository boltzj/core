/**
 * Functions that manipulate strings
 *
 * Although these functions are exported, they are subject to change without notice.
 *
 * @module common_strings
 */ /** */

import { isString, isArray, isDefined, isNull, isPromise, isInjectable, isObject } from './predicates';
import { Rejection } from '../transition/rejectFactory';
import { IInjectable, identity, Obj, tail, pushR } from './common';
import { pattern, is, not, val, invoke } from './hof';
import { Transition } from '../transition/transition';
import { Resolvable } from '../resolve/resolvable';

/**
 * Returns a string shortened to a maximum length
 *
 * If the string is already less than the `max` length, return the string.
 * Else return the string, shortened to `max - 3` and append three dots ("...").
 *
 * @param max the maximum length of the string to return
 * @param str the input string
 */
export function maxLength(max: number, str: string) {
  if (str.length <= max) return str;
  return str.substr(0, max - 3) + '...';
}

/**
 * Returns a string, with spaces added to the end, up to a desired str length
 *
 * If the string is already longer than the desired length, return the string.
 * Else returns the string, with extra spaces on the end, such that it reaches `length` characters.
 *
 * @param length the desired length of the string to return
 * @param str the input string
 */
export function padString(length: number, str: string) {
  while (str.length < length) str += ' ';
  return str;
}

export function kebobString(camelCase: string) {
  return camelCase
    .replace(/^([A-Z])/, $1 => $1.toLowerCase()) // replace first char
    .replace(/([A-Z])/g, $1 => '-' + $1.toLowerCase()); // replace rest
}

function _toJson(obj: Obj) {
  return JSON.stringify(obj);
}

function _fromJson(json: string) {
  return isString(json) ? JSON.parse(json) : json;
}

function promiseToString(p: Promise<any>) {
  return `Promise(${JSON.stringify(p)})`;
}

export function functionToString(fn: Function) {
  const fnStr = fnToString(fn);
  const namedFunctionMatch = fnStr.match(/^(function [^ ]+\([^)]*\))/);
  const toStr = namedFunctionMatch ? namedFunctionMatch[1] : fnStr;

  const fnName = fn['name'] || '';
  if (fnName && toStr.match(/function \(/)) {
    return 'function ' + fnName + toStr.substr(9);
  }
  return toStr;
}

export function fnToString(fn: IInjectable) {
  const _fn = isArray(fn) ? fn.slice(-1)[0] : fn;
  return (_fn && _fn.toString()) || 'undefined';
}

let stringifyPatternFn: (val: any) => string = null;
const stringifyPattern = function(value: any) {
  const isRejection = Rejection.isRejectionPromise;

  stringifyPatternFn =
    <any>stringifyPatternFn ||
    pattern([
      [not(isDefined), val('undefined')],
      [isNull, val('null')],
      [isPromise, val('[Promise]')],
      [isRejection, (x: any) => x._transitionRejection.toString()],
      [is(Rejection), invoke('toString')],
      [is(Transition), invoke('toString')],
      [is(Resolvable), invoke('toString')],
      [isInjectable, functionToString],
      [val(true), identity],
    ]);

  return stringifyPatternFn(value);
};

export function stringify(o: any) {
  const seen: any[] = [];

  function format(value: any) {
    if (isObject(value)) {
      if (seen.indexOf(value) !== -1) return '[circular ref]';
      seen.push(value);
    }
    return stringifyPattern(value);
  }

  return JSON.stringify(o, (key, value) => format(value)).replace(/\\"/g, '"');
}

/** Returns a function that splits a string on a character or substring */
export const beforeAfterSubstr = (char: string) => (str: string): string[] => {
  if (!str) return ['', ''];
  const idx = str.indexOf(char);
  if (idx === -1) return [str, ''];
  return [str.substr(0, idx), str.substr(idx + 1)];
};

export const hostRegex = new RegExp('^(?:[a-z]+:)?//[^/]+/');
export const stripLastPathElement = (str: string) => str.replace(/\/[^/]*$/, '');
export const splitHash = beforeAfterSubstr('#');
export const splitQuery = beforeAfterSubstr('?');
export const splitEqual = beforeAfterSubstr('=');
export const trimHashVal = (str: string) => (str ? str.replace(/^#/, '') : '');

/**
 * Splits on a delimiter, but returns the delimiters in the array
 *
 * #### Example:
 * ```js
 * var splitOnSlashes = splitOnDelim('/');
 * splitOnSlashes("/foo"); // ["/", "foo"]
 * splitOnSlashes("/foo/"); // ["/", "foo", "/"]
 * ```
 */
export function splitOnDelim(delim: string) {
  const re = new RegExp('(' + delim + ')', 'g');
  return (str: string) => str.split(re).filter(identity);
}

/**
 * Reduce fn that joins neighboring strings
 *
 * Given an array of strings, returns a new array
 * where all neighboring strings have been joined.
 *
 * #### Example:
 * ```js
 * let arr = ["foo", "bar", 1, "baz", "", "qux" ];
 * arr.reduce(joinNeighborsR, []) // ["foobar", 1, "bazqux" ]
 * ```
 */
export function joinNeighborsR(acc: any[], x: any) {
  if (isString(tail(acc)) && isString(x)) return acc.slice(0, -1).concat(tail(acc) + x);
  return pushR(acc, x);
}
