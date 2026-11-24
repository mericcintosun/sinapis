// @relate/relate-wasm ships its own relate.d.ts. The worker declares the narrow slice it
// uses (init, RelateDb.open, execute) as local interfaces in lib/relate.worker.ts, so the
// module is kept loose here and the build does not depend on the generated typings (which
// need the DOM and WebAssembly lib types when skipLibCheck is off).
declare module "@relate/relate-wasm";
