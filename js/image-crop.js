/**
 * 画像クロップ機能モジュール（完全独立）
 * 3:4（横:縦）の縦長比率でクロップ
 * v1.0.0 - 2026-03-22
 */

// クロップモーダルの状態管理
const cropModalState = {
    isOpen: false,
    currentImage: null,
    currentType: null, // 'before' or 'after'
    callback: null,
    cropData: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    },
    isDragging: false,
    dragHandle: null,
    dragStartX: 0,
    dragStartY: 0,
    initialCropData: null
};

// 定数
const ASPECT_RATIO = 3 / 4; // 横:縦 = 3:4
const MIN_CROP_SIZE = 100; // 最小クロップサイズ（ピクセル）

/**
 * クロップモーダルの初期化
 */
function initImageCropModal() {
    // モーダルHTMLが存在しない場合は作成
    if (!document.getElementById('imageCropModal')) {
        const modalHTML = `
            <div id="imageCropModal" class="crop-modal">
                <div class="crop-modal-content">
                    <div class="crop-modal-header">
                        <h3>画像のトリミング (3:4)</h3>
                        <button class="crop-close-btn" onclick="closeCropModal(false)">&times;</button>
                    </div>
                    <div class="crop-modal-body">
                        <div class="crop-canvas-container">
                            <img id="cropImage" src="" alt="Crop">
                            <div id="cropArea" class="crop-area">
                                <div class="crop-handle crop-handle-nw"></div>
                                <div class="crop-handle crop-handle-ne"></div>
                                <div class="crop-handle crop-handle-sw"></div>
                                <div class="crop-handle crop-handle-se"></div>
                            </div>
                        </div>
                    </div>
                    <div class="crop-modal-footer">
                        <button class="crop-btn crop-btn-secondary" onclick="closeCropModal(false)">
                            スキップ（元の画像を使用）
                        </button>
                        <button class="crop-btn crop-btn-primary" onclick="applyCrop()">
                            トリミングを適用
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // イベントリスナー設定
    setupCropHandles();
}

/**
 * クロップモーダルを開く
 * @param {string} imageData - 画像のData URL
 * @param {string} type - 'before' or 'after'
 * @param {Function} callback - クロップ完了時のコールバック
 */
function openCropModal(imageData, type, callback) {
    console.log('🖼️ クロップモーダルを開く:', type);
    
    cropModalState.isOpen = true;
    cropModalState.currentImage = imageData;
    cropModalState.currentType = type;
    cropModalState.callback = callback;

    const modal = document.getElementById('imageCropModal');
    const cropImage = document.getElementById('cropImage');

    if (!modal || !cropImage) {
        console.error('❌ クロップモーダル要素が見つかりません');
        // フォールバック: そのまま画像を返す
        if (callback) callback(imageData);
        return;
    }

    // 画像を設定
    cropImage.onload = () => {
        initializeCropArea();
        modal.style.display = 'flex';
    };

    cropImage.onerror = () => {
        console.error('❌ クロップ画像の読み込みエラー');
        closeCropModal(false);
    };

    cropImage.src = imageData;
}

/**
 * クロップエリアの初期化（3:4比率の最大サイズ）
 */
function initializeCropArea() {
    const cropImage = document.getElementById('cropImage');
    const cropArea = document.getElementById('cropArea');

    if (!cropImage || !cropArea) return;

    const imgWidth = cropImage.clientWidth;
    const imgHeight = cropImage.clientHeight;

    console.log('📐 画像サイズ:', imgWidth, 'x', imgHeight);

    // 3:4比率で画像に収まる最大サイズを計算（画像いっぱいに）
    let cropWidth, cropHeight;

    if (imgWidth / imgHeight > ASPECT_RATIO) {
        // 画像が横長 → 高さを基準に最大化
        cropHeight = imgHeight;
        cropWidth = cropHeight * ASPECT_RATIO;
    } else {
        // 画像が縦長 → 幅を基準に最大化
        cropWidth = imgWidth;
        cropHeight = cropWidth / ASPECT_RATIO;
    }

    // 中央配置
    const x = (imgWidth - cropWidth) / 2;
    const y = (imgHeight - cropHeight) / 2;

    cropModalState.cropData = { x, y, width: cropWidth, height: cropHeight };

    // CSSで位置とサイズを設定
    cropArea.style.left = `${x}px`;
    cropArea.style.top = `${y}px`;
    cropArea.style.width = `${cropWidth}px`;
    cropArea.style.height = `${cropHeight}px`;
    cropArea.style.display = 'block';

    console.log('✅ クロップエリア初期化:', cropModalState.cropData);
}

/**
 * クロップハンドルのイベント設定
 */
function setupCropHandles() {
    const handles = document.querySelectorAll('.crop-handle');
    const cropArea = document.getElementById('cropArea');

    if (!cropArea) return;

    handles.forEach(handle => {
        handle.addEventListener('mousedown', startDrag);
        handle.addEventListener('touchstart', startDrag);
    });

    // クロップエリア全体のドラッグ（移動）
    cropArea.addEventListener('mousedown', startDrag);
    cropArea.addEventListener('touchstart', startDrag);

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

/**
 * ドラッグ開始
 */
function startDrag(e) {
    if (!cropModalState.isOpen) return;

    e.preventDefault();
    cropModalState.isDragging = true;

    const target = e.target;
    if (target.classList.contains('crop-handle')) {
        cropModalState.dragHandle = target.className.split(' ')[1]; // crop-handle-nw など
    } else if (target.id === 'cropArea') {
        cropModalState.dragHandle = 'move';
    } else {
        return;
    }

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    cropModalState.dragStartX = clientX;
    cropModalState.dragStartY = clientY;
    cropModalState.initialCropData = { ...cropModalState.cropData };
}

/**
 * ドラッグ中
 */
function handleDrag(e) {
    if (!cropModalState.isDragging) return;

    e.preventDefault();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const dx = clientX - cropModalState.dragStartX;
    const dy = clientY - cropModalState.dragStartY;

    const cropImage = document.getElementById('cropImage');
    const cropArea = document.getElementById('cropArea');
    if (!cropImage || !cropArea) return;

    const imgWidth = cropImage.clientWidth;
    const imgHeight = cropImage.clientHeight;
    const initial = cropModalState.initialCropData;

    let newX = initial.x;
    let newY = initial.y;
    let newWidth = initial.width;
    let newHeight = initial.height;

    // ハンドルの種類に応じて処理
    if (cropModalState.dragHandle === 'move') {
        // 移動
        newX = initial.x + dx;
        newY = initial.y + dy;
    } else if (cropModalState.dragHandle.includes('nw')) {
        // 左上
        newX = initial.x + dx;
        newY = initial.y + dy;
        newWidth = initial.width - dx;
        newHeight = initial.height - dy;
    } else if (cropModalState.dragHandle.includes('ne')) {
        // 右上
        newY = initial.y + dy;
        newWidth = initial.width + dx;
        newHeight = initial.height - dy;
    } else if (cropModalState.dragHandle.includes('sw')) {
        // 左下
        newX = initial.x + dx;
        newWidth = initial.width - dx;
        newHeight = initial.height + dy;
    } else if (cropModalState.dragHandle.includes('se')) {
        // 右下
        newWidth = initial.width + dx;
        newHeight = initial.height + dy;
    }

    // アスペクト比を維持（リサイズ時のみ）
    if (cropModalState.dragHandle !== 'move') {
        // 幅基準で高さを調整
        newHeight = newWidth / ASPECT_RATIO;
    }

    // 最小サイズチェック
    if (newWidth < MIN_CROP_SIZE || newHeight < MIN_CROP_SIZE) {
        return;
    }

    // 画像境界チェック
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + newWidth > imgWidth) {
        if (cropModalState.dragHandle === 'move') {
            newX = imgWidth - newWidth;
        } else {
            newWidth = imgWidth - newX;
            newHeight = newWidth / ASPECT_RATIO;
        }
    }
    if (newY + newHeight > imgHeight) {
        if (cropModalState.dragHandle === 'move') {
            newY = imgHeight - newHeight;
        } else {
            newHeight = imgHeight - newY;
            newWidth = newHeight * ASPECT_RATIO;
        }
    }

    // 更新
    cropModalState.cropData = { x: newX, y: newY, width: newWidth, height: newHeight };
    cropArea.style.left = `${newX}px`;
    cropArea.style.top = `${newY}px`;
    cropArea.style.width = `${newWidth}px`;
    cropArea.style.height = `${newHeight}px`;
}

/**
 * ドラッグ終了
 */
function endDrag() {
    cropModalState.isDragging = false;
    cropModalState.dragHandle = null;
}

/**
 * クロップを適用
 */
function applyCrop() {
    console.log('✂️ クロップを適用');

    const cropImage = document.getElementById('cropImage');
    if (!cropImage || !cropImage.complete) {
        console.error('❌ 画像がロードされていません');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 実際の画像サイズと表示サイズの比率を計算
    const displayWidth = cropImage.clientWidth;
    const displayHeight = cropImage.clientHeight;
    const naturalWidth = cropImage.naturalWidth;
    const naturalHeight = cropImage.naturalHeight;

    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;

    const crop = cropModalState.cropData;

    // 実際のクロップ座標を計算
    const actualX = crop.x * scaleX;
    const actualY = crop.y * scaleY;
    const actualWidth = crop.width * scaleX;
    const actualHeight = crop.height * scaleY;

    console.log('📐 クロップ座標 (表示):', crop);
    console.log('📐 クロップ座標 (実際):', { actualX, actualY, actualWidth, actualHeight });

    // キャンバスサイズ設定
    canvas.width = actualWidth;
    canvas.height = actualHeight;

    // 白背景を描画（JPEGの場合の黒背景を防ぐ）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, actualWidth, actualHeight);

    // クロップして描画
    ctx.drawImage(
        cropImage,
        actualX, actualY, actualWidth, actualHeight, // ソース
        0, 0, actualWidth, actualHeight // デスティネーション
    );

    // Data URLとして出力（元の画像形式を維持）
    // 元画像がPNGならPNG、JPEGならJPEGで出力
    let outputFormat = 'image/jpeg';
    let outputQuality = 0.95;
    
    // 元画像のData URLから形式を判定
    if (cropModalState.currentImage.startsWith('data:image/png')) {
        outputFormat = 'image/png';
        outputQuality = 1.0; // PNGは品質パラメータ不要だが念のため
    }
    
    const croppedImageData = canvas.toDataURL(outputFormat, outputQuality);

    console.log('✅ クロップ完了');

    // コールバック実行
    if (cropModalState.callback) {
        cropModalState.callback(croppedImageData);
    }

    closeCropModal(true);
}

/**
 * クロップモーダルを閉じる
 * @param {boolean} applied - クロップが適用されたか
 */
function closeCropModal(applied) {
    console.log('🚪 クロップモーダルを閉じる (適用:', applied, ')');

    const modal = document.getElementById('imageCropModal');
    const cropArea = document.getElementById('cropArea');
    const cropImage = document.getElementById('cropImage');

    if (modal) modal.style.display = 'none';
    if (cropArea) cropArea.style.display = 'none';
    if (cropImage) cropImage.src = '';

    // スキップ時は元の画像をそのまま返す
    if (!applied && cropModalState.callback) {
        cropModalState.callback(cropModalState.currentImage);
    }

    // 状態リセット
    cropModalState.isOpen = false;
    cropModalState.currentImage = null;
    cropModalState.currentType = null;
    cropModalState.callback = null;
    cropModalState.isDragging = false;
    cropModalState.dragHandle = null;
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageCropModal);
} else {
    initImageCropModal();
}
