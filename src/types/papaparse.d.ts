declare module 'papaparse' {
  // Matches the shape used by PapaParse consumers (type + code + message + row)
  export interface ParseError {
    type: string;
    code?: string;
    message?: string;
    row?: number;
  }

  export type ParseResult<T> = {
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
    // allow any additional options
    [key: string]: any;
  }

  export const parse: <T = any>(input: File | string | Blob, config?: ParseConfig<T>) => ParseResult<T> | void;
  const Papa: { parse: typeof parse };
  export default Papa;
}
