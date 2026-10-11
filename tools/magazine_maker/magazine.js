const { PDFDocument, degrees } = PDFLib;

// Conversión de centímetros y pulgadas a puntos PDF (1 pulgada = 72 pt, 1 cm = 28.3464567 pt)
const CM_TO_PT = 28.3464567;
const INCH_TO_PT = 72;

// Catálogo de tamaños de Pliego (Hoja horizontal donde van 2 páginas)
const SHEET_PRESETS = {
    tabloide: { width: 17 * INCH_TO_PT, height: 11 * INCH_TO_PT },           // 1224 x 792 pt (43.18 x 27.94 cm)
    tabloide_rebasado: { width: 18 * INCH_TO_PT, height: 12 * INCH_TO_PT },  // 1296 x 864 pt (45.72 x 30.48 cm)
    super_tabloide: { width: 19 * INCH_TO_PT, height: 13 * INCH_TO_PT },     // 1368 x 936 pt (48.26 x 33.02 cm)
    carta: { width: 11 * INCH_TO_PT, height: 8.5 * INCH_TO_PT },             // 792 x 612 pt  (27.94 x 21.59 cm)
    oficio: { width: 14 * INCH_TO_PT, height: 8.5 * INCH_TO_PT }             // 1008 x 612 pt (35.56 x 21.59 cm)
};

// Catálogo de tamaños de Página individual (vertical)
const PAGE_PRESETS = {
    carta: { width: 8.5 * INCH_TO_PT, height: 11 * INCH_TO_PT },             // 612 x 792 pt
    media_carta: { width: 5.5 * INCH_TO_PT, height: 8.5 * INCH_TO_PT },      // 396 x 612 pt
    medio_oficio: { width: 7 * INCH_TO_PT, height: 8.5 * INCH_TO_PT },       // 504 x 612 pt
    a4: { width: 21.0 * CM_TO_PT, height: 29.7 * CM_TO_PT },
    a5: { width: 14.8 * CM_TO_PT, height: 21.0 * CM_TO_PT }
};

