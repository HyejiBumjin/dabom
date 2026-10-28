declare module "lunar-javascript" {
  export const Lunar: {
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): {
      getSolar(): { toYmd(): string };
    };
  };
}
