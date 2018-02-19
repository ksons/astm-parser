"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Severity;
(function (Severity) {
    Severity[Severity["INFO"] = 1] = "INFO";
    Severity[Severity["WARNING"] = 2] = "WARNING";
    Severity[Severity["ERROR"] = 3] = "ERROR";
})(Severity = exports.Severity || (exports.Severity = {}));
class Diagnostic {
    constructor(sev, mess, d) {
        this.severity = sev;
        this.message = mess;
        this.data = d;
    }
}
exports.Diagnostic = Diagnostic;
//# sourceMappingURL=Diagnostic.js.map