// Función para mostrar notificación flotante
function showToast(msg) {
    const toast = document.getElementById('globalToast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

// =========================================================================
// FUNCIÓN ORIGINAL INTACTA: Generar pares según patrón de revista
// =========================================================================
function generarPares(totalPaginas) {
    const pares = [];
    let i = 1;
    let j = totalPaginas;
    let offset = 0;

    while (i + offset <= j - offset) {
        if (j - offset >= i + offset) {
            pares.push([j - offset, i + offset]);
        }
        if (i + offset + 1 <= j - offset - 1) {
            pares.push([i + offset + 1, j - offset - 1]);
        }
        offset += 2;
    }
    return pares;
}

// Referencias del DOM
const dragDropArea = document.getElementById('dragDropArea');
const matViewport = document.getElementById('matViewport');
const inputPDF = document.getElementById('inputPDF');
const procesarBtn = document.getElementById('procesarBtn');
const descargarLink = document.getElementById('descargar');
const descargarPortadaBtn = document.getElementById('descargarPortadaBtn');
const previewContainer = document.getElementById('previewContainer');
const previewSection = document.getElementById('previewSection');
const pageSequenceGrid = document.getElementById('pageSequenceGrid');
const cargarOtroBtn = document.getElementById('cargarOtroBtn');
const btnQuickBlank = document.getElementById('btnQuickBlank');

// Controles de pestañas de vista
const tabPagesBtn = document.getElementById('tabPagesBtn');
const tabSpreadsBtn = document.getElementById('tabSpreadsBtn');

// Indicadores de estado
const viewerDocTitle = document.getElementById('viewerDocTitle');
const magazineStatusPill = document.getElementById('magazineStatusPill');
const multipleStatusPill = document.getElementById('multipleStatusPill');
const statTotalPages = document.getElementById('statTotalPages');
const statProcessState = document.getElementById('statProcessState');

// Controles de tamaño, páginas blancas y portada
const sheetSizeSelect = document.getElementById('sheetSizeSelect');
const customSheetDims = document.getElementById('customSheetDims');
const customSheetWidthCm = document.getElementById('customSheetWidthCm');
const customSheetHeightCm = document.getElementById('customSheetHeightCm');

const pageSizeSelect = document.getElementById('pageSizeSelect');
const customPageDims = document.getElementById('customPageDims');
const customPageWidthCm = document.getElementById('customPageWidthCm');
const customPageHeightCm = document.getElementById('customPageHeightCm');
const pageScaleMode = document.getElementById('pageScaleMode');

const blankInsertPos = document.getElementById('blankInsertPos');
const customBlankPosGroup = document.getElementById('customBlankPosGroup');
const customBlankIndex = document.getElementById('customBlankIndex');
const btnAddBlankPage = document.getElementById('btnAddBlankPage');
const btnAutoMultiple4 = document.getElementById('btnAutoMultiple4');

const coverOptionsContainer = document.getElementById('coverOptionsContainer');
const coverBackType = document.getElementById('coverBackType');

// Estado de la aplicación
let pdfBytesProcesado = null;
let archivoSeleccionado = null;
let pdfBufferOriginal = null;
let pageSequence = []; // [{ id, type: 'pdf' | 'blank', originalPageIndex, thumbDataUrl, dimsText }]
let itemCounter = 0;

// =========================================================================
// NAVEGACIÓN ENTRE VISTAS (1. ORDENAR PÁGINAS / 2. VISTA PREVIA PLIEGOS)
// =========================================================================
function switchView(viewName) {
    if (!archivoSeleccionado) return;

    if (viewName === 'pages') {
        tabPagesBtn.classList.add('active');
        tabSpreadsBtn.classList.remove('active');
        pageSequenceGrid.style.display = 'grid';
        previewSection.style.display = 'none';
    } else {
        tabPagesBtn.classList.remove('active');
        tabSpreadsBtn.classList.add('active');
        pageSequenceGrid.style.display = 'none';
        previewSection.style.display = 'block';
    }
}

tabPagesBtn.addEventListener('click', () => switchView('pages'));
tabSpreadsBtn.addEventListener('click', () => {
    if (!pdfBytesProcesado) {
        showToast('Procesa primero el PDF para ver la vista previa de los pliegos');
        return;
    }
    switchView('spreads');
});

// =========================================================================
// EVENTOS DE CONFIGURACIÓN LATERAL (TAMAÑOS, BLANCAS Y PORTADA)
// =========================================================================
sheetSizeSelect.addEventListener('change', () => {
    customSheetDims.style.display = sheetSizeSelect.value === 'custom' ? 'grid' : 'none';
    markNeedsReprocess();
});

pageSizeSelect.addEventListener('change', () => {
    customPageDims.style.display = pageSizeSelect.value === 'custom' ? 'grid' : 'none';
    markNeedsReprocess();
});

[customSheetWidthCm, customSheetHeightCm, customPageWidthCm, customPageHeightCm, pageScaleMode, coverBackType].forEach(el => {
    el.addEventListener('change', markNeedsReprocess);
});

blankInsertPos.addEventListener('change', () => {
    customBlankPosGroup.style.display = blankInsertPos.value === 'custom' ? 'flex' : 'none';
});

document.querySelectorAll('input[name="cover-mode"]').forEach(radio => {
    radio.addEventListener('change', e => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.mode-card').classList.add('active');

        const isIsolated = e.target.value === 'blank_back';
        coverOptionsContainer.style.display = isIsolated ? 'flex' : 'none';
        renderPageSequenceGrid();
        markNeedsReprocess();
    });
});

function markNeedsReprocess() {
    if (!archivoSeleccionado) return;
    procesarBtn.style.display = 'inline-flex';
    procesarBtn.disabled = false;
    if (pdfBytesProcesado) {
        procesarBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Actualizar Revista';
        statProcessState.textContent = 'Cambios pendientes de aplicar';
    }
}

// =========================================================================
// MANEJO DE DRAG & DROP PARA CARGAR ARCHIVO PDF
// =========================================================================
dragDropArea.addEventListener('dragover', e => {
    e.preventDefault();
    dragDropArea.classList.add('dragover');
});

dragDropArea.addEventListener('dragleave', e => {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');
});

dragDropArea.addEventListener('drop', e => {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            alert('Por favor, selecciona un archivo PDF válido.');
            return;
        }
        cargarArchivo(file);
    }
});

