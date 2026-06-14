const mongoose = require('mongoose');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const isValidTime = (value) => typeof value === 'string' && TIME_PATTERN.test(value);

const cleanString = (value, maxLength = 200) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const cleanStringArray = (value, maxItems = 30, maxLength = 300) =>
  Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => cleanString(item, maxLength)).filter(Boolean)
    : [];

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

module.exports = {
  cleanString,
  cleanStringArray,
  finiteNumber,
  isValidDateKey,
  isValidObjectId,
  isValidTime,
};
