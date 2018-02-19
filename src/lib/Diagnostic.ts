export enum Severity {
  INFO = 1,
  WARNING,
  ERROR
}

export class Diagnostic {
  children: Diagnostic[]
  message: string
  data: any
  severity: Severity

  constructor(sev: Severity, mess: string, d?: any) {
    this.severity = sev
    this.message = mess
    this.data = d
  }
}
