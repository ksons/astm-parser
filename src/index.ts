// @ts-ignore
import * as DXFParser from 'dxf-parser'
import * as fs from 'fs'
import * as DXF from './dxf'
import { Diagnostic, Severity } from './lib/Diagnostic'

const enum ASTMLayers {
  Boundery = 1,
  TurnPoints = 2,
  CurvePoints = 3,
  Notches = 4,
  GradeReference = 5,
  MirrorLine = 6,
  GrainLine = 7,
  InternalLines = 8,
  DrillHoles = 13,
  AnnotationText = 15,
  ASTMBoundery = 84,
  ASTMInternalLines = 85
}

interface IVertex {
  x: number
  y: number
}

interface IShape {
  lengths: number[]
  vertices: number[]
  metadata?: any
}

export interface IPatternPiece {
  name: string
  shapes: object
  internalShapes: object
  turnPoints: object
  curvePoints: object
  grainLines: object
  notches: object
}

export interface IOpenPatternFormat {
  pieces: IPatternPiece[]
  sizes: number[]
  vertices: number[]
  baseSize: number
}

export interface IReturnValue {
  data: IOpenPatternFormat
  diagnostics: Diagnostic[]
}

class ASTMParser {
  vertices: number[] = []
  count = 0
  diagnostics: Diagnostic[] = []

  parseStream(stream: fs.ReadStream, callback: (err: Error, msg: IReturnValue) => void) {
    try {
      const parser = new DXFParser()
      parser.parseStream(stream, this._transform.bind(this, callback))
    } catch (e) {
      console.log(e)
    }
  }

  private _transform(callback: (err: Error, msg?: IReturnValue) => void, err: Error, dxf: DXF.DxfSchema) {
    if (err) {
      callback(err)
    }

    const pieceMap = new Map()
    const sizeSet = new Set()
    let foundError = false

    Object.keys(dxf.blocks).forEach(key => {
      const block = dxf.blocks[key]

      const size = +this._findKey(block.entities, 'size')
      if (size !== null) {
        sizeSet.add(size)
      }

      const name = this._findKey(block.entities, 'piece name')
      if (name === null) {
        this.diagnostics.push(new Diagnostic(Severity.ERROR, 'Missing required field piece name', block))
        foundError = true
        return
      }
      let actualPiece = pieceMap.get(name)
      if (!actualPiece) {
        actualPiece = { name, shapes: {}, internalShapes: {}, turnPoints: {}, curvePoints: {}, grainLines: {}, notches: {} }
        pieceMap.set(name, actualPiece)
      }
      actualPiece.shapes[size] = this._createBoundery(block.entities)
      actualPiece.internalShapes[size] = this._createInternalShapes(block.entities)
      actualPiece.turnPoints[size] = this._createPoints(block.entities, ASTMLayers.TurnPoints)
      actualPiece.curvePoints[size] = this._createPoints(block.entities, ASTMLayers.CurvePoints)
      actualPiece.notches[size] = this._createPoints(block.entities, ASTMLayers.Notches)
      actualPiece.grainLines[size] = this._createLines(block.entities, ASTMLayers.GrainLine)
      this._checkBlock(block.entities)
    })

    const baseSizeStr = this._findKey(dxf.entities, 'sample size')
    const baseSize = baseSizeStr ? +baseSizeStr : 36

    // console.log(this.count)
    err = foundError ? new Error(this.diagnostics.map(diag => diag.message).join('\n')) : null
    const ret: IReturnValue = {
      data: {
        baseSize,
        pieces: Array.from(pieceMap.values()),
        sizes: Array.from(sizeSet).sort(),
        vertices: this.vertices
      },
      diagnostics: this.diagnostics
    }

    callback(err, ret)
  }

