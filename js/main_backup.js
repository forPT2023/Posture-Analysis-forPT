// 姿勢分析ツール v1.0 - メインスクリプト
console.log('📦 main.js (v1.0) 読み込み完了');

// ==================== グローバル変数 ====================
let selectedPlane = 'frontal'; // 'frontal' または 'sagittal'
let beforeImage = null;
let afterImage = null;
let beforePose = null;
let afterPose = null;
let currentLayout = 'horizontal'; // 'horizontal' または 'vertical'
let showSkeleton = true;
let showMetrics = true;
let showHighlight = false;  // 変化ハイライトはデフォルトOFF（精度が高くないため）
let showReferenceLine = true;  // 基準線表示（矢状面のみ）
let lineWidth = 2;  // 線の太さを2pxに設定
let beforeColor = '#2196F3'; // 青
let afterColor = '#F44336'; // 赤

// MediaPipe Pose インスタンス
let pose = null;

// ==================== 初期化 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 初期化開始');
    
    // 今日の日付を設定
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reportDate');
    const datePreview = document.getElementById('previewDate');
    if (dateInput && datePreview) {
        dateInput.value = today;
        datePreview.textContent = formatDate(today);
    }
    
    // MediaPipe Pose初期化
    initMediaPipe();
    
    // イベントリスナー設定
    setupEventListeners();
    
    console.log('✅ 初期化完了');
});

// ==================== MediaPipe Pose 初期化 ====================
function initMediaPipe() {
    console.log('🤖 MediaPipe Pose 初期化開始');
    
    try {
        pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.3,  // 側面画像でも検出しやすいように緩和
            minTrackingConfidence: 0.3    // 側面画像でも検出しやすいように緩和
        });
        
        console.log('✅ MediaPipe Pose 初期化完了');
    } catch (error) {
        console.error('❌ MediaPipe Pose 初期化エラー:', error);
        showStatus('MediaPipe Poseの初期化に失敗しました', 'error');
    }
}

// ==================== イベントリスナー設定 ====================
function setupEventListeners() {
    // 基本情報
    const titleInput = document.getElementById('reportTitle');
    const titlePreview = document.getElementById('previewTitle');
    if (titleInput && titlePreview) {
        titleInput.addEventListener('input', () => {
            titlePreview.textContent = titleInput.value || 'ビフォーアフター';
        });
    }
    
    const nameInput = document.getElementById('patientName');
    const namePreview = document.getElementById('previewPatient');
    if (nameInput && namePreview) {
        nameInput.addEventListener('input', () => {
            namePreview.textContent = nameInput.value || '氏名';
        });
    }
    
    const dateInput = document.getElementById('reportDate');
    const datePreview = document.getElementById('previewDate');
    if (dateInput && datePreview) {
        dateInput.addEventListener('change', () => {
            datePreview.textContent = formatDate(dateInput.value);
        });
    }
    
    // 面選択
    document.querySelectorAll('input[name="plane"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedPlane = e.target.value;
            console.log('📐 撮影面変更:', selectedPlane);
        });
    });
    
    // 画像アップロード - Before
    const uploadAreaBefore = document.getElementById('uploadAreaBefore');
    const fileInputBefore = document.getElementById('fileInputBefore');
    
    if (uploadAreaBefore && fileInputBefore) {
        uploadAreaBefore.addEventListener('click', () => {
            fileInputBefore.click();
        });
        
        fileInputBefore.addEventListener('change', (e) => {
            handleImageUpload(e.target.files[0], 'before');
        });
    }
    
    // 画像アップロード - After
    const uploadAreaAfter = document.getElementById('uploadAreaAfter');
    const fileInputAfter = document.getElementById('fileInputAfter');
    
    if (uploadAreaAfter && fileInputAfter) {
        uploadAreaAfter.addEventListener('click', () => {
            fileInputAfter.click();
        });
        
        fileInputAfter.addEventListener('change', (e) => {
            handleImageUpload(e.target.files[0], 'after');
        });
    }
    
    // 分析ボタン
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzePose);
    }
    
    // レイアウト選択
    const layoutHorizontal = document.getElementById('layoutHorizontal');
    const layoutVertical = document.getElementById('layoutVertical');
    
    if (layoutHorizontal) {
        layoutHorizontal.addEventListener('click', () => {
            console.log('🔘 横並びボタンクリック');
            currentLayout = 'horizontal';
            updateLayoutButtons();
            updateDisplay();
        });
    }
    
    if (layoutVertical) {
        layoutVertical.addEventListener('click', () => {
            console.log('🔘 縦並びボタンクリック');
            currentLayout = 'vertical';
            updateLayoutButtons();
            updateDisplay();
        });
    }
    
    // 表示設定
    const showSkeletonCheck = document.getElementById('showSkeleton');
    if (showSkeletonCheck) {
        showSkeletonCheck.addEventListener('change', (e) => {
            showSkeleton = e.target.checked;
            updateDisplay();
        });
    }
    
    const showMetricsCheck = document.getElementById('showMetrics');
    if (showMetricsCheck) {
        showMetricsCheck.addEventListener('change', (e) => {
            showMetrics = e.target.checked;
            const metricsArea = document.getElementById('metricsArea');
            if (metricsArea) {
                metricsArea.style.display = showMetrics ? 'block' : 'none';
            }
            updateDisplay();
        });
    }
    
    const showHighlightCheck = document.getElementById('showHighlight');
    if (showHighlightCheck) {
        // 初期状態をJavaScriptの変数と同期
        showHighlightCheck.checked = showHighlight;
        
        showHighlightCheck.addEventListener('change', (e) => {
            showHighlight = e.target.checked;
            updateDisplay();
        });
    }
    
    const showReferenceLineCheck = document.getElementById('showReferenceLine');
    if (showReferenceLineCheck) {
        // 初期状態をJavaScriptの変数と同期
        showReferenceLineCheck.checked = showReferenceLine;
        
        showReferenceLineCheck.addEventListener('change', (e) => {
            showReferenceLine = e.target.checked;
            console.log('📐 基準線表示:', showReferenceLine ? 'ON' : 'OFF');
            updateDisplay();
        });
    }
    
    // 線の太さ
    const lineWidthSlider = document.getElementById('lineWidth');
    const lineWidthValue = document.getElementById('lineWidthValue');
    if (lineWidthSlider && lineWidthValue) {
        lineWidthSlider.addEventListener('input', (e) => {
            lineWidth = parseInt(e.target.value);
            lineWidthValue.textContent = `${lineWidth}px`;
            updateDisplay();
        });
    }
    
    // 色選択
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const color = btn.dataset.color;
            
            // 同じグループの他のボタンからactiveを削除
            document.querySelectorAll(`.color-btn[data-target="${target}"]`).forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            
            if (target === 'before') {
                beforeColor = color;
            } else {
                afterColor = color;
            }
            updateDisplay();
        });
    });
    
    // 表示更新ボタン
    const updateDisplayBtn = document.getElementById('updateDisplayBtn');
    if (updateDisplayBtn) {
        updateDisplayBtn.addEventListener('click', updateDisplay);
    }
    
    // データ保存・読み込み
    const saveDataBtn = document.getElementById('saveDataBtn');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const loadDataInput = document.getElementById('loadDataInput');
    
    if (saveDataBtn) {
        saveDataBtn.addEventListener('click', saveData);
    }
    
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', () => {
            loadDataInput.click();
        });
    }
    
    if (loadDataInput) {
        loadDataInput.addEventListener('change', loadData);
    }
    
    // エクスポート
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const exportJpgBtn = document.getElementById('exportJpgBtn');
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => exportDoc('pdf'));
    }
    
    if (exportPngBtn) {
        exportPngBtn.addEventListener('click', () => exportDoc('png'));
    }
    
    if (exportJpgBtn) {
        exportJpgBtn.addEventListener('click', () => exportDoc('jpg'));
    }
    
    console.log('✅ イベントリスナー設定完了');
}

