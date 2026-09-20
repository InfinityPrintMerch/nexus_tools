document.addEventListener('DOMContentLoaded', () => {

    const dragDropArea = document.getElementById('dragDropArea');
    const inputAudio = document.getElementById('inputAudio');
    const converterContainer = document.getElementById('converterContainer');
    const audioPreviewGrid = document.getElementById('audioPreviewGrid');

    const formatSelect = document.getElementById('formatSelect');
    const bitrateSelect = document.getElementById('bitrateSelect');
    const bitrateGroup = document.getElementById('bitrateGroup');

    const addMoreBtn = document.getElementById('addMoreBtn');
    const clearBtn = document.getElementById('clearBtn');

    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusDiv = document.getElementById('status');

    const progressWrapper = document.getElementById('progressWrapper');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');


    let loadedFiles = [];
    let convertedFiles = [];

    // LIMITE VISUAL
    const MAX_VISIBLE_FILES = 100;


    // FFmpeg
    const { createFFmpeg, fetchFile } = FFmpeg;

    const coreUrl = new URL(
        '../../utils/ffmpeg-core.js',
        window.location.href
    ).href;


    if (typeof SharedArrayBuffer === "undefined") {
        console.warn(
            "SharedArrayBuffer no disponible. Revisa COOP/COEP."
        );
    }


    const ffmpeg = createFFmpeg({
        log: true,
        corePath: coreUrl
    });



    // BITRATE

    formatSelect.addEventListener('change', () => {

        if (
            ['wav', 'flac']
                .includes(formatSelect.value)
        ) {

            bitrateGroup.style.display = 'none';

        } else {

            bitrateGroup.style.display = 'flex';

        }

    });



    // LIMPIAR

    clearBtn.addEventListener('click', () => {

        loadedFiles = [];
        convertedFiles = [];

        audioPreviewGrid.innerHTML = '';

        inputAudio.value = '';

        converterContainer.style.display = 'none';
        dragDropArea.style.display = 'flex';

        convertBtn.style.display = 'inline-flex';
        convertBtn.disabled = false;

        downloadBtn.style.display = 'none';

        progressWrapper.style.display = 'none';

        statusDiv.textContent = '';

    });




    // DRAG DROP


    dragDropArea.addEventListener(
        'dragover',
        e => {

            e.preventDefault();

            dragDropArea.classList.add(
                'dragover'
            );

        }
    );


    dragDropArea.addEventListener(
        'dragleave',
        () => {

            dragDropArea.classList.remove(
                'dragover'
            );

        }
    );


    dragDropArea.addEventListener(
        'drop',
        e => {

            e.preventDefault();

            dragDropArea.classList.remove(
                'dragover'
            );

            handleFiles(
                e.dataTransfer.files
            );

        }
    );


    inputAudio.addEventListener(
        'change',
        e => {

            handleFiles(
                e.target.files
            );

        }
    );


    addMoreBtn.addEventListener(
        'click',
        () => {

            inputAudio.click();

        }
    );



    // CARGAR ARCHIVOS


    async function handleFiles(files) {


        if (files.length === 0)
            return;



        dragDropArea.style.display = 'none';

        converterContainer.style.display = 'flex';


        convertBtn.style.display =
            'inline-flex';

        downloadBtn.style.display =
            'none';



        let startIndex =
            loadedFiles.length;



        Array.from(files).forEach(
            (file, index) => {


                if (
                    !file.type.startsWith('audio/')
                    &&
                    !file.name.match(
                        /\.(mp3|wav|flac|m4a|ogg|wma|aac)$/i
                    )
                ) {
                    return;
                }



                const fileId =
                    Date.now()
                    +
                    Math.random()
                        .toString(36)
                        .substring(7);



                const fileObj = {

                    id: fileId,

                    file: file,

                    name: file.name,

                    size: file.size

                };


                loadedFiles.push(fileObj);



                // SOLO PINTAR 100

                if (
                    loadedFiles.length <= MAX_VISIBLE_FILES
                ) {

                    crearTarjetaAudio(fileObj);

                }


            });



        actualizarEstadoArchivos();

    }



    function crearTarjetaAudio(item) {


        const card =
            document.createElement('div');


        card.className =
            'audio-item';


        card.id =
            `card-${item.id}`;



        card.innerHTML = `

            <div class="audio-cover" id="cover-${item.id}">
                <i class="fas fa-music"></i>
            </div>

            <div class="audio-info">

                <div 
                class="audio-title"
                title="${item.name}">
                    ${item.name}
                </div>


                <div 
                class="audio-artist"
                id="artist-${item.id}">
                    Desconocido
                </div>


                <div class="audio-meta">
                    ${(item.size / (1024 * 1024)).toFixed(2)} MB
                </div>

            </div>

        `;


        audioPreviewGrid.appendChild(card);



        if (window.jsmediatags) {

            jsmediatags.read(
                item.file,
                {

                    onSuccess: function (tag) {

                        const tags =
                            tag.tags;


                        if (tags.title) {

                            card.querySelector(
                                '.audio-title'
                            ).textContent =
                                tags.title;

                        }


                        if (tags.artist) {

                            card.querySelector(
                                '.audio-artist'
                            ).textContent =
                                tags.artist;

                        }



                        if (tags.picture) {


                            const blob =
                                new Blob(
                                    [
                                        new Uint8Array(
                                            tags.picture.data
                                        )
                                    ],
                                    {
                                        type:
                                            tags.picture.format
                                    }
                                );


                            const url =
                                URL.createObjectURL(
                                    blob
                                );


                            document.getElementById(
                                `cover-${item.id}`
                            ).innerHTML =
                                `
                        <img 
                        src="${url}"
                        style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:14px;
                        ">
                        `;

                        }

                    },


                    onError() {

                        console.log(
                            "Sin metadata:",
                            item.name
                        );

                    }


                });

        }


    }



    function actualizarEstadoArchivos() {


        let mensaje =
            `${loadedFiles.length} pista(s) lista(s).`;


        if (
            loadedFiles.length >
            MAX_VISIBLE_FILES
        ) {

            mensaje +=
                ` Mostrando solo las primeras ${MAX_VISIBLE_FILES} para rendimiento.`;

        }


        statusDiv.textContent =
            mensaje;


    }

    // ===============================
    // CONVERSIÓN FFmpeg
    // ===============================


    convertBtn.addEventListener(
        'click',
        async () => {


            if (loadedFiles.length === 0)
                return;



            convertBtn.disabled = true;

            clearBtn.disabled = true;

            addMoreBtn.disabled = true;



            convertBtn.innerHTML =
                `
    <i class="fa-solid fa-circle-notch fa-spin"></i>
    Convirtiendo...
    `;



            progressWrapper.style.display =
                'block';


            downloadBtn.style.display =
                'none';


            convertedFiles = [];



            try {


                if (!ffmpeg.isLoaded()) {

                    progressText.textContent =
                        "Cargando motor de conversión...";


                    await ffmpeg.load();

                }




                const targetFormat =
                    formatSelect.value;


                const targetBitrate =
                    bitrateSelect.value;



                const total =
                    loadedFiles.length;




                for (
                    let i = 0;
                    i < total;
                    i++
                ) {



                    const item =
                        loadedFiles[i];



                    progressText.textContent =
                        `
            Procesando pista ${i + 1}
            de ${total}:
            ${item.name}
            `;



                    progressBar.style.width =
                        "0%";




                    const extension =
                        item.name
                            .split('.')
                            .pop();



                    const inputName =
                        `input_${i}.${extension}`;



                    const outputName =
                        `output_${i}.${targetFormat}`;





                    ffmpeg.FS(
                        'writeFile',
                        inputName,
                        await fetchFile(item.file)
                    );





                    ffmpeg.setProgress(
                        ({ ratio }) => {


                            const percent =
                                Math.max(
                                    0,
                                    Math.min(
                                        100,
                                        ratio * 100
                                    )
                                );


                            progressBar.style.width =
                                `${percent}%`;


                        }
                    );





                    // Construcción del comando FFmpeg manteniendo metadata + portada
                    const args = [
                        '-i',
                        inputName,

                        // Copiar todos los streams incluyendo portada embebida
                        '-map',
                        '0',

                        // Mantener etiquetas originales
                        '-map_metadata',
                        '0'
                    ];



                    // MP3
                    if (targetFormat === 'mp3') {

                        args.push(
                            '-c:a',
                            'libmp3lame',
                            '-b:a',
                            targetBitrate,

                            // Mantener portada ID3
                            '-id3v2_version',
                            '3',

                            // Copiar imagen adjunta
                            '-c:v',
                            'copy'
                        );

                    }



                    // OGG
                    else if (targetFormat === 'ogg') {

                        args.push(
                            '-c:a',
                            'libvorbis',
                            '-q:a',
                            '5'
                        );

                    }



                    // M4A
                    else if (targetFormat === 'm4a') {

                        args.push(
                            '-c:a',
                            'aac',
                            '-b:a',
                            targetBitrate,

                            // conservar cover art MP4
                            '-c:v',
                            'copy'
                        );

                    }



                    // WAV
                    else if (targetFormat === 'wav') {

                        args.push(
                            '-c:a',
                            'pcm_s16le'
                        );

                    }



                    // FLAC
                    else if (targetFormat === 'flac') {

                        args.push(
                            '-c:a',
                            'flac',

                            // FLAC guarda portada como metadata block picture
                            '-c:v',
                            'copy'
                        );

                    }



                    args.push(outputName);



                    // Ejecutar FFmpeg
                    await ffmpeg.run(...args);





                    const data =
                        ffmpeg.FS(
                            'readFile',
                            outputName
                        );





                    const mimeTypes = {


                        mp3:
                            'audio/mpeg',


                        wav:
                            'audio/wav',


                        flac:
                            'audio/flac',


                        ogg:
                            'audio/ogg',


                        m4a:
                            'audio/mp4'


                    };






                    const blob = new Blob(
                        [
                            data
                        ],
                        {
                            type: mimeTypes[targetFormat]
                        }
                    );






                    const originalName =
                        item.name
                            .substring(
                                0,
                                item.name.lastIndexOf('.')
                            )
                        ||
                        item.name;






                    convertedFiles.push({

                        name:
                            `${originalName}.${targetFormat}`,

                        blob:
                            blob

                    });






                    ffmpeg.FS(
                        'unlink',
                        inputName
                    );


                    ffmpeg.FS(
                        'unlink',
                        outputName
                    );



                }






                progressWrapper.style.display =
                    'none';



                convertBtn.style.display =
                    'none';



                statusDiv.textContent =
                    '¡Conversión finalizada con éxito!';



                gestionarDescargas();






            }

            catch (error) {


                console.error(
                    "Error FFmpeg:",
                    error
                );



                if (
                    typeof SharedArrayBuffer === "undefined"
                ) {


                    alert(
                        "FFmpeg no pudo iniciar.\n\n" +
                        "SharedArrayBuffer está bloqueado.\n\n" +
                        "Activa COOP/COEP o usa un core single-thread."
                    );


                }


                else {


                    alert(
                        "Error durante la conversión.\n" +
                        "Revisa los archivos FFmpeg."
                    );


                }




                convertBtn.innerHTML =
                    `
        <i class="fas fa-sync-alt"></i>
        Intentar de nuevo
        `;



                progressWrapper.style.display =
                    'none';



            }



            finally {


                convertBtn.disabled =
                    false;


                clearBtn.disabled =
                    false;


                addMoreBtn.disabled =
                    false;



            }



        });






    // ===============================
    // DESCARGAS
    // ===============================


    function gestionarDescargas() {



        if (convertedFiles.length === 1) {



            const file =
                convertedFiles[0];



            const url =
                URL.createObjectURL(
                    file.blob
                );



            downloadBtn.href =
                url;



            downloadBtn.download =
                file.name;



            downloadBtn.innerHTML =
                `
        <i class="fas fa-download"></i>
        Descargar
        `;



            downloadBtn.style.display =
                'inline-flex';




        }



        else {



            downloadBtn.innerHTML =
                `
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        Empaquetando ZIP...
        `;



            downloadBtn.style.display =
                'inline-flex';



            downloadBtn.disabled =
                true;




            const zip =
                new JSZip();





            convertedFiles.forEach(
                file => {


                    zip.file(
                        file.name,
                        file.blob
                    );


                }
            );






            zip.generateAsync(
                {
                    type: 'blob'
                }

            )

                .then(content => {



                    const zipUrl =
                        URL.createObjectURL(
                            content
                        );



                    downloadBtn.href =
                        zipUrl;



                    downloadBtn.download =
                        `Audio_Convertido_${Date.now()}.zip`;



                    downloadBtn.innerHTML =
                        `
            <i class="fas fa-file-archive"></i>
            Descargar ZIP
            `;



                    downloadBtn.disabled =
                        false;



                });



        }



    }



});