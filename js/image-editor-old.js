// ==================== 画像編集機能 ====================

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
    
    // キャンバスサイズを設定（固定フレームサイズ）
    const frameSize = 600;  // 600pxに統一
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
    
    // 背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // グリッドを描画
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // 縦線
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // 横線
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    if (!editingImage) return;
    
    // 画像のサイズを計算
    const scale = imageTransform.scale;
    const rotation = imageTransform.rotation * Math.PI / 180;
    
    let imgWidth = editingImage.width;
    let imgHeight = editingImage.height;
    
    // フレーム全体に収まるようにスケーリング（0.8を削除して100%利用）
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
    };
    
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
    
    // 調整済み画像を新しいCanvasに描画
    const canvas = document.createElement('canvas');
    const frameSize = 600;  // フレームサイズを600pxに統一
    canvas.width = frameSize;
    canvas.height = frameSize;
    const ctx = canvas.getContext('2d');
    
    // 白背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // トランスフォームを適用して描画
    const scale = imageTransform.scale;
    const rotation = imageTransform.rotation * Math.PI / 180;
    
    let imgWidth = editingImage.width;
    let imgHeight = editingImage.height;
    
    // フレーム全体に収まるようにスケーリング（0.8を削除して100%利用）
    const scaleX = frameSize / imgWidth;
    const scaleY = frameSize / imgHeight;
    const baseScale = Math.min(scaleX, scaleY);
    
    imgWidth *= baseScale * scale;
    imgHeight *= baseScale * scale;
    
    const centerX = frameSize / 2 + imageTransform.x;
    const centerY = frameSize / 2 + imageTransform.y;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.drawImage(editingImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();
    
    // 新しい画像オブジェクトを作成
    const newImage = new Image();
    newImage.onload = () => {
        if (editingType === 'before') {
            beforeImage = newImage;
            beforePose = null;  // 画像が変更されたのでキャッシュをクリア
            beforeImageSrc = null;
        } else {
            afterImage = newImage;
            afterPose = null;  // 画像が変更されたのでキャッシュをクリア
            afterImageSrc = null;
        }
        
        console.log(`✅ ${editingType}画像の調整を適用 (${frameSize}x${frameSize}px)`);
    };
    newImage.src = canvas.toDataURL('image/png');
}

function closeImageEditor() {
    const modal = document.getElementById('imageEditorModal');
    modal.classList.remove('show');
    editingImage = null;
    editingType = null;
}