// ==================== ユーティリティ関数 ====================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('analysisStatus');
    if (!statusEl) return;
    
    statusEl.className = `analysis-status ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'analyzing') icon = 'fa-spinner fa-spin';
    else if (type === 'success') icon = 'fa-check-circle';
    else if (type === 'error') icon = 'fa-exclamation-triangle';
    
    statusEl.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
}

function updateLayoutButtons() {
    const horizontalBtn = document.getElementById('layoutHorizontal');
    const verticalBtn = document.getElementById('layoutVertical');
    
    if (currentLayout === 'horizontal') {
        horizontalBtn?.classList.add('active');
        verticalBtn?.classList.remove('active');
    } else {
        horizontalBtn?.classList.remove('active');
        verticalBtn?.classList.add('active');
    }
}

// ==================== 画像アップロード処理 ====================
function handleImageUpload(file, type) {
    if (!file) return;
    
    console.log(`📸 画像アップロード: ${type}`, file.name);
    
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            console.log(`✅ 画像読み込み完了: ${type}`, img.width, 'x', img.height);
            
            if (type === 'before') {
                beforeImage = img;
                showPreviewThumbnail(e.target.result, 'previewBefore');
            } else {
                afterImage = img;
                showPreviewThumbnail(e.target.result, 'previewAfter');
            }
            
            // 両方の画像がアップロードされたら分析ボタンを有効化
            updateAnalyzeButton();
        };
        
        img.onerror = () => {
            console.error(`❌ 画像読み込みエラー: ${type}`);
            alert('画像の読み込みに失敗しました');
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        console.error(`❌ ファイル読み込みエラー: ${type}`);
        alert('ファイルの読み込みに失敗しました');
    };
    
    reader.readAsDataURL(file);
}

function showPreviewThumbnail(src, elementId) {
    const preview = document.getElementById(elementId);
    if (!preview) return;
    
    preview.innerHTML = `<img src="${src}" alt="Preview">`;
    preview.classList.add('active');
}

function updateAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    if (beforeImage && afterImage) {
        analyzeBtn.disabled = false;
        showStatus('分析を開始する準備ができました', 'success');
    }
}

// ==================== 姿勢分析処理 ====================
async function analyzePose() {
    if (!beforeImage || !afterImage) {
        alert('ビフォーとアフターの両方の画像をアップロードしてください');
        return;
    }
    
    if (!pose) {
        alert('MediaPipe Poseが初期化されていません。ページをリロードしてください。');
        return;
    }
    
    console.log('🤖 姿勢分析開始');
    showStatus('姿勢を分析中...', 'analyzing');
    
    try {
        // Before画像の分析
        showStatus('Before画像を分析中... (1/2)', 'analyzing');
        beforePose = await detectPose(beforeImage);
        
        if (!beforePose || !beforePose.poseLandmarks) {
            throw new Error('Before画像から姿勢を検出できませんでした。\n人物が正面または横向きで全身が写っているか確認してください。');
        }
        
        console.log('✅ Before画像の姿勢検出完了', beforePose.poseLandmarks.length, '個の関節点');
        
        // After画像の分析
        showStatus('After画像を分析中... (2/2)', 'analyzing');
        afterPose = await detectPose(afterImage);
        
        if (!afterPose || !afterPose.poseLandmarks) {
            throw new Error('After画像から姿勢を検出できませんでした。\n人物が正面または横向きで全身が写っているか確認してください。');
        }
        
        console.log('✅ After画像の姿勢検出完了', afterPose.poseLandmarks.length, '個の関節点');
        
        // 結果を表示
        showStatus('分析完了！結果を表示しています', 'success');
        displayResults();
        
        // 設定パネルとエクスポートセクションを表示
        document.getElementById('displaySettings').style.display = 'block';
        document.getElementById('exportSection').style.display = 'block';
        
    } catch (error) {
        console.error('❌ 姿勢分析エラー:', error);
        showStatus('分析エラー', 'error');
        alert(error.message || '姿勢の分析中にエラーが発生しました');
    }
}

function detectPose(image) {
    return new Promise((resolve, reject) => {
        console.log('🔍 姿勢検出開始:', {
            width: image.width,
            height: image.height
        });
        
        // 画像をリサイズ（大きすぎる画像はMediaPipeで処理できない）
        const maxSize = 1280;
        let width = image.width;
        let height = image.height;
        
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
            console.log('📏 画像リサイズ:', `${image.width}x${image.height} → ${width}x${height}`);
        }
        
        // Canvasに画像を描画（リサイズ後のサイズ）
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
        
        // タイムアウト設定（10秒）
        const timeout = setTimeout(() => {
            reject(new Error('姿勢検出がタイムアウトしました（10秒）'));
        }, 10000);
        
        // MediaPipe Poseで検出
        // 重要: onResultsは一度だけ設定し、resultsを受け取ったら即座にresolve
        const onResultsHandler = (results) => {
            clearTimeout(timeout);
            console.log('📦 MediaPipe結果受信:', {
                poseLandmarks: results.poseLandmarks ? results.poseLandmarks.length : 0,
                poseWorldLandmarks: results.poseWorldLandmarks ? 'あり' : 'なし'
            });
            
            if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
                reject(new Error('姿勢を検出できませんでした。\n人物が正面または横向きで全身が写っているか確認してください。'));
            } else {
                resolve(results);
            }
        };
        
        // onResultsを設定してから送信
        pose.onResults(onResultsHandler);
        
        pose.send({ image: canvas }).catch((error) => {
            clearTimeout(timeout);
            console.error('❌ MediaPipe Pose送信エラー:', error);
            reject(error);
        });
    });
}

// ==================== 結果表示 ====================
function displayResults() {
    console.log('📊 結果表示開始');
    
    // 空の状態を非表示、レポートコンテンツを表示
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('reportContent').style.display = 'flex';
    
    // preview-canvasにレイアウトクラスを追加
    const previewCanvas = document.getElementById('previewCanvas');
    if (previewCanvas) {
        previewCanvas.className = `preview-canvas layout-${currentLayout}`;
    }
    
    // 比較エリアを生成
    generateComparisonArea();
    
    // 数値データを生成
    if (showMetrics) {
        generateMetrics();
    }
}

function generateComparisonArea() {
    const comparisonArea = document.getElementById('comparisonArea');
    if (!comparisonArea) return;
    
    // レイアウトクラスを設定
    comparisonArea.className = `comparison-area ${currentLayout}`;
    
    // Before/After の Canvas を作成
    comparisonArea.innerHTML = `
        <div class="comparison-item">
            <div class="comparison-label" style="background: ${beforeColor};">Before</div>
            <div class="comparison-canvas-wrapper">
                <canvas class="comparison-canvas" id="canvasBefore"></canvas>
            </div>
        </div>
        <div class="comparison-item">
            <div class="comparison-label" style="background: ${afterColor};">After</div>
            <div class="comparison-canvas-wrapper">
                <canvas class="comparison-canvas" id="canvasAfter"></canvas>
            </div>
        </div>
    `;
    
    // 🔥 重要: innerHTML設定後にインラインスタイルを適用（!important付きでCSSの競合を完全に排除）
    comparisonArea.style.setProperty('flex-direction', 'row', 'important');
    comparisonArea.style.setProperty('display', 'flex', 'important');
    comparisonArea.style.setProperty('gap', '10px', 'important');
    
    console.log('🔄 比較エリアレイアウト強制設定:', currentLayout, '| flexDirection: row !important (最優先)');
    
    // Canvasに描画
    drawComparisonCanvas('canvasBefore', beforeImage, beforePose, beforeColor);
    drawComparisonCanvas('canvasAfter', afterImage, afterPose, afterColor);
}

function drawComparisonCanvas(canvasId, image, poseResults, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // レイアウトに応じてCanvasの最大サイズを設定
    // A4サイズ: 横向き297x210mm、縦向き210x297mm
    // padding 20mm x 2 = 40mm を引く
    // 1mm ≈ 3.7795px (96dpi)
    let maxWidth, maxHeight;
    
    if (currentLayout === 'vertical') {
        // 縦並び: A4縦向き (210mm x 297mm)
        // 実効エリア: (210-40) x (297-40) = 170mm x 257mm
        // 画像は横並び配置（縦長写真に最適）: 各画像 約80mm x 200mm
        // ヘッダー(約15mm) + 画像エリア(220mm) + 数値(約20mm) ≈ 255mm
        maxWidth = 75 * 3.7795;    // 約283px（各画像の幅）
        maxHeight = 200 * 3.7795;  // 約756px（縦長写真対応）
    } else {
        // 横並び: A4横向き (297mm x 210mm)
        // 実効エリア: (297-40) x (210-40) = 257mm x 170mm
        // 2つの画像を横に配置: 各画像 約120mm x 150mm
        // ヘッダー(約15mm) + 画像エリア(140mm) + 数値(約15mm) ≈ 170mm
        maxWidth = 120 * 3.7795;   // 約453px
        maxHeight = 130 * 3.7795;  // 約491px
    }
    
    let width = image.width;
    let height = image.height;
    
    // アスペクト比を維持してリサイズ
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // 画像を描画
    ctx.drawImage(image, 0, 0, width, height);
    
    // 骨格線を描画
    if (showSkeleton && poseResults && poseResults.poseLandmarks) {
        drawSkeleton(ctx, poseResults.poseLandmarks, width, height, color);
    }
}

// ==================== 骨格線描画 ====================
function drawSkeleton(ctx, landmarks, canvasWidth, canvasHeight, color) {
    // 📐 矢状面の基準線を最初に描画（最背面）
    if (selectedPlane === 'sagittal' && showReferenceLine) {
        drawReferenceLine(ctx, landmarks, canvasWidth, canvasHeight);
    }
    
    // MediaPipe Pose の関節接続定義
    let connections;
    
    if (selectedPlane === 'frontal') {
        // 前額面（正面）: 顔は中央（鼻）と耳のみ
        connections = [
            // 顔（シンプル化）
            [0, 7], [0, 8],  // 鼻→左右の耳
            // 体幹
            [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
            [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
            [11, 23], [12, 24], [23, 24],
            // 左脚
            [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
            // 右脚
            [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]
        ];
    } else {
        // 矢状面（側面）: 手前側のみ表示（zが小さい方）
        // まず左右どちらが手前かを判定
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        
        console.log('🔍 矢状面ランドマーク確認:', {
            leftShoulder: leftShoulder ? 'あり' : 'なし',
            rightShoulder: rightShoulder ? 'あり' : 'なし',
            leftShoulderZ: leftShoulder?.z,
            rightShoulderZ: rightShoulder?.z,
            leftShoulderVisibility: leftShoulder?.visibility,
            rightShoulderVisibility: rightShoulder?.visibility
        });
        
        // 重要なランドマークのvisibilityを確認
        const keyLandmarks = [7, 8, 11, 12, 23, 24, 25, 26];
        console.log('🔍 主要ランドマークのvisibility:', 
            keyLandmarks.map(i => `[${i}]:${landmarks[i]?.visibility?.toFixed(2) || 'N/A'}`).join(', ')
        );
        
        // z座標が存在しない、または同じ値の場合はデフォルトで左側を表示
        let isLeftFront = true;
        
        if (leftShoulder && rightShoulder && 
            typeof leftShoulder.z !== 'undefined' && 
            typeof rightShoulder.z !== 'undefined') {
            // z座標が小さい方が手前（カメラに近い）
            isLeftFront = leftShoulder.z < rightShoulder.z;
            
            console.log('🎯 矢状面判定:', {
                leftZ: leftShoulder.z.toFixed(3),
                rightZ: rightShoulder.z.toFixed(3),
                frontSide: isLeftFront ? '左側が手前' : '右側が手前'
            });
        } else {
            console.log('⚠️ z座標が取得できないため、デフォルトで左側を表示します');
        }
        
        if (isLeftFront) {
            // 左側が手前（顔と腕は非表示、耳を追加して視認性向上）
            connections = [
                // 頭部ガイド
                [7, 11],   // 左耳→左肩（追加: 頭部の位置を示す）
                // 体幹（左側）
                [11, 23],  // 左肩→左腰
                // 左脚
                [23, 25], [25, 27], [27, 29], [29, 31], [27, 31]
            ];
            console.log('📐 矢状面（左側）接続数:', connections.length, '本');
        } else {
            // 右側が手前（顔と腕は非表示、耳を追加して視認性向上）
            connections = [
                // 頭部ガイド
                [8, 12],   // 右耳→右肩（追加: 頭部の位置を示す）
                // 体幹（右側）
                [12, 24],  // 右肩→右腰
                // 右脚
                [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]
            ];
            console.log('📐 矢状面（右側）接続数:', connections.length, '本');
        }
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 線を描画
    let drawnLines = 0;
    // 🔧 前額面・矢状面ともにvisibilityしきい値を0.3に統一（検出率向上）
    const visibilityThreshold = 0.3;
    
    // デバッグ: 前額面の主要ランドマークのvisibilityを確認
    if (selectedPlane === 'frontal') {
        const importantLandmarks = {
            '左肩(11)': landmarks[11],
            '右肩(12)': landmarks[12],
            '左肘(13)': landmarks[13],
            '右肘(14)': landmarks[14],
            '左手首(15)': landmarks[15],
            '右手首(16)': landmarks[16],
            '左腰(23)': landmarks[23],
            '右腰(24)': landmarks[24],
            '左膝(25)': landmarks[25],
            '右膝(26)': landmarks[26],
            '左足首(27)': landmarks[27],
            '右足首(28)': landmarks[28]
        };
        
        console.log('🔍 前額面の主要ランドマーク visibility:');
        Object.entries(importantLandmarks).forEach(([name, landmark]) => {
            if (landmark) {
                const vis = landmark.visibility.toFixed(2);
                const status = landmark.visibility > visibilityThreshold ? '✅' : '❌';
                console.log(`  ${status} ${name}: ${vis}`);
            } else {
                console.log(`  ❌ ${name}: なし`);
            }
        });
    }
    
    connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        if (startPoint && endPoint && 
            startPoint.visibility > visibilityThreshold && 
            endPoint.visibility > visibilityThreshold) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvasWidth, startPoint.y * canvasHeight);
            ctx.lineTo(endPoint.x * canvasWidth, endPoint.y * canvasHeight);
            ctx.stroke();
            drawnLines++;
        }
    });
    console.log(`🎨 描画した線: ${drawnLines}/${connections.length}本 (しきい値: ${visibilityThreshold})`);
    
    // 変化ハイライトを描画（Afterの場合のみ）
    if (showHighlight && beforePose && color === afterColor) {
        drawChangeHighlight(ctx, landmarks, canvasWidth, canvasHeight);
    }
    
    // 関節点を描画（connectionsに含まれるポイントのみ）
    ctx.fillStyle = color;
    const pointsToShow = new Set();
    connections.forEach(([start, end]) => {
        pointsToShow.add(start);
        pointsToShow.add(end);
    });
    
    // 顔の不要なポイントを除外（目と口を除外し、鼻と耳のみ表示）
    const facePointsToExclude = new Set([1, 2, 3, 4, 5, 6, 9, 10]);
    
    // デバッグ: 顔のポイントで何が描画されるか
    const facePointsDrawn = Array.from(pointsToShow).filter(i => i <= 10 && !facePointsToExclude.has(i));
    console.log('🎨 描画される顔のポイント:', facePointsDrawn);
    
    // デバッグ: 描画されるポイントの総数
    let drawnPoints = 0;
    landmarks.forEach((landmark, index) => {
        if (pointsToShow.has(index) && !facePointsToExclude.has(index) && landmark.visibility > visibilityThreshold) {
            drawnPoints++;
        }
    });
    console.log(`🎯 描画されるポイント: ${drawnPoints}/${pointsToShow.size}個 (しきい値: ${visibilityThreshold})`);
    
    landmarks.forEach((landmark, index) => {
        // connectionsに含まれ、顔の不要ポイントでなく、visibilityが高い場合のみ描画
        // 矢状面・前額面ともに同じしきい値を使用
        if (pointsToShow.has(index) && !facePointsToExclude.has(index) && landmark.visibility > visibilityThreshold) {
            const x = landmark.x * canvasWidth;
            const y = landmark.y * canvasHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, lineWidth * 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

function drawReferenceLine(ctx, landmarks, canvasWidth, canvasHeight) {
    // 矢状面の重力線（Plumb Line）を描画
    // 耳のX座標を基準に垂直線を引く
    
    console.log('🔧 drawReferenceLine 呼び出し:', {
        landmarksCount: landmarks.length,
        selectedPlane: selectedPlane,
        showReferenceLine: showReferenceLine
    });
    
    // 手前側の耳を判定
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    
    console.log('👂 耳ランドマーク確認:', {
        leftEar: leftEar ? `あり (vis: ${leftEar.visibility?.toFixed(2)}, x: ${leftEar.x?.toFixed(3)})` : 'なし',
        rightEar: rightEar ? `あり (vis: ${rightEar.visibility?.toFixed(2)}, x: ${rightEar.x?.toFixed(3)})` : 'なし',
        leftShoulder: leftShoulder ? `あり (z: ${leftShoulder.z?.toFixed(3)})` : 'なし',
        rightShoulder: rightShoulder ? `あり (z: ${rightShoulder.z?.toFixed(3)})` : 'なし'
    });
    
    let isLeftFront = true;
    if (leftShoulder && rightShoulder && 
        typeof leftShoulder.z !== 'undefined' && 
        typeof rightShoulder.z !== 'undefined') {
        isLeftFront = leftShoulder.z < rightShoulder.z;
    }
    
    const ear = landmarks[isLeftFront ? 7 : 8];  // 手前側の耳
    
    if (!ear) {
        console.log('❌ 基準線: 耳のランドマークが存在しません');
        return;
    }
    
    if (ear.visibility < 0.3) {
        console.log('⚠️ 基準線: 耳の visibility が低いため表示できません', {
            earVisibility: ear.visibility,
            threshold: 0.3
        });
        return;
    }
    
    const earX = ear.x * canvasWidth;
    
    console.log('✅ 基準線描画実行:', {
        side: isLeftFront ? '左側' : '右側',
        earIndex: isLeftFront ? 7 : 8,
        earX: earX.toFixed(1),
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        visibility: ear.visibility.toFixed(2)
    });
    
    // 基準線を描画（最背面）
    ctx.save();
    ctx.globalAlpha = 0.6;  // 半透明度を設定
    ctx.strokeStyle = 'rgba(255, 215, 0, 1.0)';  // 金色（透明度は globalAlpha で制御）
    ctx.lineWidth = 2;  // 視認性向上のため 2px に変更
    ctx.setLineDash([10, 5]);  // 破線（10pxオン、5pxオフ）
    
    ctx.beginPath();
    ctx.moveTo(earX, 0);           // 画面上端から
    ctx.lineTo(earX, canvasHeight); // 画面下端まで
    ctx.stroke();
    
    console.log('✅ 基準線描画完了: 金色の破線が描画されました');
    
    ctx.setLineDash([]);  // 破線解除
    ctx.restore();
}

function drawChangeHighlight(ctx, afterLandmarks, canvasWidth, canvasHeight) {
    if (!beforePose || !beforePose.poseLandmarks) return;
    
    const beforeLandmarks = beforePose.poseLandmarks;
    
    // 顔の不要なポイントを除外（目と口を除外し、鼻と耳のみ表示）
    const facePointsToExclude = new Set([1, 2, 3, 4, 5, 6, 9, 10]);
    
    // 各関節の変化量を計算してグラデーション表示
    afterLandmarks.forEach((afterPoint, index) => {
        const beforePoint = beforeLandmarks[index];
        
        if (!beforePoint || !afterPoint) return;
        if (beforePoint.visibility < 0.5 || afterPoint.visibility < 0.5) return;
        
        // 顔の不要ポイントはスキップ
        if (facePointsToExclude.has(index)) return;
        
        // 移動距離を計算（正規化座標で）
        const dx = afterPoint.x - beforePoint.x;
        const dy = afterPoint.y - beforePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 変化量に応じて色を設定（緑→黄→赤）
        let highlightColor;
        if (distance < 0.02) {
            highlightColor = 'rgba(76, 175, 80, 0.3)'; // 緑（変化小）
        } else if (distance < 0.05) {
            highlightColor = 'rgba(255, 193, 7, 0.5)'; // 黄色（変化中）
        } else {
            highlightColor = 'rgba(244, 67, 54, 0.7)'; // 赤（変化大）
        }
        
        // 変化が大きい関節をハイライト
        if (distance >= 0.02) {
            ctx.fillStyle = highlightColor;
            const x = afterPoint.x * canvasWidth;
            const y = afterPoint.y * canvasHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, lineWidth * 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// ==================== 数値データ生成 ====================
function generateMetrics() {
    if (!beforePose || !afterPose) return;
    
    const metricsArea = document.getElementById('metricsArea');
    if (!metricsArea) return;
    
    metricsArea.style.display = showMetrics ? 'block' : 'none';
    
    const beforeLandmarks = beforePose.poseLandmarks;
    const afterLandmarks = afterPose.poseLandmarks;
    
    // 数値計算
    const metrics = calculateMetrics(beforeLandmarks, afterLandmarks);
    
    // HTML生成（ポジティブな結果のみ表示）
    const planeTitle = selectedPlane === 'frontal' ? '前額面（正面）' : '矢状面（側面）';
    
    // 改善された項目のみを収集
    const improvedMetrics = [];
    if (metrics.metric1Improved) improvedMetrics.push(generateMetricHTML(metrics.metric1Label, metrics.metric1Value, metrics.metric1Unit, true));
    if (metrics.metric2Improved) improvedMetrics.push(generateMetricHTML(metrics.metric2Label, metrics.metric2Value, metrics.metric2Unit, true));
    if (metrics.metric3Improved) improvedMetrics.push(generateMetricHTML(metrics.metric3Label, metrics.metric3Value, metrics.metric3Unit, true));
    if (metrics.metric4Improved) improvedMetrics.push(generateMetricHTML(metrics.metric4Label, metrics.metric4Value, metrics.metric4Unit, true));
    
    // 改善項目がある場合のみ表示
    if (improvedMetrics.length > 0) {
        metricsArea.innerHTML = `
            <div class="metrics-title">姿勢改善の数値データ - ${planeTitle}</div>
            <div class="metrics-grid">
                ${improvedMetrics.join('')}
            </div>
        `;
    } else {
        metricsArea.innerHTML = `
            <div class="metrics-title">姿勢変化の数値データ - ${planeTitle}</div>
            <div class="metrics-message">
                <p>測定可能な改善は検出されませんでしたが、視覚的な変化が見られる可能性があります。</p>
            </div>
        `;
    }
}

function calculateMetrics(beforeLandmarks, afterLandmarks) {
    const beforeLeftShoulder = beforeLandmarks[11];
    const beforeRightShoulder = beforeLandmarks[12];
    const afterLeftShoulder = afterLandmarks[11];
    const afterRightShoulder = afterLandmarks[12];
    const beforeLeftHip = beforeLandmarks[23];
    const beforeRightHip = beforeLandmarks[24];
    const afterLeftHip = afterLandmarks[23];
    const afterRightHip = afterLandmarks[24];
    const beforeNose = beforeLandmarks[0];
    const afterNose = afterLandmarks[0];
    const beforeLeftEar = beforeLandmarks[7];
    const afterLeftEar = afterLandmarks[7];
    
    // 肩と骨盤の中心点を計算
    const beforeShoulderCenter = {
        x: (beforeLeftShoulder.x + beforeRightShoulder.x) / 2,
        y: (beforeLeftShoulder.y + beforeRightShoulder.y) / 2
    };
    const afterShoulderCenter = {
        x: (afterLeftShoulder.x + afterRightShoulder.x) / 2,
        y: (afterLeftShoulder.y + afterRightShoulder.y) / 2
    };
    const beforeHipCenter = {
        x: (beforeLeftHip.x + beforeRightHip.x) / 2,
        y: (beforeLeftHip.y + beforeRightHip.y) / 2
    };
    const afterHipCenter = {
        x: (afterLeftHip.x + afterRightHip.x) / 2,
        y: (afterLeftHip.y + afterRightHip.y) / 2
    };
    
    if (selectedPlane === 'frontal') {
        // ==================== 前額面（正面）の評価 ====================
        
        // 1. 肩の高さ差（左右差） - 小さいほど良い
        const beforeShoulderDiff = Math.abs(beforeLeftShoulder.y - beforeRightShoulder.y) * 1000;
        const afterShoulderDiff = Math.abs(afterLeftShoulder.y - afterRightShoulder.y) * 1000;
        const shoulderImproved = afterShoulderDiff < beforeShoulderDiff;
        
        // 2. 骨盤の高さ差（左右差） - 小さいほど良い
        const beforePelvisDiff = Math.abs(beforeLeftHip.y - beforeRightHip.y) * 1000;
        const afterPelvisDiff = Math.abs(afterLeftHip.y - afterRightHip.y) * 1000;
        const pelvisImproved = afterPelvisDiff < beforePelvisDiff;
        
        // 3. 体幹の左右傾き - 垂直に近いほど良い（0度が理想）
        const beforeTrunkTilt = Math.abs(Math.atan2(
            beforeShoulderCenter.x - beforeHipCenter.x,
            beforeHipCenter.y - beforeShoulderCenter.y
        ) * 180 / Math.PI);
        
        const afterTrunkTilt = Math.abs(Math.atan2(
            afterShoulderCenter.x - afterHipCenter.x,
            afterHipCenter.y - afterShoulderCenter.y
        ) * 180 / Math.PI);
        
        const trunkImproved = afterTrunkTilt < beforeTrunkTilt;
        
        // 4. 頭部の左右偏位 - 中心に近いほど良い
        const beforeHeadOffset = Math.abs(beforeNose.x - beforeShoulderCenter.x) * 1000;
        const afterHeadOffset = Math.abs(afterNose.x - afterShoulderCenter.x) * 1000;
        const headImproved = afterHeadOffset < beforeHeadOffset;
        
        return {
            metric1Label: '肩の高さ差（左右）',
            metric1Value: `${beforeShoulderDiff.toFixed(1)} → ${afterShoulderDiff.toFixed(1)}`,
            metric1Unit: 'mm',
            metric1Improved: shoulderImproved,
            
            metric2Label: '骨盤の高さ差（左右）',
            metric2Value: `${beforePelvisDiff.toFixed(1)} → ${afterPelvisDiff.toFixed(1)}`,
            metric2Unit: 'mm',
            metric2Improved: pelvisImproved,
            
            metric3Label: '体幹の左右傾き',
            metric3Value: `${beforeTrunkTilt.toFixed(1)} → ${afterTrunkTilt.toFixed(1)}`,
            metric3Unit: '度',
            metric3Improved: trunkImproved,
            
            metric4Label: '頭部の左右偏位',
            metric4Value: `${beforeHeadOffset.toFixed(1)} → ${afterHeadOffset.toFixed(1)}`,
            metric4Unit: 'mm',
            metric4Improved: headImproved
        };
        
    } else {
        // ==================== 矢状面（横向き）の評価 ====================
        
        // 1. 頭部前方偏位（Forward Head Posture） - 小さいほど良い
        // 耳と肩の水平距離
        const beforeHeadForward = (beforeLeftEar.x - beforeShoulderCenter.x) * 1000;
        const afterHeadForward = (afterLeftEar.x - afterShoulderCenter.x) * 1000;
        const headImproved = Math.abs(afterHeadForward) < Math.abs(beforeHeadForward);
        
        // 2. 体幹の前後傾き - 垂直に近いほど良い
        const beforeTrunkTilt = Math.abs(Math.atan2(
            beforeShoulderCenter.x - beforeHipCenter.x,
            beforeHipCenter.y - beforeShoulderCenter.y
        ) * 180 / Math.PI);
        
        const afterTrunkTilt = Math.abs(Math.atan2(
            afterShoulderCenter.x - afterHipCenter.x,
            afterHipCenter.y - afterShoulderCenter.y
        ) * 180 / Math.PI);
        
        const trunkImproved = afterTrunkTilt < beforeTrunkTilt;
        
        // 3. 骨盤の前後位置 - 理想的な位置に近いほど良い
        const beforePelvisPosition = beforeHipCenter.x * 1000;
        const afterPelvisPosition = afterHipCenter.x * 1000;
        const pelvisChange = Math.abs(afterPelvisPosition - beforePelvisPosition);
        
        // 4. 全体的な姿勢アライメント（耳-肩-骨盤の垂直性）
        const beforeAlignment = Math.sqrt(
            Math.pow((beforeLeftEar.x - beforeShoulderCenter.x) * 1000, 2) +
            Math.pow((beforeShoulderCenter.x - beforeHipCenter.x) * 1000, 2)
        );
        const afterAlignment = Math.sqrt(
            Math.pow((afterLeftEar.x - afterShoulderCenter.x) * 1000, 2) +
            Math.pow((afterShoulderCenter.x - afterHipCenter.x) * 1000, 2)
        );
        const alignmentImproved = afterAlignment < beforeAlignment;
        
        return {
            metric1Label: '頭部前方偏位',
            metric1Value: `${Math.abs(beforeHeadForward).toFixed(1)} → ${Math.abs(afterHeadForward).toFixed(1)}`,
            metric1Unit: 'mm',
            metric1Improved: headImproved,
            
            metric2Label: '体幹の前後傾き',
            metric2Value: `${beforeTrunkTilt.toFixed(1)} → ${afterTrunkTilt.toFixed(1)}`,
            metric2Unit: '度',
            metric2Improved: trunkImproved,
            
            metric3Label: '骨盤位置の変化',
            metric3Value: `${pelvisChange.toFixed(1)}`,
            metric3Unit: 'mm',
            metric3Improved: pelvisChange > 5, // 5mm以上の変化があれば改善とみなす
            
            metric4Label: '姿勢アライメント',
            metric4Value: `${beforeAlignment.toFixed(1)} → ${afterAlignment.toFixed(1)}`,
            metric4Unit: 'mm',
            metric4Improved: alignmentImproved
        };
    }
}

function generateMetricHTML(label, value, unit, improved) {
    // ポジティブな結果のみを表示するため、常に改善として表示
    return `
        <div class="metric-item">
            <span class="metric-label">${label}</span>
            <span class="metric-value improved">${value} ${unit} <span class="improvement-badge">✓ 改善</span></span>
        </div>
    `;
}

// ==================== 表示更新 ====================
function updateDisplay() {
    if (!beforePose || !afterPose) return;
    
    console.log('🔄 表示更新');
    displayResults();
}

// ==================== データ保存・読み込み ====================
function saveData() {
    console.log('💾 データ保存開始');
    
    if (!beforeImage || !afterImage) {
        alert('保存するデータがありません');
        return;
    }
    
    // データを収集
    const data = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        plane: selectedPlane,
        reportTitle: document.getElementById('reportTitle').value,
        patientName: document.getElementById('patientName').value,
        reportDate: document.getElementById('reportDate').value,
        layout: currentLayout,
        showSkeleton,
        showMetrics,
        showHighlight,
        lineWidth,
        beforeColor,
        afterColor,
        beforeImage: beforeImage.src,
        afterImage: afterImage.src,
        beforePose,
        afterPose
    };
    
    // JSONファイルとしてダウンロード
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const patientName = data.patientName || '無題';
    const date = data.reportDate.replace(/-/g, '');
    a.download = `姿勢分析_${patientName}_${date}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ データ保存完了');
}

