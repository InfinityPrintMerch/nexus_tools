pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';

const input = document.getElementById("inputPDF");
const dragDropArea = document.getElementById("dragDropArea");
const previewContainer = document.getElementById("pdfPreviewPages");
const status = document.getElementById("status");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resolutionSelect = document.getElementById("scaleInput");
const formatSelect = document.getElementById("formatSelect");
const controlsContainer = document.querySelector(".pdf2jpg-container");
const loadingProgressText = document.getElementById("loadingProgressText");
const loadingProgressContainer = document.getElementById("loadingProgressContainer");
const loadingProgressBar = document.getElementById("loadingProgressBar");

let pdfFiles = [];
controlsContainer.style.display = "none"; // Ocultar controles al inicio

// === Drag and Drop Support ===
["dragenter", "dragover"].forEach(evt =>
    dragDropArea.addEventListener(evt, e => {
        e.preventDefault();
        dragDropArea.classList.add("dragover");
    })
);
["dragleave", "drop"].forEach(evt =>
    dragDropArea.addEventListener(evt, e => {
        e.preventDefault();
        dragDropArea.classList.remove("dragover");
    })
);
dragDropArea.addEventListener("drop", e => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (files.length) loadMultiplePDFs(files);
});

input.addEventListener("change", e => {
    const files = Array.from(e.target.files).filter(f => f.type === "application/pdf");
    if (files.length) loadMultiplePDFs(files);
});

async function loadMultiplePDFs(files) {
    loadingProgressBar.style.width = "0%";
    loadingProgressContainer.style.display = "block";
    loadingProgressText.style.display = "block";
    loadingProgressText.textContent = "Cargando PDF... 0%";

    let totalToLoad = files.length;
    let loadedCount = 0;

    for (const file of files) {
        const reader = new FileReader();

        reader.onload = async function () {
            const pdfDoc = await pdfjsLib.getDocument(reader.result).promise;
            const total = pdfDoc.numPages;
            const fileWrapper = document.createElement("div");
            fileWrapper.classList.add("pdf-wrapper");

            const page = await pdfDoc.getPage(1);
            const viewport = page.getViewport({ scale: 0.4 });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.classList.add("pdf2jpg-canvas");

            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            fileWrapper.appendChild(canvas);

            const infoBox = document.createElement("div");
            infoBox.classList.add("pdf-info-box");

            const name = document.createElement("div");
            name.textContent = file.name;
            name.classList.add("pdf-info-name");

            const size = document.createElement("div");
            size.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
            size.classList.add("pdf-info-size");

            infoBox.appendChild(name);
            infoBox.appendChild(size);
            fileWrapper.appendChild(infoBox);


            previewContainer.appendChild(fileWrapper);
            pdfFiles.push({ name: file.name, data: reader.result });

            dragDropArea.style.display = "none";
            controlsContainer.style.display = "flex";
            convertBtn.style.display = "inline-block";
            convertBtn.disabled = false;

            loadedCount++;
            const percent = Math.round((loadedCount / totalToLoad) * 100);
            loadingProgressBar.style.width = `${percent}%`;
            loadingProgressText.textContent = `Cargando PDF... ${percent}%`;

            if (loadedCount === totalToLoad) {
                loadingProgressContainer.style.display = "none";
                loadingProgressText.style.display = "none";
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

convertBtn.addEventListener("click", async () => {
    if (pdfFiles.length === 0) return;

    convertBtn.disabled = true;
    convertBtn.textContent = "Convirtiendo...";
    status.textContent = "Convirtiendo PDFs...";
    downloadBtn.style.display = "none";
    downloadBtn.disabled = true;

    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    progressContainer.style.display = "block";
    progressText.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "0% completado";

    const scale = getScaleFromDPI(resolutionSelect.value);
    const format = formatSelect.value;
    const extension = format === "jpeg" ? "jpg" : format;
    const zip = new JSZip();

    let totalPages = 0;
    for (const file of pdfFiles) {
        const pdf = await pdfjsLib.getDocument(file.data).promise;
        totalPages += pdf.numPages;
    }

    let currentPage = 0;

    for (const file of pdfFiles) {
        const pdf = await pdfjsLib.getDocument(file.data).promise;
        const folderName = file.name.replace(/\.pdf$/i, "");
        const folder = zip.folder(folderName);

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

            const dataURL = canvas.toDataURL(`image/${format}`, 1.0);
            const base64 = dataURL.split(",")[1];

            const paddedIndex = String(i).padStart(4, "0");
            const fileName = `${folderName}_${paddedIndex}.${extension}`;
            folder.file(fileName, base64, { base64: true });

            currentPage++;
            const percent = Math.round((currentPage / totalPages) * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${percent}% completado`;
            status.textContent = `Página ${currentPage} de ${totalPages} convertida.`;
        }
    }

    status.textContent = "Empaquetando en ZIP...";
    const blob = await zip.generateAsync({ type: "blob" });
    const zipURL = URL.createObjectURL(blob);

    downloadBtn.href = zipURL;
    downloadBtn.download = pdfFiles.length === 1
        ? `${pdfFiles[0].name.replace(/\.pdf$/i, "")}.zip`
        : `pdfs_convertidos.zip`;
    downloadBtn.style.display = "inline-block";
    downloadBtn.disabled = false;

    convertBtn.disabled = false;
    convertBtn.textContent = "Convertir";
    status.textContent = "¡Listo! Descarga ahora.";
    progressText.textContent = "100% completado";
});

function getScaleFromDPI(dpi) {
    switch (dpi) {
        case "150": return 1.5;
        case "300": return 2;
        case "600": return 3;
        case "1200": return 4;
        default: return 2;
    }
}

["dragenter", "dragover"].forEach(evt =>
    previewContainer.addEventListener(evt, e => {
        e.preventDefault();
        const rect = previewContainer.getBoundingClientRect();
        dragOverlay.style.display = "flex";
        dragOverlay.style.top = `${rect.top}px`;
        dragOverlay.style.left = `${rect.left}px`;
        dragOverlay.style.width = `${rect.width}px`;
        dragOverlay.style.height = `${rect.height}px`;
    })
);

["dragleave", "drop"].forEach(evt =>
    previewContainer.addEventListener(evt, e => {
        e.preventDefault();
        dragOverlay.style.display = "none";
    })
);

previewContainer.addEventListener("drop", e => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (files.length) loadMultiplePDFs(files);
});


// Crear overlay visual al arrastrar sobre el contenedor
const dragOverlay = document.createElement("div");
dragOverlay.id = "dragOverlay";
dragOverlay.innerHTML = `
    <div class="overlay-content">
        <i class="fas fa-plus"></i>
        <span>Agregar PDF</span>
    </div>
`;
dragOverlay.style.display = "none";
document.body.appendChild(dragOverlay);

