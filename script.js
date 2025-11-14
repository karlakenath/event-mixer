document.addEventListener('DOMContentLoaded', () => {
    const vignetteUpload = document.getElementById('vignette-upload');
    const vignetteList = document.getElementById('vignette-list');

    // Array para armazenar as informações das vinhetas em memória
    const vignettes = [];

    // Adiciona o listener para o input de upload de arquivos
    vignetteUpload.addEventListener('change', handleFileUpload);

    /**
     * Lida com o upload dos arquivos de vinheta.
     * @param {Event} event - O evento de 'change' do input.
     */
    function handleFileUpload(event) {
        const files = event.target.files;
        if (!files.length) {
            return;
        }

        // Itera sobre cada arquivo selecionado
        for (const file of files) {
            // Evita adicionar vinhetas duplicadas pelo nome do arquivo
            if (vignettes.some(v => v.name === file.name)) {
                console.warn(`A vinheta "${file.name}" já foi carregada.`);
                continue;
            }

            // Cria uma URL local para o arquivo
            const fileURL = URL.createObjectURL(file);

            // Armazena as informações da vinheta
            vignettes.push({
                name: file.name,
                url: fileURL
            });
        }

        // Atualiza a interface para mostrar a nova lista de vinhetas
        renderVignetteList();
        
        // Limpa o valor do input para permitir carregar o mesmo arquivo novamente se for removido
        event.target.value = '';
    }

    /**
     * Renderiza a lista de vinhetas na interface.
     */
    function renderVignetteList() {
        // Limpa a lista atual
        vignetteList.innerHTML = '';

        // Cria e adiciona um elemento para cada vinheta no array
        vignettes.forEach(vignette => {
            const item = document.createElement('div');
            item.className = 'vignette-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = vignette.name;
            nameSpan.title = vignette.name; // Mostra o nome completo no hover

            const playButton = document.createElement('button');
            playButton.className = 'play-button';
            playButton.textContent = 'TOCAR';
            
            // Adiciona o evento de clique para tocar a vinheta
            playButton.addEventListener('click', () => {
                playVignette(vignette.url);
            });

            item.appendChild(nameSpan);
            item.appendChild(playButton);
            vignetteList.appendChild(item);
        });
    }

    /**
     * Toca um arquivo de áudio.
     * @param {string} url - A URL do áudio a ser tocado.
     */
    function playVignette(url) {
        console.log(`Tocando vinheta: ${url}`);
        const audio = new Audio(url);
        audio.volume = 1.0; // Volume máximo
        audio.play().catch(error => {
            console.error("Erro ao tocar a vinheta:", error);
        });
    }
});
