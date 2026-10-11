document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM (Sincronizadas con index_8.html)
    const dragDropArea = document.getElementById('dragDropArea');
    const inputImage = document.getElementById('inputImage');
    const imagePreviewPages = document.getElementById('imagePreviewPages');

    const convertFormatSelect = document.getElementById('convertFormatSelect');
    const resolutionSelect = document.getElementById('resolutionSelect');

    const convertBtn = document.getElementById('convertBtn');
    const btnClearUi = document.getElementById('btnClearUi');
    const statusDiv = document.getElementById('status');

    // Barras de Progreso
    const loadingProgressContainer = document.getElementById('loadingProgressContainer');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    const loadingProgressText = document.getElementById('loadingProgressText');

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let loadedFiles = [];
    let convertedImages = [];

    // ==========================================
    // 1. DRAG & DROP Y SELECCIÓN DE ARCHIVOS
    // ==========================================
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.style.borderColor = "var(--primary)";
        dragDropArea.style.background = "rgba(111, 138, 60, 0.12)";
    });

    dragDropArea.addEventListener('dragleave', () => {
        dragDropArea.style.borderColor = "var(--border)";
        dragDropArea.style.background = "var(--primary-light)";
    });

    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea.style.borderColor = "var(--border)";
        dragDropArea.style.background = "var(--primary-light)";
        handleFiles(e.dataTransfer.files);
    });

    inputImage.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        inputImage.value = ''; // Resetear input
    });

    // ==========================================
    // 2. LECTURA Y RENDERIZADO DE MINIATURAS
    // ==========================================
    function handleFiles(files) {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        // Mostrar barra de carga
        dragDropArea.style.display = 'none';
        imagePreviewPages.style.display = 'none';
        loadingProgressContainer.style.display = 'flex';
        loadingProgressBar.style.width = '0%';
        loadingProgressText.textContent = '0%';

        let loadedCount = 0;
        const totalFiles = validFiles.length;

        validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadedFiles.push({
                    file: file,
                    dataUrl: e.target.result
                });

                loadedCount++;
                const pct = Math.round((loadedCount / totalFiles) * 100);
                loadingProgressBar.style.width = `${pct}%`;
                loadingProgressText.textContent = `${pct}%`;

                if (loadedCount === totalFiles) {
                    setTimeout(() => {
                        renderPreviewGrid();
                        finishLoading();
                    }, 400);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Función global para eliminar una imagen individual de la cuadrícula
    window.removeImageItem = (index) => {
        loadedFiles.splice(index, 1);
        renderPreviewGrid();
    };

    function renderPreviewGrid() {
        imagePreviewPages.innerHTML = '';

        if (loadedFiles.length === 0) {
            finishLoading();
            return;
        }

        loadedFiles.forEach((fileObj, idx) => {
            const ext = fileObj.file.type.split('/')[1]?.toUpperCase() || 'IMG';

            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-preview-item';
            imgContainer.innerHTML = `
                <button type="button" class="card-remove-btn" onclick="window.removeImageItem(${idx})" style="position: absolute; top: 4px; right: 4px; z-index: 10; background: var(--danger); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <img src="${fileObj.dataUrl}" alt="Preview" title="${fileObj.file.name}">
                <span class="file-type-display">${ext} • ${(fileObj.file.size / 1024).toFixed(1)} KB</span>
            `;
            imagePreviewPages.appendChild(imgContainer);
        });
    }

    function finishLoading() {
        loadingProgressContainer.style.display = 'none';
        progressContainer.style.display = 'none';

        if (loadedFiles.length > 0) {
            dragDropArea.style.display = 'none';
            imagePreviewPages.style.display = 'grid'; // Asegurar display: grid
            if (btnClearUi) btnClearUi.style.display = 'inline-flex';

            convertBtn.style.display = 'inline-flex';
            convertBtn.dataset.mode = 'convert';
            convertBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Convertir Imágenes';
            convertBtn.disabled = false;

            statusDiv.textContent = `${loadedFiles.length} imagen(es) lista(s).`;
            statusDiv.style.display = 'block';
        } else {
            dragDropArea.style.display = 'flex';
            imagePreviewPages.style.display = 'none';
            if (btnClearUi) btnClearUi.style.display = 'none';

            convertBtn.style.display = 'none';
            convertBtn.dataset.mode = 'convert';
            convertBtn.disabled = false;
            statusDiv.style.display = 'none';
        }
    }

    // ==========================================
    // 3. MOTOR DE CONVERSIÓN Y DESCARGA
    // ==========================================
    convertBtn.addEventListener('click', async () => {

        // --- MODO: CONVERTIR ---
        if (convertBtn.dataset.mode === 'convert') {
            if (loadedFiles.length === 0) return;

            convertBtn.disabled = true;
            convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
            convertedImages = [];

            progressContainer.style.display = 'flex';
            progressText.textContent = '0%';
            progressBar.style.width = '0%';
            statusDiv.textContent = 'Convirtiendo...';

            const targetFormat = convertFormatSelect.value;
            const targetResolution = parseInt(resolutionSelect.value);

            let processedCount = 0;
            const totalImages = loadedFiles.length;

            for (const fileObj of loadedFiles) {
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = async () => {
                        if (img.width === 0 || img.height === 0) {
                            processedCount++;
                            resolve();
                            return;
                        }

                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // Ajuste por DPI
                        const dpiScale = targetResolution / 96;
                        canvas.width = img.width * dpiScale;
                        canvas.height = img.height * dpiScale;

                        // Fondo blanco forzado para formatos que no soportan transparencia (JPEG, BMP)
                        if (['jpeg', 'bmp', 'avif'].includes(targetFormat)) {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }

                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        const originalFilename = fileObj.file.name.split('.').slice(0, -1).join('.');
                        const targetOutputName = originalFilename + '.' + targetFormat;

                        const mimeTypeMap = {
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'webp': 'image/webp',
                            'avif': 'image/avif',
                            'bmp': 'image/bmp',
                            'tiff': 'image/tiff',
                            'heic': 'image/heic',
                            'ico': 'image/x-icon'
                        };
                        const outputMimeType = mimeTypeMap[targetFormat] || 'image/png';
                        const quality = (targetFormat === 'jpeg' || targetFormat === 'webp') ? 0.95 : 1.0;

                        try {
                            const dataUrl = canvas.toDataURL(outputMimeType, quality);
                            convertedImages.push({ name: targetOutputName, data: dataUrl });
                        } catch (error) {
                            // Fallback a PNG si el navegador no soporta el formato elegido (ej. TIFF o HEIC nativo)
                            const fbDataUrl = canvas.toDataURL('image/png', 1.0);
                            convertedImages.push({ name: originalFilename + '.png', data: fbDataUrl });
                        }

                        processedCount++;
                        const pct = Math.round((processedCount / totalImages) * 100);
                        progressBar.style.width = `${pct}%`;
                        progressText.textContent = `${pct}%`;
                        resolve();
                    };
                    img.onerror = resolve;
                    img.src = fileObj.dataUrl;
                });
            }

            // UI al finalizar la conversión
            statusDiv.textContent = '¡Conversión completa!';
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<i class="fa-solid fa-download"></i> Descargar Archivos';
            convertBtn.dataset.mode = 'download';

        }

        // --- MODO: DESCARGAR ---
        else if (convertBtn.dataset.mode === 'download') {
            if (convertedImages.length === 0) return;

            if (convertedImages.length === 1) {
                // Descarga de archivo único
                const image = convertedImages[0];
                const a = document.createElement('a');
                a.href = image.data;
                a.download = image.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                statusDiv.textContent = 'Imagen descargada exitosamente.';
            } else {
                // Descarga Múltiple (Empaquetar en ZIP)
                statusDiv.textContent = 'Empaquetando archivo ZIP...';
                convertBtn.disabled = true;
                convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando ZIP...';

                const zip = new JSZip();
                convertedImages.forEach(image => {
                    const base64Data = image.data.split(',')[1];
                    zip.file(image.name, base64Data, { base64: true });
                });

                zip.generateAsync({ type: 'blob' }, (metadata) => {
                    progressBar.style.width = `${metadata.percent}%`;
                    progressText.textContent = `ZIP: ${metadata.percent.toFixed(0)}%`;
                }).then((content) => {
                    const zipFileName = `Auro_Imagenes_Convertidas.zip`;
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(content);
                    a.download = zipFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);

                    statusDiv.textContent = 'Archivo ZIP descargado.';
                    convertBtn.disabled = false;
                    convertBtn.innerHTML = '<i class="fa-solid fa-download"></i> Descargar de nuevo';
                    progressContainer.style.display = 'none';
                });
            }
        }
    });
});