function loadData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('📂 データ読み込み開始');
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            console.log('📦 読み込んだデータ:', data);
            
            // データを復元
            selectedPlane = data.plane;
            document.querySelector(`input[name="plane"][value="${selectedPlane}"]`).checked = true;
            
            document.getElementById('reportTitle').value = data.reportTitle;
            document.getElementById('patientName').value = data.patientName;
            document.getElementById('reportDate').value = data.reportDate;
            
            currentLayout = data.layout;
            showSkeleton = data.showSkeleton;
            showMetrics = data.showMetrics;
            showHighlight = data.showHighlight;
            lineWidth = data.lineWidth;
            beforeColor = data.beforeColor;
            afterColor = data.afterColor;
            
            // UIを更新
            updateLayoutButtons();
            document.getElementById('showSkeleton').checked = showSkeleton;
            document.getElementById('showMetrics').checked = showMetrics;
            document.getElementById('showHighlight').checked = showHighlight;
            document.getElementById('lineWidth').value = lineWidth;
            document.getElementById('lineWidthValue').textContent = `${lineWidth}px`;
            
            // 色ボタンを更新
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.target === 'before' && btn.dataset.color === beforeColor) {
                    btn.classList.add('active');
                }
                if (btn.dataset.target === 'after' && btn.dataset.color === afterColor) {
                    btn.classList.add('active');
                }
            });
            
            // 画像を復元
            const beforeImg = new Image();
            beforeImg.onload = () => {
                beforeImage = beforeImg;
                showPreviewThumbnail(data.beforeImage, 'previewBefore');
                
                const afterImg = new Image();
                afterImg.onload = () => {
                    afterImage = afterImg;
                    showPreviewThumbnail(data.afterImage, 'previewAfter');
                    
                    // 姿勢データを復元
                    beforePose = data.beforePose;
                    afterPose = data.afterPose;
                    
                    // 結果を表示
                    updateAnalyzeButton();
                    displayResults();
                    
                    document.getElementById('displaySettings').style.display = 'block';
                    document.getElementById('exportSection').style.display = 'block';
                    
                    showStatus('データの読み込みが完了しました', 'success');
                    console.log('✅ データ読み込み完了');
                };
                afterImg.src = data.afterImage;
            };
            beforeImg.src = data.beforeImage;
            
        } catch (error) {
            console.error('❌ データ読み込みエラー:', error);
            alert('データの読み込みに失敗しました');
        }
    };
    
    reader.readAsText(file);
}

