const j2t = require('json-schema-to-typescript')
const fs = require('fs')
const schema = require("./dxf.json")
// compile from file
j2t.compile(schema).then(ts => fs.writeFileSync('../src/dxf.d.ts', ts))
