/**
 * setup-tesseract-assets.js
 * Ejecutar UNA SOLA VEZ desde la raíz del proyecto:
 *   node setup-tesseract-assets.js
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

// En este proyecto los assets van en /public (no src/assets)
const TESSERACT_DIR = path.join(__dirname, 'public', 'tesseract');
const TESSDATA_DIR  = path.join(__dirname, 'public', 'tessdata');

[TESSERACT_DIR, TESSDATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Carpeta creada:', dir);
    }
});

// 1. Copiar worker.min.js
const workerSrc = path.join(__dirname, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
const workerDst = path.join(TESSERACT_DIR, 'worker.min.js');
if (fs.existsSync(workerSrc)) {
    fs.copyFileSync(workerSrc, workerDst);
    console.log('✓ worker.min.js copiado');
} else {
    console.error('✗ No encontrado. Ejecuta: npm install tesseract.js');
    process.exit(1);
}

// 2. Copiar todos los archivos core de tesseract.js-core
const coreBaseDir = path.join(__dirname, 'node_modules', 'tesseract.js-core');
const coreFiles = [
    'tesseract-core-relaxedsimd-lstm.wasm.js',
    'tesseract-core-relaxedsimd-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-lstm.wasm',
];
if (!fs.existsSync(coreBaseDir)) {
    console.error('✗ tesseract.js-core no encontrado. Ejecuta: npm install tesseract.js-core');
    process.exit(1);
}
for (const file of coreFiles) {
    const src = path.join(coreBaseDir, file);
    const dst = path.join(TESSERACT_DIR, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log(`✓ ${file} copiado`);
    } else {
        console.warn(`⚠ No encontrado (opcional): ${file}`);
    }
}

// 3. Descargar mrz.traineddata (fast, ~1.4 MB) y comprimir
// Fuente: https://github.com/DoubangoTelecom/tesseractMRZ
const mrzGzDst  = path.join(TESSDATA_DIR, 'mrz.traineddata.gz');
const mrzRawDst = path.join(TESSDATA_DIR, 'mrz.traineddata');
if (fs.existsSync(mrzGzDst)) {
    console.log('✓ mrz.traineddata.gz ya existe');
    done();
} else if (fs.existsSync(mrzRawDst)) {
    console.log('✓ mrz.traineddata ya existe (sin comprimir)');
    done();
} else {
    console.log('Descargando mrz.traineddata (~1.4 MB)...');
    download(
        'https://raw.githubusercontent.com/DoubangoTelecom/tesseractMRZ/master/tessdata_fast/mrz.traineddata',
        mrzRawDst,
        () => {
            console.log('✓ mrz.traineddata descargado');
            // Comprimir con gzip
            const zlib = require('zlib');
            const inp  = fs.createReadStream(mrzRawDst);
            const out  = fs.createWriteStream(mrzGzDst);
            inp.pipe(zlib.createGzip()).pipe(out);
            out.on('finish', () => {
                console.log('✓ mrz.traineddata.gz creado');
                done();
            });
        }
    );
}

function download(url, dest, cb) {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            file.close();
            download(res.headers.location, dest, cb);
            return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); cb(); });
    }).on('error', err => {
        fs.unlinkSync(dest);
        console.error('✗ Error al descargar:', err.message);
        console.error('  Descárgalo manualmente y ponlo en public/tessdata/mrz.traineddata.gz');
    });
}

function done() {
    console.log('\n✅ Listo. Archivos en:');
    console.log('   public/tesseract/worker.min.js');
    console.log('   public/tesseract/tesseract-core-relaxedsimd-lstm.wasm.js (.wasm)');
    console.log('   public/tesseract/tesseract-core-simd-lstm.wasm.js (.wasm)');
    console.log('   public/tesseract/tesseract-core-lstm.wasm.js (.wasm)');
    console.log('   public/tessdata/mrz.traineddata.gz');
    console.log('\nNo necesitas cambiar angular.json — public/ ya está configurado como assets.');
    console.log('Reinicia el servidor: ng serve\n');
}
