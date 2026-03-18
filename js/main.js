// 姿勢分析ツール v13.9.6 - メインスクリプト（カメラガイド機能追加）

// デバッグモード設定
const DEBUG_MODE = false; // 本番環境ではfalse

// デバッグログ関数 (開発モードのみ出力)
function debug(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

// エラーログ関数 (常に出力)
function logError(...args) {
    console.error(...args);
}

// スタートアップログ
if (DEBUG_MODE) {
    console.log('🔧 デバッグモード: 有効');
} else {
    console.log('姿勢分析アプリ v13.9.6 起動');
}

let selectedPlane = 'frontal'; // 'frontal' または 'sagittal'
let beforeImage = null;
let afterImage = null;
let beforePose = null;
let afterPose = null;
let currentLayout = 'horizontal'; // 'horizontal' または 'vertical'
let showSkeleton = true;
let showMetrics = true;
let showHighlight = false;
let showReferenceLine = true;
let lineWidth = 2;
let beforeColor = '#2196F3'; // 青
let afterColor = '#F44336'; // 赤

// 矢状面分析設定（矢状面モード選択時のみ有効）
let facingSide = 'right'; // 'left' または 'right'
let enableAlignment = false; // アライメント評価モード（初期値: false）
let enableROM = false; // 後屈可動域測定モード（初期値: false）
let showSagittalMarkers = true; // マーカー表示
let showSagittalLines = true; // 測定線表示
let showSagittalReference = true; // 基準線表示

// 姿勢検出キャッシュ（同じ画像なら再検出しない）
let beforeImageSrc = null;
let afterImageSrc = null;

// 画像編集用の変数
let editingImage = null;
let editingType = null; // 'before' or 'after'
let imageTransform = {
    scale: 1.0,
    rotation: 0,
    x: 0,
    y: 0
};

// ランドマーク編集用の変数
let editingLandmarks = null;
let editingTab = 'before'; // 'before' or 'after'
let originalLandmarks = null;
let isDraggingLandmark = false;
let draggedLandmarkIndex = -1;

// MediaPipe Pose インスタンス
let pose = null;
let mediaPipeReady = false;

// ローディング表示を更新
function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

// ローディング表示を非表示
function hideLoadingOverlay() {
    const overlay = document.getElementById('initLoadingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOMContentLoaded: ページ読み込み完了');
    updateLoadingProgress(20);
    
    // 今日の日付を設定
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reportDate');
    const datePreview = document.getElementById('previewDate');
    if (dateInput && datePreview) {
        dateInput.value = today;
        datePreview.textContent = formatDate(today);
    }
    
    updateLoadingProgress(40);
    
    // イベントリスナー設定（MediaPipe初期化前に実行）
    setupEventListeners();
    
    updateLoadingProgress(60);
    
    // MediaPipe Pose初期化（遅延実行）
    console.log('⏳ MediaPipe読み込み待機中...');
    waitForMediaPipe();
});

function waitForMediaPipe() {
    // Poseクラスが利用可能になるまで待機
    if (typeof Pose !== 'undefined') {
        console.log('✅ MediaPipeライブラリ検出');
        updateLoadingProgress(80);
        initMediaPipe();
    } else {
        console.log('⏳ MediaPipeライブラリ待機中...');
        setTimeout(waitForMediaPipe, 100);
    }
}

