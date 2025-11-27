const fs = require('fs');
const path = require('path');

// Create public/wasm directory if it doesn't exist
const wasmDir = path.join(__dirname, '..', 'public', 'wasm');
if (!fs.existsSync(wasmDir)) {
  fs.mkdirSync(wasmDir, { recursive: true });
}

// Copy WASM files from web-ifc
const sourceDir = path.join(__dirname, '..', 'node_modules', 'web-ifc');

// Copy the multi-threaded version as the main file
const mtSource = path.join(sourceDir, 'web-ifc-mt.wasm');
const mainDest = path.join(wasmDir, 'web-ifc.wasm');

if (fs.existsSync(mtSource)) {
  fs.copyFileSync(mtSource, mainDest);
  console.log('Copied web-ifc-mt.wasm to public/wasm/web-ifc.wasm');
}

// Copy all other WASM files
const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.wasm'));

files.forEach(file => {
  const source = path.join(sourceDir, file);
  const dest = path.join(wasmDir, file);
  fs.copyFileSync(source, dest);
  console.log(`Copied ${file} to public/wasm/`);
});

console.log('WASM files copied successfully!');
