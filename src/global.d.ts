// TODO: Move this to a global definitions?
export interface ColorPoint {
  x: number
  y: number
  z?: number
  color?: number
}

export interface PointWithSize extends ColorPoint {
  size?: number
}

export interface Line {
  from: ColorPoint
  to: ColorPoint
}