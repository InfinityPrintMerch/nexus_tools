// Configura el worker local de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../lib/pdf.worker.min.js';

// Fuerza a PDF.js a usar fuentes genéricas del navegador
pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = null;

// Elementos DOM
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const textOverlay = document.getElementById('textOverlay');
const uploadArea = document.getElementById('uploadArea');
const pdfInput = document.getElementById('pdfInput');
const editorSection = document.getElementById('editorSection');

let pdfDoc = null; // Para pdf.js (visualización)
let scale = 1;

uploadArea.addEventListener('click', () => pdfInput.click());
uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handlePDFUpload(e.dataTransfer.files[0]);
});
pdfInput.addEventListener('change', e => {
    if (e.target.files.length) handlePDFUpload(e.target.files[0]);
});

async function handlePDFUpload(file) {
    const arrayBuffer = await file.arrayBuffer();

    // Parámetros clave para evitar que PDF.js busque fuentes remotas
    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableFontFace: true, // Evita la carga de @font-face CSS externos
        useWorkerFetch: false  // Obligatorio si estás completamente offline sin servidor
    });

    pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";

    const wrapper = canvas.parentElement;
    if (wrapper) {
        wrapper.style.width = viewport.width + "px";
        wrapper.style.height = viewport.height + "px";
    }

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Centrar texto inicialmente
    textOverlay.style.left = `${viewport.width / 2 - 50}px`;
    textOverlay.style.top = `${viewport.height / 2 - 20}px`;

    const fontSizeInput = document.getElementById('fontSize');
    const fontSelect = document.getElementById('fontSelect');
    const fontColorInput = document.getElementById('fontColor');

    if (fontSizeInput) textOverlay.style.fontSize = fontSizeInput.value + 'px';
    if (fontSelect) textOverlay.style.fontFamily = fontSelect.value;
    if (fontColorInput) textOverlay.style.color = fontColorInput.value;

    uploadArea.style.display = 'none';
    editorSection.style.display = 'flex';
}

// Drag & drop texto
let dragging = false, startX = 0, startY = 0;
textOverlay.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX - textOverlay.offsetLeft;
    startY = e.clientY - textOverlay.offsetTop;
    e.preventDefault();
});
document.addEventListener('mousemove', e => {
    if (!dragging) return;
    textOverlay.style.left = `${e.clientX - startX}px`;
    textOverlay.style.top = `${e.clientY - startY}px`;
});
document.addEventListener('mouseup', () => dragging = false);

// Cambios de estilo en tiempo real
const fontSelect = document.getElementById('fontSelect');
const fontSizeInput = document.getElementById('fontSize');
const fontColorInput = document.getElementById('fontColor');

if (fontSelect) {
    fontSelect.addEventListener('change', e => {
        textOverlay.style.fontFamily = e.target.value;
    });
}
if (fontSizeInput) {
    fontSizeInput.addEventListener('input', e => {
        textOverlay.style.fontSize = e.target.value + 'px';
    });
}
if (fontColorInput) {
    fontColorInput.addEventListener('input', e => {
        textOverlay.style.color = e.target.value;
    });
}

// Carga fuente .ttf desde ruta
async function loadFontBytes(fontFilePath) {
    const response = await fetch(fontFilePath);
    if (!response.ok) throw new Error('No se pudo cargar la fuente: ' + fontFilePath);
    return await response.arrayBuffer();
}

// Convertir hex a RGB
function hexToRgb(hex) {
    if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
        return { r: 0, g: 0, b: 0 };
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[1] + hex[1], 16),
            g: parseInt(hex[2] + hex[2], 16),
            b: parseInt(hex[3] + hex[3], 16)
        };
    }
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

// Generar PDF con nombres
document.getElementById('generateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('generateBtn');

    if (!pdfDoc) {
        alert('Primero carga un PDF.');
        return;
    }

    const namesRaw = document.getElementById('nameList').value.trim();
    if (!namesRaw) {
        alert('Ingresa al menos un nombre en la lista.');
        return;
    }

    const names = namesRaw.split('\n').filter(n => n.trim());
    const fontName = fontSelect.value;
    const fontSize = parseInt(fontSizeInput.value);
    const colorHex = fontColorInput.value;
    const color = hexToRgb(colorHex);

    if (!(fontName in fontMap)) {
        alert('Fuente no soportada. Selecciona una válida.');
        return;
    }

    // Efecto de carga en el botón
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generando...';
    btn.disabled = true;

    try {
        const fontBytes = await loadFontBytes(fontMap[fontName]);
        const originalBytes = await pdfDoc.getData();

        // Crear documento nuevo
        const pdfNewDoc = await PDFLib.PDFDocument.create();

        // Registrar fontkit en la instancia
        pdfNewDoc.registerFontkit(fontkit);

        // Embed el PDF original como plantilla
        const [template] = await pdfNewDoc.embedPdf(originalBytes);

        // Embed la fuente custom
        const font = await pdfNewDoc.embedFont(fontBytes);

        // Posición relativa del texto sobre canvas
        const overlayRect = textOverlay.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const relativeX = overlayRect.left - canvasRect.left;
        const relativeY = overlayRect.top - canvasRect.top;

        // Coordenadas PDF (origen abajo-izquierda)
        const xPDF = relativeX;
        const yPDF = canvas.height - (relativeY + fontSize);

        for (const name of names) {
            const page = pdfNewDoc.addPage([template.width, template.height]);
            page.drawPage(template);
            page.drawText(name, {
                x: xPDF,
                y: yPDF,
                size: fontSize,
                font,
                color: PDFLib.rgb(color.r / 255, color.g / 255, color.b / 255)
            });
        }

        const finalBytes = await pdfNewDoc.save();
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.getElementById('downloadLink');
        link.href = url;
        link.style.display = 'inline-flex';

    } catch (error) {
        alert('Error generando PDF: ' + error.message);
        console.error(error);
    } finally {
        // Restaurar estado del botón
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});