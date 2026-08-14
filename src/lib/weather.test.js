import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wmo,
  toF,
  toMph,
  themeClass,
  hourlyStartIndex,
  DEFAULT_PLACE,
} from "./weather.js";

test("toF converts Celsius to Fahrenheit", () => {
  assert.equal(toF(0), 32);
  assert.equal(toF(100), 212);
  assert.equal(toF(-40), -40);
  assert.equal(toF(20), 68);
});

test("toF handles halves and negatives", () => {
  assert.equal(toF(10), 50);
  assert.equal(toF(-17.77777777777778), 0);
  assert.equal(toF(37), 98.6);
});

test("toMph converts km/h to mph", () => {
  assert.equal(toMph(0), 0);
  assert.ok(Math.abs(toMph(1) - 0.621371) < 1e-9);
  assert.ok(Math.abs(toMph(16) - 9.941936) < 1e-6);
});

test("toMph scales linearly", () => {
  assert.ok(Math.abs(toMph(100) - 62.1371) < 1e-6);
  assert.equal(toMph(2), toMph(1) * 2);
});

test("wmo maps known codes and falls back for unknown", () => {
  assert.equal(wmo(0).label, "Clear sky");
  assert.equal(wmo(0).theme, "clear");
  assert.equal(wmo(95).theme, "storm");
  assert.equal(wmo(999).label, "Unknown");
  assert.equal(wmo(999).theme, "clouds");
});

test("wmo covers drizzle rain snow and hail", () => {
  assert.equal(wmo(1).theme, "clear");
  assert.equal(wmo(2).theme, "clouds");
  assert.equal(wmo(51).theme, "rain");
  assert.equal(wmo(61).theme, "rain");
  assert.equal(wmo(71).theme, "snow");
  assert.equal(wmo(82).theme, "storm");
  assert.equal(wmo(96).theme, "storm");
  assert.ok(wmo(0).emoji);
  assert.ok(wmo(999).emoji);
});

test("themeClass picks day/night for clear skies and weather themes", () => {
  assert.equal(themeClass(0, 1), "theme-clear-day");
  assert.equal(themeClass(0, 0), "theme-clear-night");
  assert.equal(themeClass(63, 1), "theme-rain");
  assert.equal(themeClass(75, 1), "theme-snow");
  assert.equal(themeClass(45, 1), "theme-fog");
  assert.equal(themeClass(3, 1), "theme-clouds");
  assert.equal(themeClass(999, 1), "theme-clouds");
});

test("themeClass is day-independent except for clear", () => {
  assert.equal(themeClass(1, 1), "theme-clear-day");
  assert.equal(themeClass(1, 0), "theme-clear-night");
  assert.equal(themeClass(95, 0), "theme-storm");
  assert.equal(themeClass(95, 1), "theme-storm");
  assert.equal(themeClass(48, 0), "theme-fog");
  assert.equal(themeClass(73, 0), "theme-snow");
});

test("hourlyStartIndex picks the slot at or just before current time", () => {
  const times = ["2026-08-12T10:00", "2026-08-12T11:00", "2026-08-12T12:00"];
  assert.equal(hourlyStartIndex(times, "2026-08-12T11:00"), 1);
  assert.equal(hourlyStartIndex(times, "2026-08-12T11:30"), 1);
  assert.equal(hourlyStartIndex(times, "2026-08-12T09:00"), 0);
  assert.equal(hourlyStartIndex(times, "2026-08-12T12:00"), 2);
  assert.equal(hourlyStartIndex([], "2026-08-12T11:00"), 0);
  assert.equal(hourlyStartIndex(times, null), 0);
});

test("hourlyStartIndex treats missing times and after-last as edges", () => {
  const times = ["2026-08-12T10:00", "2026-08-12T11:00"];
  assert.equal(hourlyStartIndex(undefined, "2026-08-12T11:00"), 0);
  assert.equal(hourlyStartIndex(times, undefined), 0);
  assert.equal(hourlyStartIndex(times, "2026-08-12T18:00"), 1);
});

test("DEFAULT_PLACE is San Francisco", () => {
  assert.equal(DEFAULT_PLACE.name, "San Francisco");
  assert.equal(typeof DEFAULT_PLACE.latitude, "number");
  assert.equal(typeof DEFAULT_PLACE.longitude, "number");
});

test("DEFAULT_PLACE has region country and SF coordinates", () => {
  assert.equal(DEFAULT_PLACE.admin1, "California");
  assert.equal(DEFAULT_PLACE.country, "United States");
  assert.ok(DEFAULT_PLACE.latitude > 37 && DEFAULT_PLACE.latitude < 38);
  assert.ok(DEFAULT_PLACE.longitude < -122 && DEFAULT_PLACE.longitude > -123);
});

test("DEFAULT_PLACE name is non-empty", () => {
  assert.equal(typeof DEFAULT_PLACE.name, "string");
  assert.ok(DEFAULT_PLACE.name.length > 0);
});