inputPDF.addEventListener('change', () => {
    if (inputPDF.files.length) {
        const file = inputPDF.files[0];
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            alert('Por favor, selecciona un archivo PDF válido.');
            return;
        }
        cargarArchivo(file);
    }
});

// =========================================================================
// CARGA DE ARCHIVO Y GENERACIÓN DE MESA DE PÁGINAS
// =========================================================================
async function cargarArchivo(file) {
    procesarBtn.style.display = 'inline-flex';
    procesarBtn.disabled = true;
    procesarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Leyendo páginas...';
    descargarLink.style.display = 'none';
    descargarPortadaBtn.style.display = 'none';
    previewContainer.innerHTML = '';
    previewSection.style.display = 'none';
    pdfBytesProcesado = null;
    archivoSeleccionado = file;

    dragDropArea.style.display = 'none';
    cargarOtroBtn.style.display = 'inline-flex';
    btnQuickBlank.style.display = 'inline-flex';
    btnAddBlankPage.disabled = false;
    btnAutoMultiple4.disabled = false;

    viewerDocTitle.textContent = file.name;
    magazineStatusPill.textContent = 'Analizando PDF...';
    statProcessState.textContent = 'Extrayendo miniaturas...';

    try {
        const buffer = await file.arrayBuffer();
        pdfBufferOriginal = new Uint8Array(buffer);

        await construirSecuenciaInicial(pdfBufferOriginal);

        switchView('pages');
        renderPageSequenceGrid();

        procesarBtn.disabled = false;
        procesarBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Procesar PDF';
        statProcessState.textContent = 'Listo para procesar';
        showToast(`PDF cargado (${pageSequence.length} páginas)`);
    } catch (err) {
        console.error(err);
        alert('Error al leer el archivo PDF: ' + err.message);
    }
}

async function construirSecuenciaInicial(uint8Array) {
    pageSequence = [];
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array.slice(0) });
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        const wCm = (vp1.width / CM_TO_PT).toFixed(1);
        const hCm = (vp1.height / CM_TO_PT).toFixed(1);

        const viewport = page.getViewport({ scale: 0.32 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        pageSequence.push({
            id: ++itemCounter,
            type: 'pdf',
            originalPageIndex: i - 1,
            originalPageNumber: i,
            thumbDataUrl: canvas.toDataURL('image/jpeg', 0.82),
            dimsText: `${wCm} × ${hCm} cm`
        });
    }
    await pdf.destroy();
}

