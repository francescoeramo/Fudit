export declare const catalogMatchers: Array<[string, RegExp]>;
export declare const exclusions: Record<string, RegExp>;
export function normalize(value: unknown): string;
export function catalogIdFor(value: unknown): string | null;
