/**
 * Minimal papaparse types that expose Papa namespace and module.
 * Temporary shim to unblock builds — replace with official types later.
 */

export as namespace Papa;

declare namespace Papa {
  export interface ParseError {
    type: 'Quotes' | 'Delimiter' | 'FieldMismatch' | string;
    code?: string;
    message?: string;
    row?: number;
  }

  export type ParseResult<T = any> = {
    data: T[];
    errors: ParseError[];
    meta?: any;
  };

  export interface ParseConfig<T = any> {
    header?: boolean;
    skipEmptyLines?: boolean | string;
    complete?: (results: ParseResult<T>) => void;
    error?: (err: any) => void;
    transformHeader?(h: string): string;
    [key: string]: any;
  }

  function parse<T = any>(input: File | string | Blob, config?: ParseConfig<T>): ParseResult<T> | void;
  const _parse: typeof parse;
}

declare module 'papaparse' {
  export = Papa;
}
