/*
 * STEP 0 — 만세력 라이브러리 검증 스파이크
 *
 * 실행: npm run saju:spike
 * 출력: 각 경계 케이스의 원국, 오행, 십신, 대운·세운·월운 지원 범위
 *
 * 이 파일은 제품 코드가 아니다. lunar-javascript의 API와 한국식 정책에서
 * 별도로 구현할 항목을 확인하기 위한 일회성 검증 도구다.
 */

const { Solar } = require("lunar-javascript");

const CASES = [
  {
    id: "prompt-example",
    label: "PRD 예시 입력",
    birth: [1995, 5, 20, 20, 20],
    gender: "female",
  },
  {
    id: "before-ipchun",
    label: "입춘 직전",
    birth: [1995, 2, 4, 3, 0],
    gender: "female",
  },
  {
    id: "after-ipchun",
    label: "입춘 직후",
    // lunar-javascript 기준 1995년 입춘: 1995-02-04 15:12:51
    birth: [1995, 2, 4, 16, 0],
    gender: "female",
  },
  {
    id: "late-zi",
    label: "야자시 (23:30)",
    birth: [1995, 5, 20, 23, 30],
    gender: "female",
  },
  {
    id: "early-zi",
    label: "조자시 (00:30)",
    birth: [1995, 5, 21, 0, 30],
    gender: "female",
  },
  {
    id: "dst-korea",
    label: "한국 서머타임 기간",
    birth: [1988, 7, 1, 12, 0],
    gender: "male",
  },
];

function toPillar(key, eightChar) {
  const methods = {
    year: ["getYear", "getYearGan", "getYearZhi", "getYearHideGan", "getYearShiShenGan", "getYearShiShenZhi"],
    month: ["getMonth", "getMonthGan", "getMonthZhi", "getMonthHideGan", "getMonthShiShenGan", "getMonthShiShenZhi"],
    day: ["getDay", "getDayGan", "getDayZhi", "getDayHideGan", "getDayShiShenGan", "getDayShiShenZhi"],
    hour: ["getTime", "getTimeGan", "getTimeZhi", "getTimeHideGan", "getTimeShiShenGan", "getTimeShiShenZhi"],
  };
  const [pillar, gan, zhi, hiddenStems, stemTenGod, hiddenTenGods] = methods[key].map((method) => eightChar[method]());

  return { pillar, gan, zhi, hiddenStems, stemTenGod, hiddenTenGods };
}

function normalizeCase(input) {
  const [year, month, day, hour, minute] = input.birth;
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 6tail API: gender=1 남성, gender=0 여성. sect=2는 당일 자시를 쓰는 정책이다.
  const yun = eightChar.getYun(input.gender === "male" ? 1 : 0, 2);
  const daYun = yun.getDaYun(10).slice(1);

  return {
    input,
    libraryPolicy: {
      timezone: "library-default (출생지·경도 보정 미지원 확인 필요)",
      dayBoundary: "sect-2 (23:00~23:59를 당일로 계산)",
      note: "한국식 야자시를 채택하려면 sect-1 결과와 대조 후 서비스 정책으로 확정한다.",
    },
    solar: solar.toYmdHms(),
    lunar: lunar.toString(),
    pillars: {
      year: toPillar("year", eightChar),
      month: toPillar("month", eightChar),
      day: toPillar("day", eightChar),
      hour: toPillar("hour", eightChar),
    },
    dayMaster: eightChar.getDayGan(),
    elementPairs: [
      eightChar.getYearWuXing(),
      eightChar.getMonthWuXing(),
      eightChar.getDayWuXing(),
      eightChar.getTimeWuXing(),
    ],
    fortuneCycle: {
      direction: yun.isForward() ? "forward" : "backward",
      startsAt: yun.getStartSolar().toYmdHms(),
      daYun: daYun.map((period) => ({
        ganZhi: period.getGanZhi(),
        startYear: period.getStartYear(),
        endYear: period.getEndYear(),
        liuNian: period.getLiuNian().map((year) => ({
          year: year.getYear(),
          ganZhi: year.getGanZhi(),
          liuYue: year.getLiuYue().map((month, index) => ({
            ordinal: index + 1,
            ganZhi: month.getGanZhi(),
          })),
        })),
      })),
    },
    unsupportedByLibrary: [
      "한국식 신살 규칙(도화·역마·형살 등)의 서비스 표준화",
      "한국 출생지 경도 보정",
      "1987~1988년 한국 서머타임 보정",
      "국내 만세력과의 결과 대조 및 정책 확정",
    ],
  };
}

const results = CASES.map(normalizeCase);
console.log(JSON.stringify(results, null, 2));
