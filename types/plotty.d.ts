// /types/plotty.d.ts
declare module "plotty" {
  export default class plot {
    constructor(options?: any)
    render(): void
    setData(data: Float32Array | number[]): void
    setDomain(min: number, max: number): void
    setColorScale(scale: string): void
    getColorScale(): string
    getCanvas(): HTMLCanvasElement
  }

  export function addColorScale(arg0: string, arg1: (string | number)[][]) {
    throw new Error("Function not implemented.");
  }
}
