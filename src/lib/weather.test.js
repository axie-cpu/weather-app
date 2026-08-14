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
});

test("toMph converts km/h to mph", () => {
  assert.equal(toMph(0), 0);
  assert.ok(Math.abs(toMph(1) - 0.621371) < 1e-9);
  assert.ok(Math.abs(toMph(16) - 9.941936) < 1e-6);
});

test("wmo maps known codes and falls back for unknown", () => {
  assert.equal(wmo(0).label, "Clear sky");
  assert.equal(wmo(0).theme, "clear");
  assert.equal(wmo(95).theme, "storm");
  assert.equal(wmo(999).label, "Unknown");
  assert.equal(wmo(999).theme, "clouds");
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

test("hourlyStartIndex picks the slot at or just before current time", () => {
  const times = ["2026-08-12T10:00", "2026-08-12T11:00", "2026-08-12T12:00"];
  assert.equal(hourlyStartIndex(times, "2026-08-12T11:00"), 1);
  assert.equal(hourlyStartIndex(times, "2026-08-12T11:30"), 1);
  assert.equal(hourlyStartIndex(times, "2026-08-12T09:00"), 0);
  assert.equal(hourlyStartIndex(times, "2026-08-12T12:00"), 2);
  assert.equal(hourlyStartIndex([], "2026-08-12T11:00"), 0);
  assert.equal(hourlyStartIndex(times, null), 0);
});

test("DEFAULT_PLACE is San Francisco", () => {
  assert.equal(DEFAULT_PLACE.name, "San Francisco");
  assert.equal(typeof DEFAULT_PLACE.latitude, "number");
  assert.equal(typeof DEFAULT_PLACE.longitude, "number");
});

test("DEFAULT_PLACE has a country code", () => {
  assert.ok(DEFAULT_PLACE.country || DEFAULT_PLACE.country_code || DEFAULT_PLACE.admin1);
});