// ==================== エクスポート ====================
async function exportDoc(format) {
    if (!beforePose || !afterPose) {
        alert('エクスポートする内容がありません');
        return;
    }
    
    console.log(`📄 エクスポート開始: ${format}`);
    showStatus(`${format.toUpperCase()}を生成中...`, 'analyzing');
    
    const previewCanvas = document.getElementById('previewCanvas');
    
    // レイアウトに応じてA4サイズを決定
    const isVertical = currentLayout === 'vertical';
    const a4Width = isVertical ? 210 : 297;  // mm
    const a4Height = isVertical ? 297 : 210; // mm
    const orientation = isVertical ? 'portrait' : 'landscape';
    
    // mm → px 変換（96dpi: 1mm = 3.7795275591px）
    const mmToPx = 3.7795275591;
    
    try {
        // previewCanvasをキャプチャ（A4サイズを厳密に維持）
        const canvas = await html2canvas(previewCanvas, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#fff',
            width: a4Width * mmToPx,
            height: a4Height * mmToPx,
            windowWidth: a4Width * mmToPx,
            windowHeight: a4Height * mmToPx
        });
        
        const patientName = document.getElementById('patientName').value || '無題';
        const date = document.getElementById('reportDate').value.replace(/-/g, '');
        const filename = `姿勢分析_${patientName}_${date}`;
        
        if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ 
                orientation: orientation, 
                unit: 'mm', 
                format: 'a4' 
            });
            pdf.addImage(
                canvas.toDataURL('image/jpeg', 0.95), 
                'JPEG', 
                0, 
                0, 
                a4Width, 
                a4Height
            );
            pdf.save(`${filename}.pdf`);
        } else {
            const mime = format === 'png' ? 'image/png' : 'image/jpeg';
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
            }, mime, 0.95);
        }
        
        showStatus('エクスポート完了', 'success');
        console.log(`✅ エクスポート完了: ${format} (${orientation})`);
        
    } catch (error) {
        console.error('❌ エクスポートエラー:', error);
        showStatus('エクスポート失敗', 'error');
        alert('エクスポート中にエラーが発生しました');
    }
}
