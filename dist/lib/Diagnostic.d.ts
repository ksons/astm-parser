export declare enum Severity {
  INFO = 1,
  WARNING = 2,
  ERROR = 3
}
export declare class Diagnostic {
  children: Diagnostic[];
  message: string;
  data: any;
  severity: Severity;
  constructor(sev: Severity, mess: string, d?: any);
}