  private _checkBlock(entities: DXF.BlockEntity[]) {
    entities.forEach(entity => {
      switch (+entity.layer) {
        case ASTMLayers.Boundery:
        case ASTMLayers.InternalLines:
        case ASTMLayers.TurnPoints:
        case ASTMLayers.CurvePoints:
        case ASTMLayers.GrainLine:
        case ASTMLayers.Notches:
          break
        case ASTMLayers.GradeReference:
          this.diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: Grade Reference`, entity))
          break
        case ASTMLayers.AnnotationText:
          this.diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: Annotation Text`, entity))
          break
        case ASTMLayers.ASTMBoundery:
          this.diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Boundery`, entity))
          break
        case ASTMLayers.ASTMInternalLines:
          this.diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Internal Lines`, entity))
          break
        case ASTMLayers.MirrorLine:
          this.diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: Mirror Line`, entity))
          break
        case ASTMLayers.DrillHoles:
          this.diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: Drill Holes`, entity))
          break
        default:
          this.diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: `, entity))
      }
    })
  }

  private _getVertexIndex(vertex: DXF.Vertex | DXF.Point) {
    this.count++

    const fx = vertex.x * 25.4
    const fy = vertex.y * 25.4

    for (let i = 0; i < this.vertices.length / 2; i++) {
      const x = this.vertices[i * 2]
      const y = this.vertices[i * 2 + 1]
      if (x === fx && y === fy) {
        return i
      }
    }
    this.vertices.push(fx, fy)
    return this.vertices.length / 2 - 1
  }

  private _findKey(entities: DXF.BlockEntity[], key: string): string | null {
    for (const entity of entities) {
      if (entity.type === 'TEXT') {
        const result = getTextKeyValue(entity)
        if (!result) {
          this.diagnostics.push(new Diagnostic(Severity.WARNING, 'Unexpected sytax in key-value text string: ' + entity.text, entity))
          continue
        }
        if (result.key.toLowerCase() === key) {
          return result.value
        }
      }
    }
    return null
  }

  private _createLines(entities: DXF.BlockEntity[], layer: ASTMLayers) {
    const shape: IShape = {
      lengths: [],
      metadata: {},
      vertices: []
    }
    entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
      switch (entity.type) {
        case 'LINE':
          if (entity.vertices.length !== 2) {
            this.diagnostics.push(new Diagnostic(Severity.WARNING, `Found line with more than 2 vertices: '${entity.vertices.length}'`, entity.vertices))
          }
          shape.lengths.push(2)
          shape.vertices.push(this._getVertexIndex(entity.vertices[0]))
          shape.vertices.push(this._getVertexIndex(entity.vertices[1]))
          break
        case 'TEXT':
          const metadata = shape.metadata
          if (!metadata.astm) {
            metadata.astm = []
          }
          metadata.astm.push(entity.text)
          break
        default:
          this.diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in turn points: '${entity.type}'`, entity))
      }
    })
    return shape
  }

  private _createPoints(entities: DXF.BlockEntity[], layer: ASTMLayers) {
    const shape: IShape = {
      lengths: [],
      metadata: {},
      vertices: []
    }
    entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
      switch (entity.type) {
        case 'POINT':
          shape.lengths.push(1)
          shape.vertices.push(this._getVertexIndex(entity.position))
          break
        case 'TEXT':
          const metadata = shape.metadata
          if (!metadata.astm) {
            metadata.astm = []
          }
          metadata.astm.push(entity.text)
          break
        default:
          this.diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity))
      }
    })
    return shape
  }

  private _createBoundery(entities: DXF.BlockEntity[]) {
    const shape: IShape = {
      lengths: [],
      metadata: {},
      vertices: []
    }
    entities.filter(entity => entity.layer === ASTMLayers.Boundery.toString()).forEach(entity => {
      switch (entity.type) {
        case 'POLYLINE':
          shape.lengths.push(entity.vertices.length)
          entity.vertices.forEach(vertex => {
            shape.vertices.push(this._getVertexIndex(vertex))
          })
          break
        case 'LINE':
          shape.lengths.push(entity.vertices.length)
          entity.vertices.forEach(vertex => {
            shape.vertices.push(this._getVertexIndex(vertex))
          })
          break
        case 'TEXT':
          const metadata = shape.metadata
          if (!metadata.astm) {
            metadata.astm = []
          }
          metadata.astm.push(entity.text)
          break
        default:
        // this.diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in boundery shape: '${entity.type}'`, entity))
      }
    })

    return shape
  }

  private _createInternalShapes(entities: DXF.BlockEntity[]) {
    const shape: IShape = {
      lengths: [],
      metadata: {},
      vertices: []
    }
    entities.filter(entity => entity.layer === ASTMLayers.InternalLines.toString()).forEach(entity => {
      switch (entity.type) {
        case 'POLYLINE':
          shape.lengths.push(entity.vertices.length)
          entity.vertices.forEach(vertex => {
            shape.vertices.push(this._getVertexIndex(vertex))
          })
          break
        case 'LINE':
          shape.lengths.push(entity.vertices.length)
          entity.vertices.forEach(vertex => {
            shape.vertices.push(this._getVertexIndex(vertex))
          })
          break
        case 'TEXT':
          const metadata = shape.metadata
          if (!metadata.astm) {
            metadata.astm = []
          }
          // console.log(entity.text)
          metadata.astm.push(entity.text)
          break
        default:
          this.diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected type in internal shape: '${entity.type}'`, entity))
      }
    })

    return shape
  }
}

function isText(entity: DXF.BlockEntity): entity is DXF.EntityText {
  return (entity as DXF.EntityText).type === 'TEXT'
}

function isPolyLine(entity: DXF.BlockEntity): entity is DXF.EntityPolyline {
  return (entity as DXF.EntityPolyline).type === 'POLYLINE'
}

function getTextKeyValue(entity: DXF.EntityText): { key: string; value: string } | null {
  const text = entity.text
  const splitPos = text.indexOf(':')
  if (splitPos === -1) {
    return null
  }
  return {
    key: text.substr(0, splitPos),
    value: text.substr(splitPos + 1).trim()
  }
}

export { ASTMParser }
