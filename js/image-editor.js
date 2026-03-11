// ==================== 画像編集機能（改善版） ====================

function openImageEditor(image, type) {
    editingImage = image;
    editingType = type;
    
    // トランスフォームをリセット
    imageTransform = {
        scale: 1.0,
        rotation: 0,
        x: 0,
        y: 0
    };
    
    const modal = document.getElementById('imageEditorModal');
    const title = document.getElementById('imageEditorTitle');
    const canvas = document.getElementById('editorCanvas');
    const ctx = canvas.getContext('2d');
    
    // タイトルを設定
    title.textContent = type === 'before' ? 'Before画像の調整' : 'After画像の調整';
    
    // キャンバスサイズを設定（大きめに）
    const frameSize = 800;  // 800pxに拡大
    canvas.width = frameSize;
    canvas.height = frameSize;
    
    // 初期描画
    drawEditingImage(ctx, canvas.width, canvas.height);
    
    // モーダルを表示
    modal.classList.add('show');
    
    // スライダーのリセット
    document.getElementById('scaleSlider').value = 100;
    document.getElementById('rotationSlider').value = 0;
    document.getElementById('scaleValue').textContent = '100';
    document.getElementById('rotationValue').textContent = '0';
    
    // ドラッグイベント
    setupImageDrag(canvas);
}

function drawEditingImage(ctx, width, height) {
    // キャンバスをクリア
    ctx.clearRect(0, 0, width, height);
    
    // 背景（暗いグレー）
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, width, height);
    
    if (!editingImage) return;
    
    // 画像のサイズを計算
    const scale = imageTransform.scale;
    const rotation = imageTransform.rotation * Math.PI / 180;
    
    let imgWidth = editingImage.width;
    let imgHeight = editingImage.height;
    
    // フレーム全体に収まるようにスケーリング
    const scaleX = width / imgWidth;
    const scaleY = height / imgHeight;
    const baseScale = Math.min(scaleX, scaleY);
    
    imgWidth *= baseScale * scale;
    imgHeight *= baseScale * scale;
    
    // 中心座標
    const centerX = width / 2 + imageTransform.x;
    const centerY = height / 2 + imageTransform.y;
    
    // 画像を描画
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.drawImage(editingImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();
    
    // クロップフレームを描画（600x600pxの正方形）
    const cropSize = 600;
    const cropX = (width - cropSize) / 2;
    const cropY = (height - cropSize) / 2;
    
    // 外側を暗くする（クロップ外を強調）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    
    // 上
    ctx.fillRect(0, 0, width, cropY);
    // 下
    ctx.fillRect(0, cropY + cropSize, width, height - cropY - cropSize);
    // 左
    ctx.fillRect(0, cropY, cropX, cropSize);
    // 右
    ctx.fillRect(cropX + cropSize, cropY, width - cropX - cropSize, cropSize);
    
    // クロップフレームの枠線（明るい青）
    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(cropX, cropY, cropSize, cropSize);
    
    // グリッド線（3x3）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // 縦線
    for (let i = 1; i < 3; i++) {
        const x = cropX + (cropSize / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, cropY);
        ctx.lineTo(x, cropY + cropSize);
        ctx.stroke();
    }
    
    // 横線
    for (let i = 1; i < 3; i++) {
        const y = cropY + (cropSize / 3) * i;
        ctx.beginPath();
        ctx.moveTo(cropX, y);
        ctx.lineTo(cropX + cropSize, y);
        ctx.stroke();
    }
    
    // 中央十字線（強調）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    
    // 縦の中央線
    ctx.beginPath();
    ctx.moveTo(width / 2, cropY);
    ctx.lineTo(width / 2, cropY + cropSize);
    ctx.stroke();
    
    // 横の中央線
    ctx.beginPath();
    ctx.moveTo(cropX, height / 2);
    ctx.lineTo(cropX + cropSize, height / 2);
    ctx.stroke();
    
    // フレームサイズ表示
    ctx.fillStyle = '#00BFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('600 x 600 px', width / 2, cropY - 10);
}

