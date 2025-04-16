document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const pixelCanvas = document.getElementById('pixelCanvas');
    const colorPicker = document.getElementById('colorPicker');
    const eraserBtn = document.getElementById('eraser');
    const clearBtn = document.getElementById('clear');
    const gridSizeSelect = document.getElementById('gridSize');
    const saveBtn = document.getElementById('save');
    const loadBtn = document.getElementById('load');
    const savedArtworks = document.getElementById('savedArtworks');
    const exportImageBtn = document.getElementById('exportImage');
    const exportJSONBtn = document.getElementById('exportJSON');
    const importFileInput = document.getElementById('importFile');
    const importButton = document.getElementById('importButton');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomLevelEl = document.getElementById('zoomLevel');
    const canvasContainer = document.querySelector('.canvas-container');

    // 防止拖拽和事件冒泡
    document.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });

    // 防止画布上的默认行为
    pixelCanvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    // Variables
    let currentColor = colorPicker.value;
    let isDrawing = false;
    let isEraser = false;
    let currentGridSize = parseInt(gridSizeSelect.value);
    let artworks = JSON.parse(localStorage.getItem('pixelArtworks')) || [];
    let zoomLevel = 1;
    const zoomStep = 0.25;
    const maxZoom = 5;
    const minZoom = 0.5;
    let lastDrawPosition = null; // 记录上一次绘制的位置

    // Initialize the grid
    createGrid(currentGridSize);
    displaySavedArtworks();

    // Event Listeners
    colorPicker.addEventListener('input', () => {
        currentColor = colorPicker.value;
        isEraser = false;
        eraserBtn.classList.remove('active');
    });

    eraserBtn.addEventListener('click', () => {
        isEraser = !isEraser;
        eraserBtn.classList.toggle('active');
    });

    clearBtn.addEventListener('click', clearGrid);

    gridSizeSelect.addEventListener('change', () => {
        if (confirm('更改网格大小将清除当前画布。确定要继续吗？')) {
            currentGridSize = parseInt(gridSizeSelect.value);
            createGrid(currentGridSize);
        } else {
            gridSizeSelect.value = currentGridSize;
        }
    });

    saveBtn.addEventListener('click', saveArtwork);
    loadBtn.addEventListener('click', loadSavedArtwork);
    exportImageBtn.addEventListener('click', exportAsImage);
    exportJSONBtn.addEventListener('click', exportAsJSON);
    importButton.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImport);

    // 修改鼠标事件处理
    pixelCanvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startDrawing(e);
    });

    pixelCanvas.addEventListener('mouseup', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopDrawing();
    });

    pixelCanvas.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopDrawing();
    });

    pixelCanvas.addEventListener('mouseover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        draw(e);
    });

    // Touch events for mobile
    pixelCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTouch(e);
    });

    pixelCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTouchMove(e);
    });

    pixelCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopDrawing();
    });

    // Zoom functionality
    zoomInBtn.addEventListener('click', () => {
        if (zoomLevel < maxZoom) {
            zoomLevel += zoomStep;
            updateZoom();
        }
    });

    zoomOutBtn.addEventListener('click', () => {
        if (zoomLevel > minZoom) {
            zoomLevel -= zoomStep;
            updateZoom();
        }
    });

    // Functions
    function createGrid(size) {
        pixelCanvas.innerHTML = '';
        pixelCanvas.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        
        for (let i = 0; i < size * size; i++) {
            const pixel = document.createElement('div');
            pixel.classList.add('pixel');
            pixel.dataset.index = i;
            
            // 为每个像素添加防止拖拽的属性
            pixel.setAttribute('draggable', 'false');
            pixel.addEventListener('dragstart', (e) => {
                e.preventDefault();
            });
            
            pixelCanvas.appendChild(pixel);
        }
        
        updateZoom();
    }

    function updateZoom() {
        pixelCanvas.style.transform = `scale(${zoomLevel})`;
        zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
        
        // 调整容器大小适应缩放
        const containerSize = Math.min(640, window.innerWidth - 40);
        canvasContainer.style.width = `${containerSize}px`;
        canvasContainer.style.height = `${containerSize}px`;
    }

    function startDrawing(e) {
        isDrawing = true;
        
        // 记录上一个点的位置
        if (e.target.classList.contains('pixel')) {
            const pixelIndex = parseInt(e.target.dataset.index);
            lastDrawPosition = { index: pixelIndex };
        }
        
        draw(e);
    }

    function stopDrawing() {
        isDrawing = false;
        lastDrawPosition = null; // 停止绘制时重置位置记录
    }

    function draw(e) {
        if (!isDrawing) return;
        
        if (e.target.classList.contains('pixel')) {
            const currentIndex = parseInt(e.target.dataset.index);
            
            // 设置当前像素颜色
            e.target.style.backgroundColor = isEraser ? 'white' : currentColor;
            
            // 如果存在上一个绘制位置，则进行插值填充
            if (lastDrawPosition && lastDrawPosition.index !== currentIndex) {
                fillPixelsBetween(lastDrawPosition.index, currentIndex, isEraser ? 'white' : currentColor);
            }
            
            // 更新上一个绘制位置
            lastDrawPosition = { index: currentIndex };
        }
    }

    function handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pixel = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (pixel && pixel.classList.contains('pixel')) {
            isDrawing = true;
            
            const pixelIndex = parseInt(pixel.dataset.index);
            
            // 设置当前像素颜色
            pixel.style.backgroundColor = isEraser ? 'white' : currentColor;
            
            // 记录上一个触摸位置
            lastDrawPosition = { index: pixelIndex };
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (!isDrawing) return;
        
        const touch = e.touches[0];
        const pixel = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (pixel && pixel.classList.contains('pixel')) {
            const currentIndex = parseInt(pixel.dataset.index);
            
            // 设置当前像素颜色
            pixel.style.backgroundColor = isEraser ? 'white' : currentColor;
            
            // 如果存在上一个触摸位置，进行插值填充
            if (lastDrawPosition && lastDrawPosition.index !== currentIndex) {
                fillPixelsBetween(lastDrawPosition.index, currentIndex, isEraser ? 'white' : currentColor);
            }
            
            // 更新上一个触摸位置
            lastDrawPosition = { index: currentIndex };
        }
    }

    function clearGrid() {
        if (confirm('确定要清空画布吗？')) {
            const pixels = document.querySelectorAll('.pixel');
            pixels.forEach(pixel => {
                pixel.style.backgroundColor = 'white';
            });
        }
    }

    function saveArtwork() {
        // 创建用于生成图像的画布
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = currentGridSize;
        const pixelSize = 10; // 保存图像中每个像素的大小（像素）
        
        canvas.width = size * pixelSize;
        canvas.height = size * pixelSize;
        
        // 使用当前像素艺术填充画布
        const pixels = document.querySelectorAll('.pixel');
        pixels.forEach((pixel, index) => {
            const row = Math.floor(index / size);
            const col = index % size;
            ctx.fillStyle = pixel.style.backgroundColor || 'white';
            ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
        });
        
        // 转换为数据URL
        const dataURL = canvas.toDataURL('image/png');
        
        // 创建像素数据数组
        const pixelData = Array.from(pixels).map(pixel => pixel.style.backgroundColor || 'white');
        
        // 保存到本地存储
        const timestamp = new Date().toISOString();
        const artwork = {
            id: Date.now(),
            dataURL,
            timestamp,
            gridSize: size,
            pixelData
        };
        
        artworks.push(artwork);
        localStorage.setItem('pixelArtworks', JSON.stringify(artworks));
        
        // 刷新画廊
        displaySavedArtworks();
        alert('作品已保存！');
    }

    function displaySavedArtworks() {
        savedArtworks.innerHTML = '';
        
        if (artworks.length === 0) {
            savedArtworks.innerHTML = '<p class="no-artworks">还没有保存的作品</p>';
            return;
        }
        
        artworks.forEach(art => {
            const artworkDiv = document.createElement('div');
            artworkDiv.classList.add('artwork');
            artworkDiv.dataset.id = art.id;
            
            const img = document.createElement('img');
            img.src = art.dataURL;
            img.alt = `像素艺术 ${new Date(art.timestamp).toLocaleString()}`;
            
            const deleteBtn = document.createElement('div');
            deleteBtn.classList.add('delete');
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个作品吗？')) {
                    deleteArtwork(art.id);
                }
            });
            
            artworkDiv.appendChild(img);
            artworkDiv.appendChild(deleteBtn);
            artworkDiv.addEventListener('click', () => loadArtwork(art));
            
            savedArtworks.appendChild(artworkDiv);
        });
    }

    function deleteArtwork(id) {
        artworks = artworks.filter(art => art.id !== id);
        localStorage.setItem('pixelArtworks', JSON.stringify(artworks));
        displaySavedArtworks();
    }

    function loadArtwork(artwork) {
        if (artwork.gridSize !== currentGridSize) {
            if (confirm(`此作品的网格大小为 ${artwork.gridSize}×${artwork.gridSize}，需要调整当前画布大小。继续吗？`)) {
                gridSizeSelect.value = artwork.gridSize;
                currentGridSize = artwork.gridSize;
                createGrid(currentGridSize);
            } else {
                return;
            }
        }
        
        if (artwork.pixelData) {
            // 使用像素数据直接加载
            const pixels = document.querySelectorAll('.pixel');
            pixels.forEach((pixel, index) => {
                if (index < artwork.pixelData.length) {
                    pixel.style.backgroundColor = artwork.pixelData[index];
                }
            });
        } else {
            // 旧版本兼容：使用图像数据加载
            loadArtworkFromImage(artwork);
        }
    }

    function loadArtworkFromImage(artwork) {
        // 创建临时图像以加载像素颜色
        const img = new Image();
        img.src = artwork.dataURL;
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const pixels = document.querySelectorAll('.pixel');
            const pixelSize = img.width / artwork.gridSize;
            
            pixels.forEach((pixel, index) => {
                const row = Math.floor(index / artwork.gridSize);
                const col = index % artwork.gridSize;
                
                // 从每个像素的中心获取颜色
                const x = Math.floor(col * pixelSize + pixelSize / 2);
                const y = Math.floor(row * pixelSize + pixelSize / 2);
                const pixelData = ctx.getImageData(x, y, 1, 1).data;
                
                const r = pixelData[0];
                const g = pixelData[1];
                const b = pixelData[2];
                const a = pixelData[3] / 255;
                
                if (a === 0) {
                    pixel.style.backgroundColor = 'white';
                } else {
                    pixel.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
                }
            });
        };
    }

    function loadSavedArtwork() {
        if (artworks.length > 0) {
            // 加载最近的作品
            loadArtwork(artworks[artworks.length - 1]);
        } else {
            alert('没有可加载的作品');
        }
    }

    function exportAsImage() {
        // 创建高分辨率图像
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = currentGridSize;
        // 每个像素使用更大的尺寸以获得更高分辨率
        const pixelSize = Math.max(5, Math.floor(1024 / size));
        
        canvas.width = size * pixelSize;
        canvas.height = size * pixelSize;
        
        // 绘制像素
        const pixels = document.querySelectorAll('.pixel');
        pixels.forEach((pixel, index) => {
            const row = Math.floor(index / size);
            const col = index % size;
            ctx.fillStyle = pixel.style.backgroundColor || 'white';
            ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
        });
        
        // 导出为PNG
        const link = document.createElement('a');
        link.download = `pixel-art-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function exportAsJSON() {
        // 收集像素数据
        const pixels = document.querySelectorAll('.pixel');
        const pixelData = Array.from(pixels).map(pixel => pixel.style.backgroundColor || 'white');
        
        const artData = {
            gridSize: currentGridSize,
            pixelData: pixelData,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        // 创建下载链接
        const dataStr = JSON.stringify(artData);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.download = `pixel-art-${Date.now()}.json`;
        link.href = dataUri;
        link.click();
    }

    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        if (file.name.endsWith('.json')) {
            // 导入JSON数据
            reader.onload = function(event) {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    if (jsonData.gridSize && jsonData.pixelData) {
                        importJSON(jsonData);
                    } else {
                        alert('无效的JSON数据格式');
                    }
                } catch (err) {
                    alert('无法解析JSON文件');
                    console.error(err);
                }
            };
            reader.readAsText(file);
        } else {
            // 导入图像
            reader.onload = function(event) {
                importImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
        
        // 清除input以便于重复导入同一文件
        e.target.value = '';
    }

    function importJSON(data) {
        if (data.gridSize !== currentGridSize) {
            if (confirm(`此设计的网格大小为 ${data.gridSize}×${data.gridSize}，需要调整当前画布大小。继续吗？`)) {
                gridSizeSelect.value = data.gridSize;
                currentGridSize = data.gridSize;
                createGrid(currentGridSize);
            } else {
                return;
            }
        }
        
        const pixels = document.querySelectorAll('.pixel');
        pixels.forEach((pixel, index) => {
            if (index < data.pixelData.length) {
                pixel.style.backgroundColor = data.pixelData[index];
            }
        });
    }

    function importImage(dataURL) {
        const img = new Image();
        img.src = dataURL;
        
        img.onload = function() {
            // 确定合适的网格大小
            let gridSize = 32; // 默认大小
            
            // 尝试自动检测最佳网格大小
            if (img.width > 128 || img.height > 128) {
                if (confirm('导入的图像较大。是否要使用128×128网格？')) {
                    gridSize = 128;
                } else if (confirm('是否要使用64×64网格？')) {
                    gridSize = 64;
                } else {
                    gridSize = 32;
                }
            } else if (img.width > 64 || img.height > 64) {
                if (confirm('是否要使用64×64网格？')) {
                    gridSize = 64;
                } else {
                    gridSize = 32;
                }
            }
            
            // 更新网格大小
            gridSizeSelect.value = gridSize;
            currentGridSize = gridSize;
            createGrid(gridSize);
            
            // 创建画布并绘制图像
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 计算保持纵横比的尺寸
            let drawWidth, drawHeight;
            if (img.width > img.height) {
                drawWidth = gridSize;
                drawHeight = (img.height / img.width) * gridSize;
            } else {
                drawHeight = gridSize;
                drawWidth = (img.width / img.height) * gridSize;
            }
            
            // 居中图像
            const offsetX = (gridSize - drawWidth) / 2;
            const offsetY = (gridSize - drawHeight) / 2;
            
            canvas.width = gridSize;
            canvas.height = gridSize;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            
            // 将图像数据映射到像素网格
            const pixels = document.querySelectorAll('.pixel');
            pixels.forEach((pixel, index) => {
                const row = Math.floor(index / gridSize);
                const col = index % gridSize;
                
                const pixelData = ctx.getImageData(col, row, 1, 1).data;
                const r = pixelData[0];
                const g = pixelData[1];
                const b = pixelData[2];
                const a = pixelData[3] / 255;
                
                if (a < 0.1) {
                    pixel.style.backgroundColor = 'white';
                } else {
                    pixel.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
                }
            });
        };
    }

    // 添加插值填充函数
    function fillPixelsBetween(fromIndex, toIndex, color) {
        // 获取网格中的所有像素
        const pixels = document.querySelectorAll('.pixel');
        
        // 计算网格中的行和列
        const row1 = Math.floor(fromIndex / currentGridSize);
        const col1 = fromIndex % currentGridSize;
        const row2 = Math.floor(toIndex / currentGridSize);
        const col2 = toIndex % currentGridSize;
        
        // 使用Bresenham算法进行线段插值
        const dx = Math.abs(col2 - col1);
        const dy = Math.abs(row2 - row1);
        const sx = col1 < col2 ? 1 : -1;
        const sy = row1 < row2 ? 1 : -1;
        let err = dx - dy;
        
        let x = col1;
        let y = row1;
        
        // 最大插值数量限制，防止过度计算
        const maxInterpolations = Math.max(dx, dy) * 2;
        let count = 0;
        
        while ((x !== col2 || y !== row2) && count < maxInterpolations) {
            const currentIndex = y * currentGridSize + x;
            
            // 确保索引在有效范围内
            if (currentIndex >= 0 && currentIndex < pixels.length) {
                pixels[currentIndex].style.backgroundColor = color;
            }
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
            
            count++;
        }
    }
}); 