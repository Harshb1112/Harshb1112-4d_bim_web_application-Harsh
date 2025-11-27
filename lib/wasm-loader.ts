// Custom WASM loader for web-ifc in browser
export async function loadWebIfcWasm() {
  try {
    // Try to load from public directory
    const response = await fetch('/wasm/web-ifc.wasm');
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM: ${response.status}`);
    }
    const wasmBinary = await response.arrayBuffer();
    return wasmBinary;
  } catch (error) {
    console.error('Failed to load WASM from /wasm/', error);
    throw error;
  }
}