// =========================================================================
// RENDERIZADO DE LA MESA DE PÁGINAS CON DRAG & DROP Y PÁGINAS EN BLANCO
// =========================================================================
function renderPageSequenceGrid() {
    if (!archivoSeleccionado) return;

    pageSequenceGrid.innerHTML = '';
    const total = pageSequence.length;

    pageSequence.forEach((item, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === total - 1 && total > 1;
        const isBlank = item.type === 'blank';

        const card = document.createElement('div');
        card.className = `file-card ${isFirst || isLast ? 'is-cover-page' : ''} ${isBlank ? 'is-blank-page' : ''}`;
        card.draggable = true;

        let roleBadgeHTML = '';
        if (isFirst) {
            roleBadgeHTML = `<div class="role-tag cover">Portada (1ra)</div>`;
        } else if (isLast) {
            roleBadgeHTML = `<div class="role-tag cover">Contraportada (Última)</div>`;
        }

        const previewContent = isBlank
            ? `<div class="blank-sheet-visual">
                   <i class="fa-regular fa-file"></i>
                   <span>PÁGINA EN BLANCO</span>
               </div>`
            : `<img src="${item.thumbDataUrl}" alt="Página ${idx + 1}">`;

        const titleText = isBlank ? 'Página en Blanco' : `Pág. Original ${item.originalPageNumber}`;
        const subText = isBlank ? 'Ajustada al tamaño' : item.dimsText;

        card.innerHTML = `
            <div class="preview-box" title="Arrastra para cambiar de posición">
                <div class="order-badge">#${idx + 1}</div>
                ${roleBadgeHTML}
                <button type="button" class="card-remove-btn" title="Eliminar esta página" onclick="window.removeSequencePage(${idx})">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                ${previewContent}
            </div>
            <div class="card-meta-row">
                <div class="card-title-wrap">
                    <div class="card-filename" title="${titleText}">${titleText}</div>
                    <div class="card-subtext">${subText}</div>
                </div>
                <div class="reorder-btns">
                    <button type="button" class="mini-icon-btn" title="Insertar página en blanco después de esta" onclick="window.insertBlankAfter(${idx})">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button type="button" class="mini-icon-btn" title="Mover antes" ${idx === 0 ? 'disabled' : ''} onclick="window.moveSequencePage(${idx}, -1)">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button type="button" class="mini-icon-btn" title="Mover después" ${idx === total - 1 ? 'disabled' : ''} onclick="window.moveSequencePage(${idx}, 1)">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Eventos Drag & Drop de emergencia para mover páginas
        card.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', String(idx));
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => card.classList.add('dragging'), 0);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('#pageSequenceGrid .file-card').forEach(c => c.classList.remove('drag-target'));
        });

        card.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-target');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-target');
        });

        card.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            card.classList.remove('drag-target');
            const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
            if (!isNaN(draggedIdx) && draggedIdx !== idx) {
                const [moved] = pageSequence.splice(draggedIdx, 1);
                pageSequence.splice(idx, 0, moved);
                renderPageSequenceGrid();
                markNeedsReprocess();
                showToast(`Página movida a la posición #${idx + 1}`);
            }
        });

        pageSequenceGrid.appendChild(card);
    });

    // Tarjeta final para añadir una página en blanco rápidamente
    const addBlankCard = document.createElement('div');
    addBlankCard.className = 'add-more-card';
    addBlankCard.innerHTML = `
        <i class="fa-solid fa-file-circle-plus"></i>
        <span>+ Insertar Página en Blanco</span>
        <small style="color:var(--text-muted);">En la posición configurada</small>
    `;
    addBlankCard.onclick = () => insertarPaginaEnBlancoSegunSelector();
    pageSequenceGrid.appendChild(addBlankCard);

    actualizarContadoresYMultiplo4();
}