function initMediaPipe() {
    console.log('🚀 MediaPipe Pose初期化開始');
    
    try {
        if (typeof Pose === 'undefined') {
            console.error('❌ Poseクラスが見つかりません');
            updateLoadingProgress(100);
            hideLoadingOverlay();
            setTimeout(() => {
                alert('MediaPipeライブラリの読み込みに失敗しました。\nページを再読み込みしてください。');
            }, 1000);
            return;
        }
        
        pose = new Pose({
            locateFile: (file) => {
                console.log('📦 MediaPipeファイル:', file);
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3  
        });
        
        mediaPipeReady = true;
        updateLoadingProgress(100);
        console.log('✅ MediaPipe Pose初期化完了');
        
        // ローディング表示を非表示
        setTimeout(() => {
            hideLoadingOverlay();
        }, 500);
        
    } catch (error) {
        console.error('❌ MediaPipe Pose 初期化エラー:', error);
        updateLoadingProgress(100);
        hideLoadingOverlay();
        setTimeout(() => {
            alert('MediaPipeの初期化に失敗しました。\nエラー: ' + error.message);
        }, 1000);
    }
}

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
            console.log('✅ 撮影面変更:', selectedPlane);
            
            // 矢状面分析パネルの表示/非表示
            const sagittalAnalysisGroup = document.getElementById('sagittalAnalysisGroup');
            if (sagittalAnalysisGroup) {
                sagittalAnalysisGroup.style.display = selectedPlane === 'sagittal' ? 'block' : 'none';
            }
            
            // 矢状面モード選択時のみ、チェックボックスの状態を読み込む
            if (selectedPlane === 'sagittal') {
                const enableAlignmentCheckbox = document.getElementById('enableAlignment');
                const enableROMCheckbox = document.getElementById('enableROM');
                
                if (enableAlignmentCheckbox) {
                    enableAlignment = enableAlignmentCheckbox.checked;
                }
                if (enableROMCheckbox) {
                    enableROM = enableROMCheckbox.checked;
                }
                
                console.log('✅ 矢状面分析モード有効化:', { enableAlignment, enableROM });
            } else {
                // 前額面モード時は矢状面分析を無効化
                enableAlignment = false;
                enableROM = false;
                console.log('✅ 前額面モード: 矢状面分析無効');
            }
            
            updateDisplay();
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
        
        // カメラ撮影時のガイド機能を追加
        fileInputBefore.addEventListener('click', () => {
            // カメラ起動前の準備（モバイルのみ）
            if (fileInputBefore.capture === 'environment') {
                console.log('📸 カメラモード: ガイド機能準備中');
                // カメラ起動後にガイドを表示する処理は別途実装
            }
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
        
        // カメラ撮影時のガイド機能を追加
        fileInputAfter.addEventListener('click', () => {
            // カメラ起動前の準備（モバイルのみ）
            if (fileInputAfter.capture === 'environment') {
                console.log('📸 カメラモード: ガイド機能準備中');
            }
        });
    }
    
    // カメラガイドボタン
    const enableCameraGuideBefore = document.getElementById('enableCameraGuideBefore');
    if (enableCameraGuideBefore) {
        enableCameraGuideBefore.addEventListener('click', () => {
            console.log('📸 カメラガイド起動: Before');
            const cameraGuide = new CameraGuide('before');
            cameraGuide.show();
        });
    }
    
    const enableCameraGuideAfter = document.getElementById('enableCameraGuideAfter');
    if (enableCameraGuideAfter) {
        enableCameraGuideAfter.addEventListener('click', () => {
            console.log('📸 カメラガイド起動: After');
            const cameraGuide = new CameraGuide('after');
            cameraGuide.show();
        });
    }
    
    // 画像編集ボタン
    const editBeforeBtn = document.getElementById('editBeforeBtn');
    if (editBeforeBtn) {
        editBeforeBtn.addEventListener('click', () => {
            if (beforeImage) {
                openImageEditor(beforeImage, 'before');
            }
        });
    }
    
    const editAfterBtn = document.getElementById('editAfterBtn');
    if (editAfterBtn) {
        editAfterBtn.addEventListener('click', () => {
            if (afterImage) {
                openImageEditor(afterImage, 'after');
            }
        });
    }
    
    // 分析ボタンの状態を更新する関数
    function updateAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        if (!analyzeBtn) return;
        
        const hasBeforeImage = beforeImage !== null;
        const hasAfterImage = afterImage !== null;
        
        // 両方アップロード済みの場合のみボタンを有効化
        analyzeBtn.disabled = !(hasBeforeImage && hasAfterImage);
    }
    
    // 初期状態の更新
    updateAnalyzeButton();
    
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
        updateDisplayBtn.addEventListener('click', () => {
            // ボタンアニメーション
            const icon = updateDisplayBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
                setTimeout(() => {
                    icon.classList.remove('fa-spin');
                }, 1000);
            }
            
            // 表示を更新
            updateDisplay();
        });
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
    
    // エクスポートドロップダウン
    const exportDropdownBtn = document.getElementById('exportDropdownBtn');
    const exportMenu = document.getElementById('exportMenu');
    const exportChevron = document.getElementById('exportChevron');
    
    if (exportDropdownBtn && exportMenu) {
        // ドロップダウンの開閉
        exportDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = exportMenu.style.display === 'block';
            exportMenu.style.display = isOpen ? 'none' : 'block';
            if (exportChevron) {
                exportChevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
        
        // メニュー外クリックで閉じる
        document.addEventListener('click', () => {
            if (exportMenu && exportMenu.style.display === 'block') {
                exportMenu.style.display = 'none';
                if (exportChevron) {
                    exportChevron.style.transform = 'rotate(0deg)';
                }
            }
        });
        
        // メニューアイテムのクリック処理
        const menuItems = exportMenu.querySelectorAll('.export-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const format = item.getAttribute('data-format');
                exportDoc(format);
                exportMenu.style.display = 'none';
                if (exportChevron) {
                    exportChevron.style.transform = 'rotate(0deg)';
                }
            });
            
            // ホバー効果
            item.addEventListener('mouseenter', () => {
                item.style.background = '#F5F5F5';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'white';
            });
        });
    }
    
    // 矢状面分析設定
    document.querySelectorAll('input[name="facingSide"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            facingSide = e.target.value;
            console.log('🔄 撮影側面変更:', facingSide);
            updateDisplay();
        });
    });
    
    const enableAlignmentCheckbox = document.getElementById('enableAlignment');
    if (enableAlignmentCheckbox) {
        enableAlignmentCheckbox.addEventListener('change', (e) => {
            // 矢状面モード時のみ有効化
            if (selectedPlane === 'sagittal') {
                enableAlignment = e.target.checked;
                console.log('🔄 アライメント評価:', enableAlignment);
                updateDisplay();
            }
        });
    }
    
    const enableROMCheckbox = document.getElementById('enableROM');
    if (enableROMCheckbox) {
        enableROMCheckbox.addEventListener('change', (e) => {
            // 矢状面モード時のみ有効化
            if (selectedPlane === 'sagittal') {
                enableROM = e.target.checked;
                console.log('🔄 後屈可動域測定:', enableROM);
                updateDisplay();
            }
        });
    }
    
    const showSagittalMarkersCheckbox = document.getElementById('showSagittalMarkers');
    if (showSagittalMarkersCheckbox) {
        showSagittalMarkersCheckbox.addEventListener('change', (e) => {
            showSagittalMarkers = e.target.checked;
            updateDisplay();
        });
    }
    
    const showSagittalLinesCheckbox = document.getElementById('showSagittalLines');
    if (showSagittalLinesCheckbox) {
        showSagittalLinesCheckbox.addEventListener('change', (e) => {
            showSagittalLines = e.target.checked;
            updateDisplay();
        });
    }
    
    const showSagittalReferenceCheckbox = document.getElementById('showSagittalReference');
    if (showSagittalReferenceCheckbox) {
        showSagittalReferenceCheckbox.addEventListener('change', (e) => {
            showSagittalReference = e.target.checked;
            updateDisplay();
        });
    }
    
}

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

