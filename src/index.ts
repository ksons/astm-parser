// @ts-ignore
import * as DXFParser from 'dxf-parser'
import * as fs from 'fs'
import * as DXF from './dxf'

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
}

export interface IOpenPatternFormat {
  pieces: IPatternPiece[]
  sizes: number[]
  vertices: number[]
  baseSize: number
}

class ASTMParser {
  vertices: number[] = []
  count = 0

  parseStream(stream: fs.ReadStream, callback: (err: Error, msg: IOpenPatternFormat) => void) {
    try {
      const parser = new DXFParser()
      parser.parseStream(stream, this._transform.bind(this, callback))
    } catch (e) {
      console.log(e)
    }
  }

  private _transform(callback: (err: Error, msg?: IOpenPatternFormat) => void, err: Error, dxf: DXF.DxfSchema) {
    if (err) {
      callback(err)
    }

    const pieceMap = new Map()
    const sizeSet = new Set()

    Object.keys(dxf.blocks).forEach(key => {
      const value = dxf.blocks[key]

      const size = +this._findKey(value.entities, 'size')
      if (size !== null) {
        sizeSet.add(size)
      }

      const name = this._findKey(value.entities, 'piece name')
      if (name === null) {
        // TODO: Error handling
      }
      let actualPiece = pieceMap.get(name)
      if (!actualPiece) {
        actualPiece = { name, shapes: {}, internalShapes: {} }
        pieceMap.set(name, actualPiece)
      }
      actualPiece.shapes[size] = this._createBoundery(value.entities)
      actualPiece.internalShapes[size] = this._createInternalShapes(value.entities)
    })

    const baseSizeStr = this._findKey(dxf.entities, 'sample size')
    const baseSize = baseSizeStr ? +baseSizeStr : 36

    // console.log(this.count)

    callback(err, {
      baseSize,
      pieces: Array.from(pieceMap.values()),
      sizes: Array.from(sizeSet).sort(),
      vertices: this.vertices
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
    const candidate = entities.find(entity => {
      if (isText(entity)) {
        const result = getTextKeyValue(entity)
        if (!result) {
          return false
        }
        return result.key.toLowerCase() === key
      }
      return false
    })
    return candidate ? getTextKeyValue(candidate).value : null
  }

  private _createBoundery(entities: DXF.BlockEntity[]) {
    const shape: IShape = {
      lengths: [],
      metadata: {},
      vertices: []
    }
    entities.forEach(entity => {
      if (+entity.layer !== 1) {
        return
      }
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
        // console.warn('Non polyline boundery', entity.type)
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
    entities.filter(entity => +entity.layer === 8).forEach(entity => {
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
          console.warn('Unexpected type in internal shape:', entity.type)
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
