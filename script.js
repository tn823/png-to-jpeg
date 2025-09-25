document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('image-upload');
    const resultArea = document.querySelector('.result-area');
    const downloadList = document.getElementById('download-list');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Hàm trợ giúp để định dạng dung lượng
    const formatSize = (bytes) => {
        if (bytes < 1024) {
            return `${bytes} Bytes`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
    };

    const updateDownloadButtonText = () => {
        const checkedCount = document.querySelectorAll('#download-list input[type="checkbox"]:checked').length;
        if (checkedCount > 1) {
            downloadAllBtn.querySelector('span').textContent = `Tải ${checkedCount} ảnh đã chọn`;
        } else if (checkedCount === 1) {
            downloadAllBtn.querySelector('span').textContent = 'Tải ảnh đã chọn';
        } else {
            downloadAllBtn.querySelector('span').textContent = 'Tải ảnh đã chọn';
        }
        downloadAllBtn.disabled = checkedCount === 0;
    };

    const downloadZip = async (filesToDownload) => {
        const zip = new JSZip();

        for (const file of filesToDownload) {
            try {
                const blob = await fetch(file.url).then(r => {
                    if (!r.ok) {
                        throw new Error(`Tải xuống tệp "${file.name}" thất bại.`);
                    }
                    return r.blob();
                });
                zip.file(file.name, blob);
            } catch (error) {
                console.error(error);
                alert(`Lỗi khi tải xuống "${file.name}": ${error.message}`);
                return; // Dừng nếu có lỗi
            }
        }

        zip.generateAsync({ type: "blob" }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'converted_images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
    };

    imageUpload.addEventListener('change', (event) => {
        const files = event.target.files;

        resultArea.classList.add('hidden');
        downloadList.innerHTML = '';

        if (files.length === 0) {
            loadingOverlay.classList.add('hidden');
            return;
        }

        loadingOverlay.classList.remove('hidden');

        let completedConversions = 0;
        const totalFiles = files.length;
        const processedFiles = [];

        if (totalFiles > 1) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.parentElement.style.display = 'flex';
            downloadAllBtn.style.display = 'flex';
        } else {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.parentElement.style.display = 'none';
            downloadAllBtn.style.display = 'none';
        }

        updateDownloadButtonText();

        for (const file of files) {
            if (file.type === 'image/png') {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        canvas.toBlob((blob) => {
                            const jpegUrl = URL.createObjectURL(blob);
                            const originalName = file.name.split('.').slice(0, -1).join('.');
                            const newFileName = `${originalName}.jpeg`;

                            const originalSize = formatSize(file.size);
                            const convertedSize = formatSize(blob.size);
                            const dimensions = `${img.width} x ${img.height}`;

                            const listItem = document.createElement('li');
                            listItem.classList.add('download-item');
                            listItem.innerHTML = `
                                <div class="status-check">
                                    <label class="checkbox-container">
                                        <input type="checkbox" checked data-url="${jpegUrl}" data-name="${newFileName}">
                                        <span class="checkmark"></span>
                                    </label>
                                </div>
                                <div class="image-container">
                                    <img src="${jpegUrl}" alt="${file.name}">
                                    <span class="image-dimensions">${dimensions}</span>
                                </div>
                                <div class="file-details">
                                    <p class="file-name" title="${file.name}">${originalName}</p>
                                    <div class="file-info-row">
                                        <span>Dung lượng gốc: <strong class="file-size-png">${originalSize}</strong></span>
                                        <span>Sau chuyển đổi: <strong class="file-size-jpeg">${convertedSize}</strong></span>
                                    </div>
                                </div>
                                <div class="actions-item">
                                    <a href="${jpegUrl}" download="${newFileName}" class="download-link-btn">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    </a>
                                </div>
                            `;
                            downloadList.appendChild(listItem);

                            completedConversions++;
                            if (completedConversions === totalFiles) {
                                loadingOverlay.classList.add('hidden');
                                resultArea.classList.remove('hidden');
                            }

                            const newCheckbox = listItem.querySelector('input[type="checkbox"]');
                            newCheckbox.addEventListener('change', updateDownloadButtonText);
                        }, 'image/jpeg', 0.8);
                    };
                    img.src = e.target.result;
                };

                reader.readAsDataURL(file);
            } else {
                alert(`Tệp "${file.name}" không phải là ảnh PNG và sẽ bị bỏ qua.`);
                completedConversions++;
                if (completedConversions === totalFiles) {
                    loadingOverlay.classList.add('hidden');
                    if (downloadList.children.length > 0) {
                        resultArea.classList.remove('hidden');
                    }
                }
            }
        }
    });

    downloadList.addEventListener('click', (event) => {
        const listItem = event.target.closest('.download-item');
        if (listItem) {
            if (event.target.closest('.download-link-btn')) {
                return;
            }

            const checkbox = listItem.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                updateDownloadButtonText();
            }
        }
    });

    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('#download-list input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        updateDownloadButtonText();
    });

    downloadAllBtn.addEventListener('click', () => {
        const selectedItems = document.querySelectorAll('#download-list input[type="checkbox"]:checked');
        if (selectedItems.length === 0) {
            alert("Vui lòng chọn ít nhất một ảnh để tải xuống.");
            return;
        }

        const filesToDownload = Array.from(selectedItems).map(checkbox => ({
            url: checkbox.dataset.url,
            name: checkbox.dataset.name
        }));

        downloadZip(filesToDownload);
    });
});