// トーストメッセージ表示関数
function showToast(message, type = 'info', duration = 3000) {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // トースト要素作成
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    
    // アイコンと色の設定
    let icon = 'fa-info-circle';
    let color = '#2196F3';
    if (type === 'success') {
        icon = 'fa-check-circle';
        color = '#4CAF50';
    } else if (type === 'error') {
        icon = 'fa-exclamation-triangle';
        color = '#F44336';
        duration = 5000; // エラーは長く表示
    } else if (type === 'warning') {
        icon = 'fa-exclamation-circle';
        color = '#FF9800';
    }
    
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    
    // スタイル適用
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'white',
        color: '#333',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: '10000',
        minWidth: '280px',
        maxWidth: '400px',
        borderLeft: `4px solid ${color}`,
        animation: 'slideInRight 0.3s ease-out',
        fontSize: '14px'
    });
    
    document.body.appendChild(toast);
    
    // 自動削除
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// トーストアニメーション用のCSSを動的追加
if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        .toast-message i {
            font-size: 18px;
        }
        @media (max-width: 768px) {
            .toast-message {
                right: 10px !important;
                left: 10px !important;
                max-width: calc(100vw - 20px) !important;
                min-width: auto !important;
            }
        }
    `;
    document.head.appendChild(style);
}

function updateLayoutButtons() {
    const horizontalBtn = document.getElementById('layoutHorizontal');
    const verticalBtn = document.getElementById('layoutVertical');
    const previewCanvas = document.getElementById('previewCanvas');
    
    if (currentLayout === 'horizontal') {
        horizontalBtn?.classList.add('active');
        verticalBtn?.classList.remove('active');
        previewCanvas?.classList.remove('layout-vertical');
        previewCanvas?.classList.add('layout-horizontal');
    } else {
        horizontalBtn?.classList.remove('active');
        verticalBtn?.classList.add('active');
        previewCanvas?.classList.remove('layout-horizontal');
        previewCanvas?.classList.add('layout-vertical');
    }
    
    console.log('📐 プレビューキャンバスのレイアウト更新:', currentLayout);
}

function handleImageUpload(file, type) {
    if (!file) return;
    
    console.log(`📸 画像アップロード: ${type}`, file.name);
    
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
        showToast('画像ファイルを選択してください', 'warning');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            
            if (type === 'before') {
                beforeImage = img;
                beforePose = null;  // 新しい画像なので姿勢データをクリア
                beforeImageSrc = null;  // キャッシュキーをクリア
                showPreviewThumbnail(e.target.result, 'previewBefore');
                // 画像編集ボタンを表示
                const editBtn = document.getElementById('editBeforeBtn');
                if (editBtn) editBtn.style.display = 'block';
                // 分析ボタンの状態を更新
                updateAnalyzeButton();
            } else {
                afterImage = img;
                afterPose = null;  // 新しい画像なので姿勢データをクリア
                afterImageSrc = null;  // キャッシュキーをクリア
                showPreviewThumbnail(e.target.result, 'previewAfter');
                // 画像編集ボタンを表示
                const editBtn = document.getElementById('editAfterBtn');
                if (editBtn) editBtn.style.display = 'block';
                // 分析ボタンの状態を更新
                updateAnalyzeButton();
            }
            
            // 両方の画像がアップロードされたら分析ボタンを有効化
            updateAnalyzeButton();
        };
        
        img.onerror = () => {
            console.error(`❌ 画像読み込みエラー: ${type}`);
            showToast('画像の読み込みに失敗しました', 'error');
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        console.error(`❌ ファイル読み込みエラー: ${type}`);
        showToast('ファイルの読み込みに失敗しました', 'error');
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

async function analyzePose() {
    if (!beforeImage || !afterImage) {
        showToast('Before/After両方の画像をアップロードしてください', 'warning');
        return;
    }
    
    if (!pose || !mediaPipeReady) {
        showToast('MediaPipe Poseを初期化中です。少々お待ちください...', 'warning');
        console.log('⏳ MediaPipe準備待機中...');
        
        // MediaPipeの準備ができるまで待機（最大10秒）
        let waitTime = 0;
        while (!mediaPipeReady && waitTime < 10000) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitTime += 500;
        }
        
        if (!mediaPipeReady) {
            showToast('MediaPipeの初期化に失敗しました。ページを再読み込みしてください。', 'error');
            return;
        }
    }
    
    console.log('🤖 姿勢分析開始');
    showStatus('姿勢を分析中...', 'analyzing');
    
    try {
        // Before画像の分析（キャッシュがあれば再利用）
        const beforeSrc = beforeImage.src;
        if (beforeImageSrc === beforeSrc && beforePose) {
            console.log('✅ Before画像のキャッシュを使用');
        } else {
            showStatus('Before画像を分析中... (1/2)', 'analyzing');
            beforePose = await detectPose(beforeImage);
            beforeImageSrc = beforeSrc;  // キャッシュキーを保存
            
            if (!beforePose || !beforePose.poseLandmarks) {
                throw new Error('Before画像から姿勢を検出できませんでした。\n人物が正面または横向きで全身が写っているか確認してください。');
            }
        }
        
        
        // After画像の分析（キャッシュがあれば再利用）
        const afterSrc = afterImage.src;
        if (afterImageSrc === afterSrc && afterPose) {
            console.log('✅ After画像のキャッシュを使用');
        } else {
            showStatus('After画像を分析中... (2/2)', 'analyzing');
            afterPose = await detectPose(afterImage);
            afterImageSrc = afterSrc;  // キャッシュキーを保存
            
            if (!afterPose || !afterPose.poseLandmarks) {
                throw new Error('After画像から姿勢を検出できませんでした。\n人物が正面または横向きで全身が写っているか確認してください。');
            }
        }
        
        
        // 結果を表示
        showStatus('分析完了！結果を表示しています', 'success');
        displayResults();
        
        // 設定パネルとエクスポートセクションを表示
        document.getElementById('displaySettings').style.display = 'block';
        document.getElementById('exportSection').style.display = 'block';
        
    } catch (error) {
        console.error('❌ 姿勢分析エラー:', error);
        showStatus('分析エラー', 'error');
        showToast(error.message || '姿勢の分析中にエラーが発生しました', 'error');
    }
}

function detectPose(image) {
    return new Promise((resolve, reject) => {
        
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
    
    // ランドマーク編集ボタンを表示
    const editLandmarksBtn = document.getElementById('editLandmarksBtn');
    if (editLandmarksBtn) {
        editLandmarksBtn.style.display = 'block';
    }
}

function generateComparisonArea() {
    const comparisonArea = document.getElementById('comparisonArea');
    if (!comparisonArea) return;
    
    console.log('🎨 generateComparisonArea 実行開始 - currentLayout:', currentLayout);
    
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
    
    console.log('   innerHTML設定完了');
    
    // innerHTML設定後にクラスとスタイルを設定（重要：この順序）
    comparisonArea.className = `comparison-area layout-${currentLayout}`;
    console.log('   className設定完了:', comparisonArea.className);
    
    // 【最重要】インラインスタイルで絶対的に横並びを強制
    const styleValue = 'display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; gap: 10px; justify-content: center; align-items: flex-start;';
    comparisonArea.setAttribute('style', styleValue);
    console.log('   style設定完了:', comparisonArea.getAttribute('style'));
    
    // 設定後の確認
    const computedStyle = window.getComputedStyle(comparisonArea);
    console.log('   ✅ 計算済みスタイル確認:');
    console.log('      display:', computedStyle.display);
    console.log('      flex-direction:', computedStyle.flexDirection);
    console.log('      flex-wrap:', computedStyle.flexWrap);
    
    // Canvasに描画
    drawComparisonCanvas('canvasBefore', beforeImage, beforePose, beforeColor);
    drawComparisonCanvas('canvasAfter', afterImage, afterPose, afterColor);
    
    console.log('🎨 generateComparisonArea 実行完了');
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
        // A4縦向き (210mm x 297mm) - Before/Afterを横並び配置
        // 実効エリア: (210-40) x (297-40) = 170mm x 257mm
        // 2つの画像を横に配置: 各画像 約95mm x 220mm
        // gap(10mm) + 左右padding(40mm) を考慮
        // ヘッダー(約15mm) + 画像エリア(220mm) + 数値(約20mm) ≈ 255mm
        maxWidth = 95 * 3.7795;    // 約359px（各画像の幅を拡大）
        maxHeight = 220 * 3.7795;  // 約832px（縦長に対応、全身が収まる）
    } else {
        // A4横向き (297mm x 210mm) - Before/Afterを横並び配置
        // 実効エリア: (297-40) x (210-40) = 257mm x 170mm
        // 2つの画像を横に配置: 各画像 約120mm x 130mm
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
    
    // 矢状面の頸部マーカーは独立して描画（showSkeletonに依存しない）
    if (selectedPlane === 'sagittal' && poseResults && poseResults.poseLandmarks) {
        if (enableAlignment || enableROM) {
            drawSagittalAnalysis(ctx, poseResults.poseLandmarks, width, height, color);
        }
    }
}

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
        
        
        // 重要なランドマークのvisibilityを確認
        const keyLandmarks = [7, 8, 11, 12, 23, 24, 25, 26];
        
        // z座標が存在しない、または同じ値の場合はデフォルトで左側を表示
        let isLeftFront = true;
        
        if (leftShoulder && rightShoulder && 
            typeof leftShoulder.z !== 'undefined' && 
            typeof rightShoulder.z !== 'undefined') {
            // z座標が小さい方が手前（カメラに近い）
            isLeftFront = leftShoulder.z < rightShoulder.z;
            
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
    
    // デバッグ: 描画されるポイントの総数
    let drawnPoints = 0;
    landmarks.forEach((landmark, index) => {
        if (pointsToShow.has(index) && !facePointsToExclude.has(index) && landmark.visibility > visibilityThreshold) {
            drawnPoints++;
        }
    });
    
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
    
    // 矢状面分析の描画はdrawComparisonCanvas内で独立して実行される
}

function drawReferenceLine(ctx, landmarks, canvasWidth, canvasHeight) {
    // 矢状面の重力線（Plumb Line）を描画
    // 耳のX座標を基準に垂直線を引く
    
    
    // 手前側の耳を判定
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    
    
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
    
    
    ctx.setLineDash([]);  // 破線解除
    ctx.restore();
}

// ========================================
// 矢状面分析: 角度計算関数（メトリクス用）
// ========================================
function calculateAlignmentAngle(ear, shoulder, facingSide) {
    if (!ear || !shoulder) return 0;
    
    // 耳-肩線と垂直線の角度計算
    const dx = shoulder.x - ear.x;
    const dy = shoulder.y - ear.y;
    
    // atan2で角度計算（垂直線を基準、度数に変換）
    let angle = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
    
    return angle;
}

function calculateROMAngle(ear, eye, facingSide) {
    if (!ear || !eye) return 0;
    
    // 耳-目線と水平線の角度計算
    const dx = eye.x - ear.x;
    const dy = eye.y - ear.y;
    
    // 水平線からの角度（度数）
    let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
    
    // 0-180度の範囲に正規化
    if (angle < 0) angle += 180;
    
    // 左側面の場合は180度から引く（右側面と統一）
    if (facingSide === 'left') {
        angle = 180 - angle;
    }
    
    return angle;
}

// ========================================
// 追加の計算関数（姿勢改善指標用）
// ========================================

/**
 * 標準偏差を計算する関数
 * @param {Array} values - 数値の配列
 * @returns {number} 標準偏差
 */
function calculateStandardDeviation(values) {
    if (!values || values.length === 0) return 0;
    
    // 平均値を計算
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // 分散を計算
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    // 標準偏差は分散の平方根
    return Math.sqrt(variance);
}

/**
 * 関節角度を計算する関数（3点から角度を算出）
 * @param {Object} point1 - 第1点（例：腰）
 * @param {Object} point2 - 第2点（例：膝）- 角度の頂点
 * @param {Object} point3 - 第3点（例：足首）
 * @returns {number} 角度（度）
 */
function calculateJointAngle(point1, point2, point3) {
    if (!point1 || !point2 || !point3) return null;
    
    // ベクトル1: point2からpoint1へ
    const v1 = {
        x: point1.x - point2.x,
        y: point1.y - point2.y
    };
    
    // ベクトル2: point2からpoint3へ
    const v2 = {
        x: point3.x - point2.x,
        y: point3.y - point2.y
    };
    
    // 内積
    const dot = v1.x * v2.x + v1.y * v2.y;
    
    // ベクトルの大きさ
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    // コサイン値から角度を計算
    const cosAngle = dot / (mag1 * mag2);
    
    // acosで角度を取得（ラジアンから度に変換）
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
    
    return angle;
}

// ========================================
// 矢状面分析: アライメント評価
// ========================================
function calculateAlignment(landmarks, side) {
    // 使用するランドマークを選択
    const earIdx = side === 'left' ? 7 : 8;
    const shoulderIdx = side === 'left' ? 11 : 12;
    
    const ear = landmarks[earIdx];
    const shoulder = landmarks[shoulderIdx];
    
    if (!ear || !shoulder) {
        return null;
    }
    
    // 耳-肩線と垂直線の角度計算
    const dx = shoulder.x - ear.x;
    const dy = shoulder.y - ear.y;
    
    // atan2で角度計算（垂直線を基準、度数に変換）
    let angle = Math.atan2(dx, dy) * (180 / Math.PI);
    
    // 絶対値を取得（前方偏位の大きさ）
    angle = Math.abs(angle);
    
    // 水平距離（mm換算: 1px ≈ 0.26mm at 96dpi、画像の実際のスケールに依存）
    // ここでは簡易的にピクセル値をそのまま使用
    const distance = Math.abs(dx);
    
    return { angle, distance };
}

// ========================================
// 矢状面分析: 後屈可動域測定
// ========================================
function calculateROM(landmarks, side) {
    // 使用するランドマークを選択
    const earIdx = side === 'left' ? 7 : 8;
    const eyeIdx = side === 'left' ? 2 : 5; // 外側の目を使用
    
    const ear = landmarks[earIdx];
    const eye = landmarks[eyeIdx];
    
    if (!ear || !eye) {
        return null;
    }
    
    // 耳-目線と水平線の角度計算
    const dx = eye.x - ear.x;
    const dy = eye.y - ear.y;
    
    // 水平線からの角度（度数）
    // atan2(dy, dx)で水平線を基準とした角度
    let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
    
    // 0-180度の範囲に正規化
    if (angle < 0) angle += 180;
    
    // 左側面の場合は180度から引く（右側面と統一）
    if (side === 'left') {
        angle = 180 - angle;
    }
    
    return angle;
}

// ========================================
// 矢状面分析: ビジュアル描画
// ========================================
function drawSagittalAnalysis(ctx, landmarks, canvasWidth, canvasHeight, color) {
    if (!enableAlignment && !enableROM) {
        return; // 両モードとも無効なら何も描画しない
    }
    
    // 使用するランドマークを選択
    const earIdx = facingSide === 'left' ? 7 : 8;
    const shoulderIdx = facingSide === 'left' ? 11 : 12;
    const eyeIdx = facingSide === 'left' ? 2 : 5;
    
    const ear = landmarks[earIdx];
    const shoulder = landmarks[shoulderIdx];
    const eye = landmarks[eyeIdx];
    
    if (!ear) {
        console.log('⚠️ 矢状面分析: 耳のランドマークが検出されませんでした');
        return;
    }
    
    const earX = ear.x * canvasWidth;
    const earY = ear.y * canvasHeight;
    
    // アライメント評価モード
    if (enableAlignment && shoulder) {
        const shoulderX = shoulder.x * canvasWidth;
        const shoulderY = shoulder.y * canvasHeight;
        
        // マーカー描画
        if (showSagittalMarkers) {
            // 耳マーカー
            ctx.beginPath();
            ctx.arc(earX, earY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFD700'; // 金色
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 肩マーカー
            ctx.beginPath();
            ctx.arc(shoulderX, shoulderY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#4CAF50'; // 緑
            ctx.fill();
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        // 測定線（耳-肩）
        if (showSagittalLines) {
            ctx.beginPath();
            ctx.moveTo(earX, earY);
            ctx.lineTo(shoulderX, shoulderY);
            ctx.strokeStyle = '#FF9800'; // オレンジ
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // 垂直基準線
        if (showSagittalReference) {
            ctx.beginPath();
            ctx.moveTo(earX, earY);
            ctx.lineTo(earX, canvasHeight);
            ctx.strokeStyle = '#4CAF50'; // 緑
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // 後屈可動域測定モード
    if (enableROM && eye) {
        const eyeX = eye.x * canvasWidth;
        const eyeY = eye.y * canvasHeight;
        
        // マーカー描画
        if (showSagittalMarkers) {
            // 耳マーカー（アライメントと重複しないように色を変える）
            if (!enableAlignment) {
                ctx.beginPath();
                ctx.arc(earX, earY, 5, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFD700'; // 金色
                ctx.fill();
                ctx.strokeStyle = '#FFA500';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            
            // 目マーカー
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#2196F3'; // 青
            ctx.fill();
            ctx.strokeStyle = '#1565C0';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        // 測定線（耳-目）
        if (showSagittalLines) {
            ctx.beginPath();
            ctx.moveTo(earX, earY);
            ctx.lineTo(eyeX, eyeY);
            ctx.strokeStyle = '#FF9800'; // オレンジ
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // 水平基準線
        if (showSagittalReference) {
            ctx.beginPath();
            ctx.moveTo(0, earY);
            ctx.lineTo(canvasWidth, earY);
            ctx.strokeStyle = '#4CAF50'; // 緑
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
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

function generateMetrics() {
    if (!beforePose || !afterPose) return;
    
    const metricsArea = document.getElementById('metricsArea');
    if (!metricsArea) return;
    
    // 既存のコンテンツをクリア
    metricsArea.innerHTML = '';
    
    metricsArea.style.display = showMetrics ? 'block' : 'none';
    
    const beforeLandmarks = beforePose.poseLandmarks;
    const afterLandmarks = afterPose.poseLandmarks;
    
    // 数値計算
    const metrics = calculateMetrics(beforeLandmarks, afterLandmarks);
    
    // HTML生成（ポジティブな結果のみ表示）
    const planeTitle = selectedPlane === 'frontal' ? '前額面（正面）' : '矢状面（側面）';
    
    // 改善された項目のみを収集（動的にmetric1〜metricNまでチェック）
    const improvedMetrics = [];
    const allMetrics = [];
    
    for (let i = 1; i <= 10; i++) {
        const label = metrics[`metric${i}Label`];
        const value = metrics[`metric${i}Value`];
        const unit = metrics[`metric${i}Unit`];
        const improved = metrics[`metric${i}Improved`];
        const status = metrics[`metric${i}Status`];
        
        if (!label) break; // メトリクスが存在しない場合は終了
        
        const html = generateMetricHTML(label, value, unit, improved, status);
        allMetrics.push(html);
        
        if (improved) {
            improvedMetrics.push(html);
        }
    }
    
    // 改善項目がある場合は改善項目のみ表示、なければ全項目表示
    if (improvedMetrics.length > 0) {
        metricsArea.innerHTML = `
            <div class="metrics-title">姿勢改善の数値データ - ${planeTitle}</div>
            <div class="metrics-grid">
                ${improvedMetrics.join('')}
            </div>
        `;
    } else if (allMetrics.length > 0) {
        metricsArea.innerHTML = `
            <div class="metrics-title">姿勢変化の数値データ - ${planeTitle}</div>
            <div class="metrics-grid">
                ${allMetrics.join('')}
            </div>
            <div class="metrics-message">
                <p>測定可能な改善は検出されませんでしたが、視覚的な変化が見られる可能性があります。</p>
            </div>
        `;
    } else {
        metricsArea.innerHTML = `
            <div class="metrics-title">姿勢変化の数値データ - ${planeTitle}</div>
            <div class="metrics-message">
                <p>測定可能なデータが不足しています。別の角度からの撮影をお試しください。</p>
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
        // 矢状面（側面）分析
        // 使用するランドマークを撮影側面に応じて選択
        const earIdx = facingSide === 'left' ? 7 : 8;
        const shoulderIdx = facingSide === 'left' ? 11 : 12;
        const hipIdx = facingSide === 'left' ? 23 : 24;
        const kneeIdx = facingSide === 'left' ? 25 : 26;
        const ankleIdx = facingSide === 'left' ? 27 : 28;
        const eyeIdx = facingSide === 'left' ? 2 : 5;
        
        const beforeEar = beforeLandmarks[earIdx];
        const beforeShoulder = beforeLandmarks[shoulderIdx];
        const beforeHip = beforeLandmarks[hipIdx];
        const beforeKnee = beforeLandmarks[kneeIdx];
        const beforeAnkle = beforeLandmarks[ankleIdx];
        const beforeEye = beforeLandmarks[eyeIdx];
        const afterEar = afterLandmarks[earIdx];
        const afterShoulder = afterLandmarks[shoulderIdx];
        const afterHip = afterLandmarks[hipIdx];
        const afterKnee = afterLandmarks[kneeIdx];
        const afterAnkle = afterLandmarks[ankleIdx];
        const afterEye = afterLandmarks[eyeIdx];
        
        const metrics = {};
        let metricCount = 0;
        
        // アライメント評価モード: 耳-肩線と垂直基準線の角度
        if (enableAlignment && beforeEar && beforeShoulder && afterEar && afterShoulder) {
            const beforeAlignmentAngle = calculateAlignmentAngle(beforeEar, beforeShoulder, facingSide);
            const afterAlignmentAngle = calculateAlignmentAngle(afterEar, afterShoulder, facingSide);
            
            // 水平距離（前方偏位距離）
            const beforeDistance = Math.abs(beforeEar.x - beforeShoulder.x) * 1000;
            const afterDistance = Math.abs(afterEar.x - afterShoulder.x) * 1000;
            
            // 改善判定
            const angleImproved = afterAlignmentAngle < beforeAlignmentAngle;
            const distanceImproved = afterDistance < beforeDistance;
            
            metricCount++;
            metrics[`metric${metricCount}Label`] = '頭部前方偏位角度';
            metrics[`metric${metricCount}Value`] = `${beforeAlignmentAngle.toFixed(1)} → ${afterAlignmentAngle.toFixed(1)}`;
            metrics[`metric${metricCount}Unit`] = '度';
            metrics[`metric${metricCount}Improved`] = angleImproved;
            metrics[`metric${metricCount}Status`] = afterAlignmentAngle < 15 ? '正常' : 
                                                     afterAlignmentAngle < 30 ? '軽度前方偏位' :
                                                     afterAlignmentAngle < 45 ? '中等度前方偏位' : '重度前方偏位';
            
            metricCount++;
            metrics[`metric${metricCount}Label`] = '頭部前方偏位距離';
            metrics[`metric${metricCount}Value`] = `${beforeDistance.toFixed(1)} → ${afterDistance.toFixed(1)}`;
            metrics[`metric${metricCount}Unit`] = 'mm';
            metrics[`metric${metricCount}Improved`] = distanceImproved;
        }
        
        // 後屈可動域測定モード: 耳-目線と水平基準線の角度
        if (enableROM && beforeEar && beforeEye && afterEar && afterEye) {
            const beforeROMAngle = calculateROMAngle(beforeEar, beforeEye, facingSide);
            const afterROMAngle = calculateROMAngle(afterEar, afterEye, facingSide);
            
            // 改善判定（90度に近づく = 可動域改善）
            const angleImproved = Math.abs(90 - afterROMAngle) < Math.abs(90 - beforeROMAngle);
            
            metricCount++;
            metrics[`metric${metricCount}Label`] = '頸部後屈可動域';
            metrics[`metric${metricCount}Value`] = `${beforeROMAngle.toFixed(1)} → ${afterROMAngle.toFixed(1)}`;
            metrics[`metric${metricCount}Unit`] = '度';
            metrics[`metric${metricCount}Improved`] = angleImproved;
            metrics[`metric${metricCount}Status`] = afterROMAngle >= 80 ? '正常可動域' :
                                                     afterROMAngle >= 60 ? '軽度制限' :
                                                     afterROMAngle >= 40 ? '中等度制限' : '重度制限';
            
            // 正常可動域との差分
            const beforeDeficit = Math.max(0, 90 - beforeROMAngle);
            const afterDeficit = Math.max(0, 90 - afterROMAngle);
            const deficitImproved = afterDeficit < beforeDeficit;
            
            metricCount++;
            metrics[`metric${metricCount}Label`] = '可動域制限度';
            metrics[`metric${metricCount}Value`] = `${beforeDeficit.toFixed(1)} → ${afterDeficit.toFixed(1)}`;
            metrics[`metric${metricCount}Unit`] = '度';
            metrics[`metric${metricCount}Improved`] = deficitImproved;
        }
        
        // ========================================
        // 全身の姿勢指標を計算（常に計算する）
        // ========================================
        
        // 1. 頭部前方偏位
        const beforeHeadForward = (beforeEar.x - beforeShoulder.x) * 1000;
        const afterHeadForward = (afterEar.x - afterShoulder.x) * 1000;
        const headImproved = Math.abs(afterHeadForward) < Math.abs(beforeHeadForward);
        
        // 2. 体幹の前後傾き
        const beforeTrunkTilt = Math.abs(Math.atan2(
            beforeShoulder.x - beforeHip.x,
            beforeHip.y - beforeShoulder.y
        ) * 180 / Math.PI);
        
        const afterTrunkTilt = Math.abs(Math.atan2(
            afterShoulder.x - afterHip.x,
            afterHip.y - afterShoulder.y
        ) * 180 / Math.PI);
        
        const trunkImproved = afterTrunkTilt < beforeTrunkTilt;
        
        // 3. 全身垂直アライメント（姿勢バランススコア）
        let beforeAlignment = null;
        let afterAlignment = null;
        let alignmentImproved = false;
        
        if (beforeEar && beforeShoulder && beforeHip && beforeAnkle && 
            afterEar && afterShoulder && afterHip && afterAnkle) {
            // 各点のX座標を取得
            const beforePoints = [beforeEar.x, beforeShoulder.x, beforeHip.x, beforeAnkle.x];
            const afterPoints = [afterEar.x, afterShoulder.x, afterHip.x, afterAnkle.x];
            
            // 標準偏差を計算（値が小さいほど良い姿勢）
            beforeAlignment = calculateStandardDeviation(beforePoints) * 1000; // mm単位
            afterAlignment = calculateStandardDeviation(afterPoints) * 1000;
            
            alignmentImproved = afterAlignment < beforeAlignment;
        }
        
        // 4. 骨盤の前傾/後傾角度
        let beforePelvicTilt = null;
        let afterPelvicTilt = null;
        let pelvicImproved = false;
        
        if (beforeHip && beforeKnee && afterHip && afterKnee) {
            // 腰-膝の線と垂直線の角度
            beforePelvicTilt = Math.atan2(
                beforeKnee.x - beforeHip.x,
                beforeKnee.y - beforeHip.y
            ) * 180 / Math.PI;
            
            afterPelvicTilt = Math.atan2(
                afterKnee.x - afterHip.x,
                afterKnee.y - afterHip.y
            ) * 180 / Math.PI;
            
            // 正常範囲（10-15度）に近づくことが改善
            const normalRange = 12.5; // 正常範囲の中央値
            const beforeDiff = Math.abs(beforePelvicTilt - normalRange);
            const afterDiff = Math.abs(afterPelvicTilt - normalRange);
            pelvicImproved = afterDiff < beforeDiff;
        }
        
        // 5. 膝の過伸展/屈曲角度
        let beforeKneeAngle = null;
        let afterKneeAngle = null;
        let kneeImproved = false;
        
        if (beforeHip && beforeKnee && beforeAnkle && 
            afterHip && afterKnee && afterAnkle) {
            // 腰-膝-足首の角度
            beforeKneeAngle = calculateJointAngle(beforeHip, beforeKnee, beforeAnkle);
            afterKneeAngle = calculateJointAngle(afterHip, afterKnee, afterAnkle);
            
            // 180度（真っすぐ）に近づくことが改善
            const beforeDiff = Math.abs(180 - beforeKneeAngle);
            const afterDiff = Math.abs(180 - afterKneeAngle);
            kneeImproved = afterDiff < beforeDiff;
        }
        
        // ========================================
        // メトリクスの組み立て（完全分離）
        // ========================================
        
        // 頸部モードがONの場合は、頸部指標のみを表示（全身指標は表示しない）
        if (enableAlignment || enableROM) {
            // 頸部専用指標のみ表示（metricCountは既に頸部指標の数が設定済み）
            // 全身指標は追加しない
            
        } else {
            // デフォルトモード：全身指標のみを表示（姿勢バランススコアを最優先）
            
            // メトリクスを設定
            metricCount = 5;
            
            // 全身垂直アライメント（最重要なので最初に表示）
            if (beforeAlignment !== null && afterAlignment !== null) {
                metrics.metric1Label = '姿勢バランススコア';
                metrics.metric1Value = `${beforeAlignment.toFixed(1)} → ${afterAlignment.toFixed(1)}`;
                metrics.metric1Unit = 'mm';
                metrics.metric1Improved = alignmentImproved;
                metrics.metric1Status = afterAlignment < 25 ? '良好' : 
                                       afterAlignment < 40 ? '普通' : '要改善';
                
                // 骨盤角度をmetric2に
                if (beforePelvicTilt !== null && afterPelvicTilt !== null) {
                    metrics.metric2Label = '骨盤前傾角度';
                    metrics.metric2Value = `${beforePelvicTilt.toFixed(1)} → ${afterPelvicTilt.toFixed(1)}`;
                    metrics.metric2Unit = '度';
                    metrics.metric2Improved = pelvicImproved;
                    metrics.metric2Status = (afterPelvicTilt >= 10 && afterPelvicTilt <= 15) ? '正常範囲' :
                                            afterPelvicTilt > 20 ? '過度な前傾' :
                                            afterPelvicTilt < 5 ? '後傾' : '軽度の偏り';
                }
                
                // 膝角度をmetric3に
                if (beforeKneeAngle !== null && afterKneeAngle !== null) {
                    metrics.metric3Label = '膝の角度';
                    metrics.metric3Value = `${beforeKneeAngle.toFixed(1)} → ${afterKneeAngle.toFixed(1)}`;
                    metrics.metric3Unit = '度';
                    metrics.metric3Improved = kneeImproved;
                    metrics.metric3Status = (afterKneeAngle >= 175 && afterKneeAngle <= 180) ? '正常' :
                                            afterKneeAngle > 185 ? '反張膝' :
                                            afterKneeAngle < 165 ? '屈曲位' : '軽度の偏り';
                }
                
                // 頭部前方偏位をmetric4に
                metrics.metric4Label = '頭部前方偏位';
                metrics.metric4Value = `${Math.abs(beforeHeadForward).toFixed(1)} → ${Math.abs(afterHeadForward).toFixed(1)}`;
                metrics.metric4Unit = 'mm';
                metrics.metric4Improved = headImproved;
                
                // 体幹の前後傾きをmetric5に
                metrics.metric5Label = '体幹の前後傾き';
                metrics.metric5Value = `${beforeTrunkTilt.toFixed(1)} → ${afterTrunkTilt.toFixed(1)}`;
                metrics.metric5Unit = '度';
                metrics.metric5Improved = trunkImproved;
                
            } else {
                // 全身アライメントが計算できない場合
                metrics.metric1Label = '頭部前方偏位';
                metrics.metric1Value = `${Math.abs(beforeHeadForward).toFixed(1)} → ${Math.abs(afterHeadForward).toFixed(1)}`;
                metrics.metric1Unit = 'mm';
                metrics.metric1Improved = headImproved;
                
                metrics.metric2Label = '体幹の前後傾き';
                metrics.metric2Value = `${beforeTrunkTilt.toFixed(1)} → ${afterTrunkTilt.toFixed(1)}`;
                metrics.metric2Unit = '度';
                metrics.metric2Improved = trunkImproved;
                
                // 骨盤と膝を3,4として追加
                if (beforePelvicTilt !== null && afterPelvicTilt !== null) {
                    metrics.metric3Label = '骨盤前傾角度';
                    metrics.metric3Value = `${beforePelvicTilt.toFixed(1)} → ${afterPelvicTilt.toFixed(1)}`;
                    metrics.metric3Unit = '度';
                    metrics.metric3Improved = pelvicImproved;
                    metrics.metric3Status = (afterPelvicTilt >= 10 && afterPelvicTilt <= 15) ? '正常範囲' :
                                            afterPelvicTilt > 20 ? '過度な前傾' :
                                            afterPelvicTilt < 5 ? '後傾' : '軽度の偏り';
                }
                
                if (beforeKneeAngle !== null && afterKneeAngle !== null) {
                    metrics.metric4Label = '膝の角度';
                    metrics.metric4Value = `${beforeKneeAngle.toFixed(1)} → ${afterKneeAngle.toFixed(1)}`;
                    metrics.metric4Unit = '度';
                    metrics.metric4Improved = kneeImproved;
                    metrics.metric4Status = (afterKneeAngle >= 175 && afterKneeAngle <= 180) ? '正常' :
                                            afterKneeAngle > 185 ? '反張膝' :
                                            afterKneeAngle < 165 ? '屈曲位' : '軽度の偏り';
                }
            }
        }
        
        // メトリクスオブジェクトを返す
        return metrics;
    }
}