function setupImageDrag(canvas) {
    let isDragging = false;
    let startX, startY;
    
    const getEventPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };
    
    const onStart = (e) => {
        isDragging = true;
        const pos = getEventPos(e);
        startX = pos.x - imageTransform.x;
        startY = pos.y - imageTransform.y;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
    };
    
    const onMove = (e) => {
        if (!isDragging) return;
        const pos = getEventPos(e);
        imageTransform.x = pos.x - startX;
        imageTransform.y = pos.y - startY;
        drawEditingImage(canvas.getContext('2d'), canvas.width, canvas.height);
        e.preventDefault();
    };
    
    const onEnd = () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    };
    
    canvas.style.cursor = 'grab';
    
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    
    canvas.addEventListener('touchstart', onStart, {passive: false});
    canvas.addEventListener('touchmove', onMove, {passive: false});
    canvas.addEventListener('touchend', onEnd);
}

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
    
    // スケールスライダー
    const scaleSlider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    
    if (scaleSlider) {
        scaleSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            scaleValue.textContent = value;
            imageTransform.scale = value / 100;
            const canvas = document.getElementById('editorCanvas');
            drawEditingImage(canvas.getContext('2d'), canvas.width, canvas.height);
        });
    }
    
    // 回転スライダー
    const rotationSlider = document.getElementById('rotationSlider');
    const rotationValue = document.getElementById('rotationValue');
    
    if (rotationSlider) {
        rotationSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            rotationValue.textContent = value;
            imageTransform.rotation = parseFloat(value);
            const canvas = document.getElementById('editorCanvas');
            drawEditingImage(canvas.getContext('2d'), canvas.width, canvas.height);
        });
    }
    
    // リセットボタン
    const resetBtn = document.getElementById('imageEditorReset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            imageTransform = {
                scale: 1.0,
                rotation: 0,
                x: 0,
                y: 0
            };
            scaleSlider.value = 100;
            rotationSlider.value = 0;
            scaleValue.textContent = '100';
            rotationValue.textContent = '0';
            const canvas = document.getElementById('editorCanvas');
            drawEditingImage(canvas.getContext('2d'), canvas.width, canvas.height);
        });
    }
    
    // 適用ボタン
    const applyBtn = document.getElementById('imageEditorApply');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyImageTransform();
            closeImageEditor();
        });
    }
    
    // 閉じるボタン
    const closeBtn = document.getElementById('imageEditorClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeImageEditor);
    }
});

function applyImageTransform() {
    if (!editingImage) return;
    
    // 600x600pxの最終画像を生成
    const outputSize = 600;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const outputCtx = outputCanvas.getContext('2d');
    
    // 白背景
    outputCtx.fillStyle = '#ffffff';
    outputCtx.fillRect(0, 0, outputSize, outputSize);
    
    // 編集キャンバスのクロップ領域（600x600px）を取得
    const editorCanvas = document.getElementById('editorCanvas');
    const cropSize = 600;
    const cropX = (editorCanvas.width - cropSize) / 2;
    const cropY = (editorCanvas.height - cropSize) / 2;
    
    // トランスフォームを適用して描画
    const scale = imageTransform.scale;
    const rotation = imageTransform.rotation * Math.PI / 180;
    
    let imgWidth = editingImage.width;
    let imgHeight = editingImage.height;
    
    const scaleX = editorCanvas.width / imgWidth;
    const scaleY = editorCanvas.height / imgHeight;
    const baseScale = Math.min(scaleX, scaleY);
    
    imgWidth *= baseScale * scale;
    imgHeight *= baseScale * scale;
    
    // 画像の中心座標（編集キャンバス上）
    const centerX = editorCanvas.width / 2 + imageTransform.x;
    const centerY = editorCanvas.height / 2 + imageTransform.y;
    
    // クロップ領域の中心に対する相対座標
    const relativeCenterX = centerX - cropX;
    const relativeCenterY = centerY - cropY;
    
    // 出力キャンバスに描画
    outputCtx.save();
    outputCtx.translate(relativeCenterX, relativeCenterY);
    outputCtx.rotate(rotation);
    outputCtx.drawImage(editingImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    outputCtx.restore();
    
    // 新しい画像オブジェクトを作成
    const newImage = new Image();
    newImage.onload = () => {
        if (editingType === 'before') {
            beforeImage = newImage;
            beforePose = null;
            beforeImageSrc = null;
        } else {
            afterImage = newImage;
            afterPose = null;
            afterImageSrc = null;
        }
        
        console.log(`✅ ${editingType}画像の調整を適用 (${outputSize}x${outputSize}px)`);
    };
    newImage.src = outputCanvas.toDataURL('image/png');
}

function closeImageEditor() {
    const modal = document.getElementById('imageEditorModal');
    modal.classList.remove('show');
    editingImage = null;
    editingType = null;
}
