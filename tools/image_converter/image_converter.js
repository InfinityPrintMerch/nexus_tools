document.addEventListener('DOMContentLoaded', () => {
    const dragDropArea = document.getElementById('dragDropArea');
    const inputImage = document.getElementById('inputImage');
    const imagePreviewPages = document.getElementById('imagePreviewPages');
    const convertFormatSelect = document.getElementById('convertFormatSelect');
    const resolutionSelect = document.getElementById('resolutionSelect');
    const colorProfileSelect = document.getElementById('colorProfileSelect');
    const convertBtn = document.getElementById('convertBtn');
    const statusDiv = document.getElementById('status');
    const loadingProgressContainer = document.getElementById('loadingProgressContainer');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    const loadingProgressText = document.getElementById('loadingProgressText');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const addMoreContainer = document.getElementById('addMoreContainer');

    const pdf2jpgContainer = document.querySelector('.pdf2jpg-container');

    let loadedFiles = [];
    let convertedImages = [];

    // Estado inicial
    pdf2jpgContainer.style.display = 'none';
    convertBtn.style.display = 'none';
    convertBtn.dataset.mode = 'convert';
    convertBtn.textContent = 'Convertir';

    // Drag & Drop
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('dragover');
        statusDiv.textContent = 'Suelta tus imágenes aquí.';
    });

    dragDropArea.addEventListener('dragleave', () => {
        dragDropArea.classList.remove('dragover');
        statusDiv.textContent = '';
    });

    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('dragover');
        statusDiv.textContent = '';
        handleFiles(e.dataTransfer.files);
    });

    // Input file
    inputImage.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Add más
    addMoreContainer.addEventListener('click', () => {
        inputImage.click();
    });

    // Función para manejar archivos
    function handleFiles(files) {
        if (files.length === 0) {
            finishLoading();
            return;
        }

        // Mostrar progreso
        loadingProgressContainer.style.display = 'block';
        loadingProgressText.style.display = 'block';
        loadingProgressText.textContent = 'Cargando imágenes...';
        loadingProgressBar.style.width = '0%';

        let loadedCount = 0;
        const totalFiles = files.length;

        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) {
                console.warn(`Skipping non-image file: ${file.name}`);
                loadedCount++;
                if (loadedCount === totalFiles) {
                    finishLoading();
                }
                return;
            }

            loadedFiles.push(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = `Preview of ${file.name}`;
                img.title = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

                const imgContainer = document.createElement('div');
                imgContainer.classList.add('image-preview-item');
                imgContainer.appendChild(img);

                const fileTypeSpan = document.createElement('span');
                fileTypeSpan.textContent = `Tipo: ${file.type.split('/')[1].toUpperCase()}`;
                fileTypeSpan.classList.add('file-type-display');
                imgContainer.appendChild(fileTypeSpan);

                imagePreviewPages.appendChild(imgContainer);

                loadedCount++;
                loadingProgressBar.style.width = `${(loadedCount / totalFiles) * 100}%`;

                if (loadedCount === totalFiles) {
                    finishLoading();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function finishLoading() {
        loadingProgressContainer.style.display = 'none';
        loadingProgressText.style.display = 'none';
        progressContainer.style.display = 'none';
        progressText.style.display = 'none';

        if (loadedFiles.length > 0) {
            dragDropArea.style.display = 'none';
            pdf2jpgContainer.style.display = 'flex';
            convertBtn.style.display = 'block';
            convertBtn.dataset.mode = 'convert';
            convertBtn.textContent = 'Convertir';
            convertBtn.disabled = false;
            statusDiv.textContent = `${loadedFiles.length} imagen(es) cargada(s) y lista(s) para convertir.`;
        } else {
            dragDropArea.style.display = 'block';
            pdf2jpgContainer.style.display = 'none';
            imagePreviewPages.innerHTML = '';
            loadedFiles = [];
            convertBtn.style.display = 'none';
            convertBtn.dataset.mode = 'convert';
            convertBtn.textContent = 'Convertir';
            convertBtn.disabled = false;
            statusDiv.textContent = 'Arrastra y suelta tus imágenes aquí, o haz click para seleccionar archivos.';
        }
    }

    // Botón convertir / descargar
    convertBtn.addEventListener('click', async () => {
        if (convertBtn.dataset.mode === 'convert') {
            // Inicio conversión
            if (loadedFiles.length === 0) {
                alert('Por favor, carga al menos una imagen primero.');
                finishLoading();
                return;
            }

            convertBtn.disabled = true;
            convertBtn.textContent = 'Convirtiendo...';
            convertedImages = [];

            progressContainer.style.display = 'block';
            progressText.style.display = 'block';
            progressText.textContent = 'Iniciando conversión...';
            progressBar.style.width = '0%';

            const targetFormat = convertFormatSelect.value;
            const targetResolution = parseInt(resolutionSelect.value);
            const colorProfile = colorProfileSelect.value; // 'rgb' o 'cmyk'

            let processedCount = 0;
            const totalImages = loadedFiles.length;

            for (const file of loadedFiles) {
                await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const img = new Image();
                        img.onload = async () => {
                            if (img.width === 0 || img.height === 0) {
                                console.error(`Error: La imagen '${file.name}' cargó con dimensiones cero. Saltando.`);
                                processedCount++;
                                progressBar.style.width = `${(processedCount / totalImages) * 100}%`;
                                progressText.textContent = `Convirtiendo ${processedCount} de ${totalImages} imágenes...`;
                                resolve();
                                return;
                            }

                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            const dpiScale = targetResolution / 96;
                            canvas.width = img.width * dpiScale;
                            canvas.height = img.height * dpiScale;

                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                            const originalFilename = file.name.split('.').slice(0, -1).join('.');
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
                            const quality = (targetFormat === 'jpeg' || targetFormat === 'webp') ? 0.9 : 1.0;

                            let dataUrl;
                            try {
                                dataUrl = canvas.toDataURL(outputMimeType, quality);

                                if (dataUrl && dataUrl.length > 'data:;base64,'.length) {
                                    convertedImages.push({ name: targetOutputName, data: dataUrl });
                                } else {
                                    console.warn(`Advertencia: dataUrl vacío para '${file.name}', fallback a PNG.`);
                                    dataUrl = canvas.toDataURL('image/png', 1.0);
                                    if (dataUrl && dataUrl.length > 'data:;base64,'.length) {
                                        convertedImages.push({ name: originalFilename + '.png', data: dataUrl });
                                    }
                                }
                            } catch (error) {
                                console.error(`Error al convertir '${file.name}':`, error);
                                dataUrl = canvas.toDataURL('image/png', 1.0);
                                if (dataUrl && dataUrl.length > 'data:;base64,'.length) {
                                    convertedImages.push({ name: originalFilename + '.png', data: dataUrl });
                                }
                            }

                            processedCount++;
                            progressBar.style.width = `${(processedCount / totalImages) * 100}%`;
                            progressText.textContent = `Convirtiendo ${processedCount} de ${totalImages} imágenes...`;
                            resolve();
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            }

            // Finalizar
            progressText.textContent = 'Conversión completa.';
            convertBtn.disabled = false;
            convertBtn.textContent = 'Descargar';
            convertBtn.dataset.mode = 'download';
            statusDiv.textContent = `¡${convertedImages.length} imagen(es) lista(s) para descargar!`;
        } else if (convertBtn.dataset.mode === 'download') {
            // Descargar
            if (convertedImages.length === 0) {
                alert('No hay imágenes para descargar.');
                if (loadedFiles.length > 0) {
                    convertBtn.dataset.mode = 'convert';
                    convertBtn.textContent = 'Convertir';
                }
                return;
            }

            if (convertedImages.length === 1) {
                // Descargar directamente
                const image = convertedImages[0];
                const a = document.createElement('a');
                a.href = image.data;
                a.download = image.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                statusDiv.textContent = 'Imagen descargada.';
                progressContainer.style.display = 'none';
                progressText.style.display = 'none';
            } else {
                // Crear ZIP
                const zip = new JSZip();
                convertedImages.forEach(image => {
                    const base64Data = image.data.split(',')[1];
                    zip.file(image.name, base64Data, { base64: true });
                });

                statusDiv.textContent = 'Creando archivo ZIP...';
                progressContainer.style.display = 'block';
                progressText.style.display = 'block';
                progressBar.style.width = '0%';

                zip.generateAsync({ type: 'blob' }, (metadata) => {
                    progressBar.style.width = `${metadata.percent.toFixed(2)}%`;
                    progressText.textContent = `Empaquetando: ${metadata.percent.toFixed(0)}%`;
                }).then((content) => {
                    const zipFileName = `imagenes_convertidas_${Date.now()}.zip`;
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(content);
                    a.download = zipFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                    statusDiv.textContent = 'Archivo ZIP descargado.';
                    progressContainer.style.display = 'none';
                    progressText.style.display = 'none';
                }).catch(e => {
                    console.error('Error al crear ZIP:', e);
                    statusDiv.textContent = 'Error al crear ZIP.';
                    progressContainer.style.display = 'none';
                    progressText.style.display = 'none';
                });
            }
        }
    });
});