function generateMetricHTML(label, value, unit, improved, status) {
    // ポジティブな結果のみを表示する場合は改善バッジを付ける
    const improvementBadge = improved ? '<span class="improvement-badge">✓ 改善</span>' : '';
    const statusBadge = status ? `<span class="status-badge">${status}</span>` : '';
    const className = improved ? 'improved' : '';
    
    return `
        <div class="metric-item">
            <span class="metric-label">${label}</span>
            <span class="metric-value ${className}">${value} ${unit} ${improvementBadge}${statusBadge}</span>
        </div>
    `;
}

function updateDisplay() {
    if (!beforePose || !afterPose) return;
    
    console.log('🔄 表示更新 - currentLayout:', currentLayout);
    
    // プレビューエリアを完全にクリア
    const previewArea = document.getElementById('previewArea');
    const previewCanvas = document.getElementById('previewCanvas');
    
    if (previewArea) {
        // 既存のコンテンツをクリア
        previewArea.innerHTML = '';
        
        // previewCanvasを再作成
        const newCanvas = document.createElement('div');
        newCanvas.id = 'previewCanvas';
        newCanvas.className = `preview-canvas layout-${currentLayout}`;
        previewArea.appendChild(newCanvas);
    }
    
    // preview-canvasのレイアウトクラスを更新
    if (previewCanvas) {
        previewCanvas.className = `preview-canvas layout-${currentLayout}`;
    }
    
    // 比較エリアを再生成（これでスタイルも再設定される）
    generateComparisonArea();
    
    // 数値データを再生成
    if (showMetrics) {
        generateMetrics();
    }
    
    console.log('✅ プレビュー画面をリロードしました');
    showToast('プレビューを更新しました', 'success');
}