function actualizarContadoresYMultiplo4() {
    const total = pageSequence.length;
    const coverMode = document.querySelector('input[name="cover-mode"]:checked').value;

    // Si la portada está aislada con vuelta en blanco, equiv. a sumar 2 caras blancas al conteo de múltiplo de 4
    const effectiveCount = (coverMode === 'blank_back' && total >= 2) ? total + 2 : total;
    const remainder = effectiveCount % 4;
    const missingFor4 = remainder === 0 ? 0 : 4 - remainder;

    magazineStatusPill.textContent = `${total} página(s) en secuencia`;
    statTotalPages.textContent = `${total} pág(s)`;

    multipleStatusPill.style.display = 'inline-flex';
    if (missingFor4 === 0) {
        multipleStatusPill.className = 'count-pill';
        multipleStatusPill.innerHTML = '<i class="fa-solid fa-check"></i> Múltiplo de 4 exacto';
    } else {
        multipleStatusPill.className = 'count-pill warning';
        multipleStatusPill.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Faltan ${missingFor4} para múltiplo de 4`;
    }
}

// Funciones globales para botones de cada tarjeta
window.removeSequencePage = (idx) => {
    if (pageSequence.length <= 2) {
        showToast('La revista necesita al menos 2 páginas');
        return;
    }
    pageSequence.splice(idx, 1);
    renderPageSequenceGrid();
    markNeedsReprocess();
    showToast('Página eliminada de la secuencia');
};

window.moveSequencePage = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= pageSequence.length) return;
    const [moved] = pageSequence.splice(idx, 1);
    pageSequence.splice(target, 0, moved);
    renderPageSequenceGrid();
    markNeedsReprocess();
};

window.insertBlankAfter = (idx) => {
    pageSequence.splice(idx + 1, 0, crearObjetoPaginaBlanca());
    renderPageSequenceGrid();
    markNeedsReprocess();
    showToast(`Página en blanco insertada en #${idx + 2}`);
};

function crearObjetoPaginaBlanca() {
    return {
        id: ++itemCounter,
        type: 'blank',
        originalPageIndex: null,
        originalPageNumber: null,
        thumbDataUrl: '',
        dimsText: 'Página en blanco'
    };
}

function obtenerIndiceInsercionBlanca() {
    const mode = blankInsertPos.value;
    const total = pageSequence.length;
    if (mode === 'start') return 0;
    if (mode === 'after_first') return Math.min(1, total);
    if (mode === 'before_last') return Math.max(0, total - 1);
    if (mode === 'custom') {
        const pos = parseInt(customBlankIndex.value, 10) || 1;
        return Math.max(0, Math.min(total, pos - 1));
    }
    return total; // 'end'
}

function insertarPaginaEnBlancoSegunSelector() {
    if (!archivoSeleccionado) return;
    const targetIdx = obtenerIndiceInsercionBlanca();
    pageSequence.splice(targetIdx, 0, crearObjetoPaginaBlanca());
    renderPageSequenceGrid();
    markNeedsReprocess();
    switchView('pages');
    showToast(`Página en blanco insertada en posición #${targetIdx + 1}`);
}

btnAddBlankPage.addEventListener('click', insertarPaginaEnBlancoSegunSelector);
btnQuickBlank.addEventListener('click', insertarPaginaEnBlancoSegunSelector);

btnAutoMultiple4.addEventListener('click', () => {
    if (!archivoSeleccionado) return;
    const total = pageSequence.length;
    const coverMode = document.querySelector('input[name="cover-mode"]:checked').value;
    const effectiveCount = (coverMode === 'blank_back' && total >= 2) ? total + 2 : total;
    const remainder = effectiveCount % 4;

    if (remainder === 0) {
        showToast('El documento ya es múltiplo de 4 exacto');
        return;
    }

    const needed = 4 - remainder;
    for (let k = 0; k < needed; k++) {
        const idx = obtenerIndiceInsercionBlanca();
        pageSequence.splice(idx, 0, crearObjetoPaginaBlanca());
    }

    renderPageSequenceGrid();
    markNeedsReprocess();
    switchView('pages');
    showToast(`Se agregaron ${needed} página(s) en blanco para completar múltiplo de 4`);
});

// Botón para descartar documento y reiniciar
cargarOtroBtn.addEventListener('click', () => {
    archivoSeleccionado = null;
    pdfBufferOriginal = null;
    pdfBytesProcesado = null;
    pageSequence = [];
    inputPDF.value = '';

    previewContainer.innerHTML = '';
    previewSection.style.display = 'none';
    pageSequenceGrid.innerHTML = '';
    pageSequenceGrid.style.display = 'none';
    dragDropArea.style.display = 'block';

    procesarBtn.style.display = 'none';
    procesarBtn.disabled = true;
    descargarLink.style.display = 'none';
    descargarPortadaBtn.style.display = 'none';
    cargarOtroBtn.style.display = 'none';
    btnQuickBlank.style.display = 'none';
    multipleStatusPill.style.display = 'none';
    btnAddBlankPage.disabled = true;
    btnAutoMultiple4.disabled = true;

    viewerDocTitle.textContent = 'Mesa de Imposición Editorial';
    magazineStatusPill.textContent = 'Sin documento';
    statTotalPages.textContent = '0 páginas';
    statProcessState.textContent = 'En espera';

    showToast('Documento descartado');
});

// =========================================================================
// CÁLCULO DE DIMENSIONES DE PLIEGO Y PÁGINA
// =========================================================================
function obtenerDimensionesConfiguradas() {
    let anchoTabloide = 1224;
    let altoTabloide = 792;

    const sheetKey = sheetSizeSelect.value;
    if (sheetKey === 'custom') {
        const wCm = parseFloat(customSheetWidthCm.value) || 43.18;
        const hCm = parseFloat(customSheetHeightCm.value) || 27.94;
        anchoTabloide = wCm * CM_TO_PT;
        altoTabloide = hCm * CM_TO_PT;
    } else if (SHEET_PRESETS[sheetKey]) {
        anchoTabloide = SHEET_PRESETS[sheetKey].width;
        altoTabloide = SHEET_PRESETS[sheetKey].height;
    }

    let anchoPagina = anchoTabloide / 2;
    let altoPagina = altoTabloide;

    const pageKey = pageSizeSelect.value;
    if (pageKey === 'custom') {
        const pwCm = parseFloat(customPageWidthCm.value) || 21.59;
        const phCm = parseFloat(customPageHeightCm.value) || 27.94;
        anchoPagina = pwCm * CM_TO_PT;
        altoPagina = phCm * CM_TO_PT;
    } else if (pageKey !== 'auto' && PAGE_PRESETS[pageKey]) {
        anchoPagina = PAGE_PRESETS[pageKey].width;
        altoPagina = PAGE_PRESETS[pageKey].height;
    }

    return {
        anchoTabloide,
        altoTabloide,
        anchoPagina,
        altoPagina,
        scaleMode: pageScaleMode.value
    };
}

// =========================================================================
// PROCESAMIENTO PRINCIPAL DEL PDF (RESPETANDO PARES Y GIRO 270° / 90°)
// =========================================================================
procesarBtn.addEventListener('click', async () => {
    if (!archivoSeleccionado || !pdfBufferOriginal) {
        alert('Selecciona un archivo PDF primero.');
        return;
    }

    procesarBtn.disabled = true;
    procesarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    descargarLink.style.display = 'none';
    descargarPortadaBtn.style.display = 'none';
    previewContainer.innerHTML = '';
    statProcessState.textContent = 'Armando pliegos...';

    try {
        pdfBytesProcesado = await procesarPDF(pdfBufferOriginal);
        await mostrarPrevisualizacion(pdfBytesProcesado);

        // Crear enlace de descarga principal
        const blob = new Blob([pdfBytesProcesado], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        descargarLink.href = url;
        descargarLink.download = 'revista_procesada.pdf';
        descargarLink.style.display = 'inline-flex';
        descargarLink.innerHTML = '<i class="fas fa-download"></i> Descargar PDF';

        // Si la portada está aislada, habilitar también descarga de solo portada
        const coverMode = document.querySelector('input[name="cover-mode"]:checked').value;
        if (coverMode === 'blank_back' && pageSequence.length >= 2) {
            descargarPortadaBtn.style.display = 'inline-flex';
        }

        switchView('spreads');
        procesarBtn.style.display = 'none';
        statProcessState.textContent = 'Completado con éxito';
        showToast('¡Revista procesada con éxito!');

    } catch (e) {
        alert('Error al procesar el PDF: ' + e.message);
        console.error(e);
        statProcessState.textContent = 'Error al procesar';
    }

    procesarBtn.disabled = false;
    procesarBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Procesar PDF';
});

// Dibuja un ítem de página (PDF o blanco) adaptándolo al tamaño de página seleccionado
async function dibujarItemEnMitadDePliego(pdfNuevo, pdfOriginal, paginaNueva, item, lado, dims) {
    if (!item || item.type === 'blank') return; // Si es página en blanco, el espacio queda limpio

    const { anchoTabloide, altoTabloide, anchoPagina, altoPagina, scaleMode } = dims;
    const centroPliegoX = anchoTabloide / 2;

    // La página izquierda se alinea al lomo central por la izquierda; la derecha parte del lomo central
    // (Cuando anchoPagina = anchoTabloide / 2 y altoPagina = altoTabloide, x Izq es 0 y x Der es anchoPagina, idéntico al original)
    const baseSlotX = lado === 'izq' ? (centroPliegoX - anchoPagina) : centroPliegoX;
    const baseSlotY = (altoTabloide - altoPagina) / 2;

    const [paginaEmbed] = await pdfNuevo.embedPages([pdfOriginal.getPage(item.originalPageIndex)]);

    if (scaleMode === 'contain') {
        const scale = Math.min(anchoPagina / paginaEmbed.width, altoPagina / paginaEmbed.height);
        const drawW = paginaEmbed.width * scale;
        const drawH = paginaEmbed.height * scale;
        const offsetX = baseSlotX + (anchoPagina - drawW) / 2;
        const offsetY = baseSlotY + (altoPagina - drawH) / 2;

        paginaNueva.drawPage(paginaEmbed, {
            x: offsetX,
            y: offsetY,
            width: drawW,
            height: drawH
        });
    } else {
        // Modo 'stretch': adapta la página exactamente al anchoPagina y altoPagina seleccionados
        paginaNueva.drawPage(paginaEmbed, {
            x: baseSlotX,
            y: baseSlotY,
            width: anchoPagina,
            height: altoPagina
        });
    }
}

async function procesarPDF(buffer, soloPortada = false) {
    const pdfOriginal = await PDFDocument.load(buffer);
    const pdfNuevo = await PDFDocument.create();

    const dims = obtenerDimensionesConfiguradas();
    const { anchoTabloide, altoTabloide } = dims;

    const coverMode = document.querySelector('input[name="cover-mode"]:checked').value;
    const backType = coverBackType.value;

    // Lista de pares de objetos [itemIzq, itemDer] a dibujar en cada pliego
    const paresDeItems = [];

    if (coverMode === 'blank_back' && pageSequence.length >= 2) {
        // 1. Aislar Portada (Primera página y Última página de la secuencia actual)
        const itemPortada = pageSequence[0];
        const itemContraportada = pageSequence[pageSequence.length - 1];

        // Frente del pliego de portada: [Última (Contraportada), Primera (Portada)]
        paresDeItems.push([itemContraportada, itemPortada]);

        // Vuelta del pliego de portada en blanco (si está activado el reverso en blanco para dúplex)
        if (backType === 'duplex_blank') {
            paresDeItems.push([crearObjetoPaginaBlanca(), crearObjetoPaginaBlanca()]);
        }

        // 2. Si no se pidió solo la portada, armar el resto de páginas interiores con generarPares()
        if (!soloPortada) {
            const paginasInteriores = pageSequence.slice(1, pageSequence.length - 1);
            const totalInteriores = paginasInteriores.length;

            if (totalInteriores > 0) {
                const paresInterior = generarPares(totalInteriores);
                for (const [pagIzq, pagDer] of paresInterior) {
                    const idxIzq = pagIzq - 1;
                    const idxDer = pagDer - 1;
                    const itemIzq = (idxIzq >= 0 && idxIzq < totalInteriores) ? paginasInteriores[idxIzq] : null;
                    const itemDer = (idxDer >= 0 && idxDer < totalInteriores && idxDer !== idxIzq) ? paginasInteriores[idxDer] : null;
                    paresDeItems.push([itemIzq, itemDer]);
                }
            }
        }
    } else {
        // Modo Normal: todas las páginas de la secuencia entran juntas a generarPares()
        const totalPaginas = pageSequence.length;
        const pares = generarPares(totalPaginas);

        for (const [pagIzq, pagDer] of pares) {
            const paginaIzquierdaIdx = pagIzq - 1;
            const paginaDerechaIdx = pagDer - 1;

            const itemIzq = (paginaIzquierdaIdx >= 0 && paginaIzquierdaIdx < totalPaginas)
                ? pageSequence[paginaIzquierdaIdx]
                : null;
            const itemDer = (paginaDerechaIdx >= 0 && paginaDerechaIdx < totalPaginas && paginaDerechaIdx !== paginaIzquierdaIdx)
                ? pageSequence[paginaDerechaIdx]
                : null;

            paresDeItems.push([itemIzq, itemDer]);
        }
    }

    // Dibujar cada par en su página de pliego correspondiente
    for (const [itemIzq, itemDer] of paresDeItems) {
        const paginaNueva = pdfNuevo.addPage([anchoTabloide, altoTabloide]);

        if (itemIzq) {
            await dibujarItemEnMitadDePliego(pdfNuevo, pdfOriginal, paginaNueva, itemIzq, 'izq', dims);
        }
        if (itemDer) {
            await dibujarItemEnMitadDePliego(pdfNuevo, pdfOriginal, paginaNueva, itemDer, 'der', dims);
        }
    }

    // =====================================================================
    // GIRO DE PÁGINAS ORIGINAL INTACTO (270° IMPARES / 90° PARES)
    // =====================================================================
    const paginas = pdfNuevo.getPages();
    for (let idx = 0; idx < paginas.length; idx++) {
        const pagina = paginas[idx];
        if ((idx + 1) % 2 === 1) {
            pagina.setRotation(degrees(270));
        } else {
            pagina.setRotation(degrees(90));
        }
    }

    const pdfBytes = await pdfNuevo.save();
    return pdfBytes;
}

// Descargar únicamente el pliego de Portada cuando está aislada
descargarPortadaBtn.addEventListener('click', async () => {
    if (!pdfBufferOriginal) return;
    try {
        const bytesPortada = await procesarPDF(pdfBufferOriginal, true);
        const blob = new Blob([bytesPortada], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portada_revista.pdf';
        a.click();
        showToast('¡Pliego de portada descargado!');
    } catch (err) {
        console.error(err);
        alert('Error al generar la portada: ' + err.message);
    }
});

// =========================================================================
// PREVISUALIZACIÓN EN CANVAS USANDO PDF.JS
// =========================================================================
async function mostrarPrevisualizacion(pdfBytes) {
    previewContainer.innerHTML = '';

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
    const pdf = await loadingTask.promise;

    magazineStatusPill.textContent = `${pdf.numPages} lado(s) de pliego generados`;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.32 });

        const card = document.createElement('div');
        card.className = 'spread-preview-card';

        const esImpar = pageNum % 2 === 1;
        const numHojaFisica = Math.ceil(pageNum / 2);
        const caraTexto = esImpar ? 'Frente' : 'Vuelta';
        const gradosTexto = esImpar ? '270°' : '90°';

        card.innerHTML = `
            <div class="spread-card-header">
                <span>Pliego ${numHojaFisica} • ${caraTexto} (Hoja #${pageNum})</span>
                <span class="spread-rot-badge"><i class="fa-solid fa-rotate"></i> ${gradosTexto}</span>
            </div>
        `;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        card.appendChild(canvas);
        previewContainer.appendChild(card);
    }

    await pdf.destroy();
}