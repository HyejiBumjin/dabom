/*
 * 외부 한국 만세력 reference fixture와 lunar-javascript의 사주 8글자를 비교한다.
 * 실행: npm run saju:compare
 */

const { Lunar, Solar } = require("lunar-javascript");
const fixture = require("./fixtures/sajuinfo-reference.json");

function calculate(year, month, day, hour, minute, inputType) {
  const lunar = inputType === "lunar-leap"
    ? Lunar.fromYmdHms(year, -month, day, hour, minute, 0)
    : Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const eightChar = lunar.getEightChar();
  // sect-2: 조자시(00:00~00:59)를 해당 양력일로 계산하는 정책
  eightChar.setSect(2);
  return [
    eightChar.getYear(),
    eightChar.getMonth(),
    eightChar.getDay(),
    eightChar.getTime(),
  ];
}

const results = fixture.cases.map(([id, year, month, day, hour, minute, expected, knownDifference, inputType = "solar"]) => {
  const actual = calculate(year, month, day, hour, minute, inputType);
  return {
    id,
    input: `${inputType === "lunar-leap" ? "음력 윤" : "양력 "}${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    expected,
    actual,
    matched: expected.join("") === actual.join(""),
    knownDifference,
  };
});

const unexpectedMismatches = results.filter((result) => !result.matched && !result.knownDifference);
const knownDifferences = results.filter((result) => !result.matched && result.knownDifference);
console.log(`Reference: ${fixture.source.name}`);
console.log(`Policy: ${fixture.source.policy}`);
console.log(`Exact matches: ${results.length - unexpectedMismatches.length - knownDifferences.length}/${results.length}`);
console.log(`Known policy differences: ${knownDifferences.length}`);

if (knownDifferences.length) {
  console.log("\nKnown policy differences:");
  knownDifferences.forEach((result) => {
    console.log(`- ${result.id}: ${result.knownDifference}`);
    console.log(`  reference: ${result.expected.join(" ")}`);
    console.log(`  library:   ${result.actual.join(" ")}`);
  });
}

if (unexpectedMismatches.length) {
  console.log("\nUnexpected mismatches:");
  unexpectedMismatches.forEach((result) => {
    console.log(`- ${result.id} (${result.input})`);
    console.log(`  reference: ${result.expected.join(" ")}`);
    console.log(`  library:   ${result.actual.join(" ")}`);
  });
  process.exitCode = 1;
}
