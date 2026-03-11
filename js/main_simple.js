// 姿勢分析ツール v2.0 - シンプル化版

// ==================== グローバル変数 ====================
let selectedPlane = 'frontal';
let beforeImage = null;
let afterImage = null;
let beforePose = null;
let afterPose = null;
let currentLayout = 'horizontal';
let showSkeleton = true;
let showMetrics = true;
let showHighlight = false;
let showReferenceLine = true;
let lineWidth = 2;
let beforeColor = '#2196F3';
let afterColor = '#F44336';
let pose = null;

// ==================== 初期化 ====================
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reportDate');
    const datePreview = document.getElementById('previewDate');
    if (dateInput && datePreview) {
        dateInput.value = today;
        datePreview.textContent = formatDate(today);
    }
    
    initMediaPipe();
    setupEventListeners();
});

// ==================== MediaPipe Pose 初期化 ====================
function initMediaPipe() {
    try {
        pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3
        });
        
        pose.onResults((results) => {
            if (pose.resolveCallback) {
                pose.resolveCallback(results);
            }
        });
    } catch (error) {
        showStatus('MediaPipe Pose初期化に失敗しました', 'error');
    }
}