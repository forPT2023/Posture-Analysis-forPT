// ==================== ランドマーク編集機能 ====================

function openLandmarkEditor() {
    if (!beforePose || !afterPose) {
        alert('まず画像を分析してください');
        return;
    }
    
    // オリジナルのランドマークをバックアップ
    originalLandmarks = {
        before: JSON.parse(JSON.stringify(beforePose.poseLandmarks)),
        after: JSON.parse(JSON.stringify(afterPose.poseLandmarks))
    };
    
    // 編集用にコピー
    editingLandmarks = {
        before: JSON.parse(JSON.stringify(beforePose.poseLandmarks)),
        after: JSON.parse(JSON.stringify(afterPose.poseLandmarks))
    };
    
    const modal = document.getElementById('landmarkEditorModal');
    editingTab = 'before';
    
    // タブをリセット
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.target === 'before') {
            btn.classList.add('active');
        }
    });
    
    // 初期描画
    drawLandmarkEditor();
    
    // モーダルを表示
    modal.classList.add('show');
}

function drawLandmarkEditor() {
    const canvas = document.getElementById('landmarkCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const image = editingTab === 'before' ? beforeImage : afterImage;
    const landmarks = editingLandmarks[editingTab];
    
    if (!image || !landmarks) return;
    
    // キャンバスサイズを設定
    const maxSize = 600;
    let width = image.width;
    let height = image.height;
    
    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // 画像を描画
    ctx.drawImage(image, 0, 0, width, height);
    
    // 表示対象のランドマークインデックス
    const visibleLandmarks = getVisibleLandmarks();
    
    // ランドマークを描画
    visibleLandmarks.forEach(index => {
        const landmark = landmarks[index];
        if (!landmark) return;
        
        const x = landmark.x * width;
        const y = landmark.y * height;
        
        // ランドマークの円（サイズを大きく）
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);  // 8 → 12に拡大
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';  // 透明度を上げる
        ctx.fill();
        ctx.strokeStyle = '#FF0000';  // 赤い枠で目立たせる
        ctx.lineWidth = 3;  // 枠を太く
        ctx.stroke();
        
        // ランドマーク番号
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';  // フォントを大きく
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index, x, y);
    });
}

function getVisibleLandmarks() {
    // drawReferencePlane関数で使用されるランドマークのみ
    if (selectedPlane === 'frontal') {
        // 前面: 両肩、両腰、鼻、両目、両耳
        return [0, 2, 5, 7, 8, 11, 12, 23, 24];
    } else {
        // 側面: 左側 or 右側
        const leftShoulder = beforePose?.poseLandmarks?.[11];
        const rightShoulder = beforePose?.poseLandmarks?.[12];
        
        if (leftShoulder && rightShoulder && leftShoulder.z < rightShoulder.z) {
            // 左側が前
            return [0, 7, 11, 23, 25, 27, 29, 31];
        } else {
            // 右側が前
            return [0, 8, 12, 24, 26, 28, 30, 32];
        }
    }
}

function setupLandmarkDrag(canvas) {
    const getEventPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // CSSでスケールされている場合を考慮して正確な座標を計算
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };
    
    const findNearestLandmark = (x, y) => {
        const landmarks = editingLandmarks[editingTab];
        const visibleLandmarks = getVisibleLandmarks();
        const threshold = 30; // ピクセル（タップしやすいように拡大）
        
        let nearest = -1;
        let minDist = threshold;
        
        visibleLandmarks.forEach(index => {
            const landmark = landmarks[index];
            if (!landmark) return;
            
            const lx = landmark.x * canvas.width;
            const ly = landmark.y * canvas.height;
            const dist = Math.sqrt((x - lx) ** 2 + (y - ly) ** 2);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = index;
            }
        });
        
        return nearest;
    };
    
    const onStart = (e) => {
        const pos = getEventPos(e);
        draggedLandmarkIndex = findNearestLandmark(pos.x, pos.y);
        
        if (draggedLandmarkIndex >= 0) {
            isDraggingLandmark = true;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    };
    
    const onMove = (e) => {
        if (!isDraggingLandmark) {
            const pos = getEventPos(e);
            const nearest = findNearestLandmark(pos.x, pos.y);
            canvas.style.cursor = nearest >= 0 ? 'pointer' : 'default';
            return;
        }
        
        const pos = getEventPos(e);
        const landmarks = editingLandmarks[editingTab];
        
        if (landmarks[draggedLandmarkIndex]) {
            landmarks[draggedLandmarkIndex].x = pos.x / canvas.width;
            landmarks[draggedLandmarkIndex].y = pos.y / canvas.height;
            drawLandmarkEditor();
            
            // 情報を更新
            const landmarkInfo = document.getElementById('landmarkInfo');
            if (landmarkInfo) {
                landmarkInfo.textContent = `ランドマーク ${draggedLandmarkIndex} を調整中...`;
            }
        }
        
        e.preventDefault();
    };
    
    const onEnd = () => {
        if (isDraggingLandmark) {
            isDraggingLandmark = false;
            canvas.style.cursor = 'default';
            
            const landmarkInfo = document.getElementById('landmarkInfo');
            if (landmarkInfo) {
                landmarkInfo.textContent = 'マーカーをドラッグして位置を調整できます';
            }
        }
        draggedLandmarkIndex = -1;
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
    
    // ランドマーク編集ボタン
    const editLandmarksBtn = document.getElementById('editLandmarksBtn');
    if (editLandmarksBtn) {
        editLandmarksBtn.addEventListener('click', openLandmarkEditor);
    }
    
    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editingTab = btn.dataset.target;
            drawLandmarkEditor();
        });
    });
    
    // キャンバスのドラッグ設定
    const landmarkCanvas = document.getElementById('landmarkCanvas');
    if (landmarkCanvas) {
        setupLandmarkDrag(landmarkCanvas);
    }
    
    // リセットボタン
    const resetBtn = document.getElementById('landmarkEditorReset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (originalLandmarks) {
                editingLandmarks = {
                    before: JSON.parse(JSON.stringify(originalLandmarks.before)),
                    after: JSON.parse(JSON.stringify(originalLandmarks.after))
                };
                drawLandmarkEditor();
                console.log('✅ ランドマークを自動検出に戻しました');
            }
        });
    }
    
    // 適用ボタン
    const applyBtn = document.getElementById('landmarkEditorApply');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyLandmarkEdits();
            closeLandmarkEditor();
        });
    }
    
    // 閉じるボタン
    const closeBtn = document.getElementById('landmarkEditorClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLandmarkEditor);
    }
});

function applyLandmarkEdits() {
    if (!editingLandmarks) return;
    
    // 編集したランドマークを適用
    beforePose.poseLandmarks = editingLandmarks.before;
    afterPose.poseLandmarks = editingLandmarks.after;
    
    console.log('✅ ランドマークの調整を適用しました');
    
    // 結果を再表示
    displayResults();
}

function closeLandmarkEditor() {
    const modal = document.getElementById('landmarkEditorModal');
    modal.classList.remove('show');
    editingLandmarks = null;
    originalLandmarks = null;
    isDraggingLandmark = false;
    draggedLandmarkIndex = -1;
}