function saveData() {
    console.log('💾 データ保存開始');
    
    if (!beforeImage || !afterImage) {
        showToast('保存するデータがありません', 'warning');
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
                };
                afterImg.src = data.afterImage;
            };
            beforeImg.src = data.beforeImage;
            
        } catch (error) {
            console.error('❌ データ読み込みエラー:', error);
            showToast('データの読み込みに失敗しました', 'error');
        }
    };
    
    reader.readAsText(file);
}

async function exportDoc(format) {
    if (!beforePose || !afterPose) {
        showToast('エクスポートする内容がありません', 'warning');
        return;
    }
    
    debug(`📄 エクスポート開始: ${format}`);
    showStatus(`${format.toUpperCase()}を生成中...`, 'analyzing');
    
    const previewCanvas = document.getElementById('previewCanvas');
    if (!previewCanvas) {
        showToast('プレビューが見つかりません', 'error');
        return;
    }
    
    // レイアウトに応じてA4サイズを決定
    const isVertical = currentLayout === 'vertical';
    const a4Width = isVertical ? 210 : 297;  // mm
    const a4Height = isVertical ? 297 : 210; // mm
    const orientation = isVertical ? 'portrait' : 'landscape';
    
    // mm → px 変換（96dpi: 1mm = 3.7795275591px）
    const mmToPx = 3.7795275591;
    const a4WidthPx = Math.round(a4Width * mmToPx);
    const a4HeightPx = Math.round(a4Height * mmToPx);
    
    debug('A4サイズ:', a4Width, 'mm ×', a4Height, 'mm');
    debug('ピクセル:', a4WidthPx, 'px ×', a4HeightPx, 'px');
    
    try {
        // エクスポート専用の設定を適用
        // !importantを上書きするため、既存スタイルを全て削除してから適用
        const tempClass = 'export-mode-final';
        const styleEl = document.createElement('style');
        styleEl.id = 'export-temp-style-final';
        
        // A4サイズを厳密に適用（全ての既存スタイルを上書き）
        styleEl.textContent = `
            .${tempClass} {
                position: relative !important;
                width: ${a4WidthPx}px !important;
                height: ${a4HeightPx}px !important;
                min-width: ${a4WidthPx}px !important;
                max-width: ${a4WidthPx}px !important;
                min-height: ${a4HeightPx}px !important;
                max-height: ${a4HeightPx}px !important;
                padding: 20mm !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                background: white !important;
                display: flex !important;
                flex-direction: column !important;
            }
            .${tempClass} .document-header {
                flex-shrink: 0 !important;
                padding-bottom: 8px !important;
                margin-bottom: 12px !important;
                border-bottom: 2px solid #2196F3 !important;
            }
            .${tempClass} .comparison-area {
                flex: 1 !important;
                display: flex !important;
                gap: 15px !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .${tempClass}.layout-horizontal .comparison-area {
                flex-direction: row !important;
            }
            .${tempClass}.layout-vertical .comparison-area {
                flex-direction: row !important;
            }
            .${tempClass} .comparison-item {
                flex: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                max-width: 100% !important;
                max-height: 100% !important;
            }
            .${tempClass} .comparison-canvas {
                max-width: 100% !important;
                max-height: 100% !important;
                width: 100% !important;
                height: auto !important;
                object-fit: contain !important;
            }
            .${tempClass} .metrics-area {
                flex-shrink: 0 !important;
                margin-top: 12px !important;
            }
        `;
        
        document.head.appendChild(styleEl);
        previewCanvas.classList.add(tempClass);
        
        // DOMの再描画を十分に待つ（モバイルブラウザでは時間がかかる）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 実際のサイズをログ出力（デバッグ用）
        const rect = previewCanvas.getBoundingClientRect();
        debug('実測サイズ:', Math.round(rect.width), 'px ×', Math.round(rect.height), 'px');
        
        // 画像間の間隔
        const gapPx = 15;

        
        // html2canvasでキャプチャ
        // scale: 2で高解像度化するが、PDFには元のA4サイズで配置する
        const canvas = await html2canvas(previewCanvas, {
            scale: 2,  // 高解像度化（2倍）
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: a4WidthPx,
            height: a4HeightPx,
            windowWidth: a4WidthPx,
            windowHeight: a4HeightPx
        });
        
        console.log('📊 html2canvas結果:');
        console.log('  - キャンバスサイズ:', canvas.width, 'x', canvas.height);
        console.log('  - 期待サイズ (scale=2):', a4WidthPx * 2, 'x', a4HeightPx * 2);
        console.log('  - PDFサイズ:', a4Width, 'mm x', a4Height, 'mm');
        
        // 一時スタイルを削除
        previewCanvas.classList.remove(tempClass);
        const tempStyleEl = document.getElementById('export-temp-style-final');
        if (tempStyleEl) {
            tempStyleEl.remove();
        }
        
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
            
            // PDFのページサイズを確認
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            console.log('📄 PDF実際のページサイズ:', pageWidth, 'mm x', pageHeight, 'mm');
            
            // 画像をPDFに配置（0,0から開始、A4サイズで配置）
            pdf.addImage(
                canvas.toDataURL('image/jpeg', 0.95), 
                'JPEG', 
                0,  // x位置
                0,  // y位置
                a4Width,  // 幅（mm）
                a4Height  // 高さ（mm）
            );
            
            console.log('✅ PDF生成完了:', `${filename}.pdf`);
            pdf.save(`${filename}.pdf`);
        } else {
            // PNG/JPGエクスポート
            const mime = format === 'png' ? 'image/png' : 'image/jpeg';
            console.log(`🖼️ 画像エクスポート (${format.toUpperCase()}):`);
            console.log('  - サイズ:', canvas.width, 'x', canvas.height, 'px');
            console.log('  - A4換算:', Math.round(canvas.width / mmToPx / 2), 'x', Math.round(canvas.height / mmToPx / 2), 'mm');
            
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                console.log('✅ 画像エクスポート完了:', `${filename}.${format}`);
            }, mime, 0.95);
        }
        
        showStatus('エクスポート完了', 'success');
        
    } catch (error) {
        logError('❌ エクスポートエラー:', error);
        showStatus('エクスポート失敗', 'error');
        showToast('エクスポート中にエラーが発生しました', 'error');
    }
}
