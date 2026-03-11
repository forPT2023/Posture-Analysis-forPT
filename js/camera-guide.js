/**
 * カメラガイド機能 v13.0.0
 * フレーミングガイド + 水平チェッカー
 */

class CameraGuide {
    constructor(targetType) {
        this.targetType = targetType; // 'before' or 'after'
        this.stream = null;
        this.tilt = 0;
        this.isLevel = false;
        
        // DOM要素の参照
        this.modal = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.levelIndicator = null;
        this.levelBubble = null;
        this.statusText = null;
        
        // ガイド設定
        this.guideSettings = {
            frameWidth: 0.5,    // 画面の50%幅
            frameHeight: 0.75,  // 画面の75%高さ
            frameColor: 'rgba(255, 255, 255, 0.8)',
            frameLineWidth: 3,
            frameDashPattern: [15, 10],
            levelThreshold: 3   // ±3度以内でOK
        };
        
        // 前回の枠位置を記憶（施術前後で同じ構図にする）
        this.savedFramePosition = this.loadSavedFramePosition();
    }
    
    /**
     * カメラモーダルを表示
     */
    async show() {
        try {
            // モーダルを作成
            this.createModal();
            
            // カメラを起動
            await this.startCamera();
            
            // ガイド機能を開始
            this.startFramingGuide();
            this.startLevelChecker();
            
            // モーダルを表示
            this.modal.classList.add('active');
            
            console.log('📸 カメラガイド起動完了');
        } catch (error) {
            console.error('❌ カメラ起動エラー:', error);
            this.handleCameraError(error);
        }
    }
    
    /**
     * モーダルUIを作成
     */
    createModal() {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('cameraGuideModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // モーダルHTML
        const modalHTML = `
            <div id="cameraGuideModal" class="camera-modal">
                <!-- 水平インジケーター -->
                <div id="levelIndicator" class="level-indicator">
                    <div class="level-label">
                        <i class="fas fa-level"></i>
                        <span>カメラの傾き</span>
                    </div>
                    <div class="level-meter">
                        <div class="level-bubble" id="levelBubble"></div>
                    </div>
                    <div id="levelStatus" class="status-text">調整中...</div>
                </div>
                
                <!-- カメラコンテナ -->
                <div class="camera-container">
                    <video id="cameraVideo" class="camera-video" autoplay playsinline></video>
                    <canvas id="framingGuideCanvas" class="framing-guide-canvas"></canvas>
                </div>
                
                <!-- カウントダウンオーバーレイ -->
                <div id="countdownOverlay" class="countdown-overlay"></div>
                
                <!-- カメラコントロール -->
                <div class="camera-controls">
                    <button id="closeCameraBtn" class="close-camera-button">
                        <i class="fas fa-times"></i> キャンセル
                    </button>
                    <button id="captureBtn" class="capture-button" title="撮影"></button>
                    <button id="switchCameraBtn" class="close-camera-button" style="display: none;">
                        <i class="fas fa-sync-alt"></i> カメラ切替
                    </button>
                </div>
            </div>
        `;
        
        // DOMに追加
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 要素の参照を取得
        this.modal = document.getElementById('cameraGuideModal');
        this.video = document.getElementById('cameraVideo');
        this.canvas = document.getElementById('framingGuideCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.levelIndicator = document.getElementById('levelIndicator');
        this.levelBubble = document.getElementById('levelBubble');
        this.statusText = document.getElementById('levelStatus');
        
        // イベントリスナー
        document.getElementById('closeCameraBtn').addEventListener('click', () => this.close());
        document.getElementById('captureBtn').addEventListener('click', () => this.capture());
    }
    
    /**
     * カメラを起動
     */
    async startCamera() {
        try {
            // カメラストリームを取得
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // 背面カメラを優先
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            
            this.video.srcObject = this.stream;
            
            // ビデオが読み込まれたらキャンバスサイズを設定
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                console.log(`📹 カメラ解像度: ${this.canvas.width}x${this.canvas.height}`);
            });
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * フレーミングガイドを開始
     */
    startFramingGuide() {
        const drawGuide = () => {
            if (!this.modal.classList.contains('active')) return;
            
            // キャンバスクリア
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // ガイド枠のサイズと位置を計算
            const frameWidth = this.canvas.width * this.guideSettings.frameWidth;
            const frameHeight = this.canvas.height * this.guideSettings.frameHeight;
            const frameX = (this.canvas.width - frameWidth) / 2;
            const frameY = this.canvas.height * 0.125; // 上から12.5%の位置
            
            // 保存された位置があればそれを使用（After撮影時）
            let actualFrameY = frameY;
            if (this.targetType === 'after' && this.savedFramePosition) {
                actualFrameY = this.savedFramePosition.y;
            }
            
            // ガイド枠を描画
            this.ctx.strokeStyle = this.guideSettings.frameColor;
            this.ctx.lineWidth = this.guideSettings.frameLineWidth;
            this.ctx.setLineDash(this.guideSettings.frameDashPattern);
            this.ctx.strokeRect(frameX, actualFrameY, frameWidth, frameHeight);
            
            // 説明テキスト
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 8;
            
            if (this.targetType === 'before') {
                this.ctx.fillText('全身をこの枠内に収めてください', this.canvas.width / 2, actualFrameY - 20);
            } else {
                this.ctx.fillText('前回と同じ位置に合わせてください', this.canvas.width / 2, actualFrameY - 20);
            }
            
            this.ctx.shadowBlur = 0;
            
            // Before撮影時は位置を保存
            if (this.targetType === 'before') {
                this.savedFramePosition = {
                    x: frameX,
                    y: actualFrameY,
                    width: frameWidth,
                    height: frameHeight
                };
            }
            
            // 次のフレーム
            requestAnimationFrame(drawGuide);
        };
        
        drawGuide();
    }
    
    /**
     * 水平チェッカーを開始
     */
    async startLevelChecker() {
        // デバイスの向きセンサーをチェック
        if (!window.DeviceOrientationEvent) {
            console.warn('⚠️ このデバイスは傾き検出に非対応です');
            this.levelIndicator.style.display = 'none';
            return;
        }
        
        // iOS 13+ のパーミッション要求
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                console.log('📱 iOS: 傾き検出パーミッション要求中...');
                const permission = await DeviceOrientationEvent.requestPermission();
                
                if (permission !== 'granted') {
                    console.warn('⚠️ 傾き検出のパーミッションが拒否されました');
                    this.levelIndicator.style.display = 'none';
                    // パーミッション拒否時のメッセージ
                    this.showMessage('傾き検出が無効です。設定から許可してください。', 'warning');
                    return;
                }
                
                console.log('✅ iOS: 傾き検出パーミッション許可されました');
            } catch (error) {
                console.error('❌ パーミッション要求エラー:', error);
                this.levelIndicator.style.display = 'none';
                return;
            }
        }
        
        // 向きセンサーのイベントリスナー
        const handleOrientation = (event) => {
            if (!this.modal.classList.contains('active')) return;
            
            // gamma: 左右の傾き（-90〜+90度）
            this.tilt = event.gamma || 0;
            
            // 傾きが閾値以内かチェック
            this.isLevel = Math.abs(this.tilt) < this.guideSettings.levelThreshold;
            
            // 表示を更新
            this.updateLevelDisplay();
        };
        
        window.addEventListener('deviceorientation', handleOrientation);
        
        // クリーンアップ用に保存
        this.orientationHandler = handleOrientation;
        
        console.log('📐 傾き検出を開始しました');
    }
    
    /**
     * 水平インジケーターの表示を更新
     */
    updateLevelDisplay() {
        // 気泡の位置を計算（-30度〜+30度を0〜100%にマッピング）
        const maxTilt = 30; // 最大表示傾き
        const normalizedTilt = Math.max(-maxTilt, Math.min(maxTilt, this.tilt));
        const bubblePosition = 50 + (normalizedTilt / maxTilt) * 50;
        
        this.levelBubble.style.left = `${bubblePosition}%`;
        
        // ステータス表示
        if (this.isLevel) {
            this.statusText.textContent = '✅ 水平です！';
            this.statusText.className = 'status-text status-ok';
            this.levelIndicator.className = 'level-indicator ok';
        } else {
            const direction = this.tilt > 0 ? '左' : '右';
            const angle = Math.abs(this.tilt).toFixed(1);
            this.statusText.textContent = `⚠️ ${direction}に${angle}度傾けてください`;
            this.statusText.className = 'status-text status-warning';
            this.levelIndicator.className = 'level-indicator warning';
        }
    }
    
    /**
     * 撮影実行
     */
    async capture() {
        try {
            // 水平チェック
            if (!this.isLevel) {
                const confirmCapture = confirm(
                    'カメラが傾いています。\n' +
                    'このまま撮影しますか？\n\n' +
                    '撮影条件を統一するため、水平にすることをお勧めします。'
                );
                
                if (!confirmCapture) {
                    return;
                }
            }
            
            // カウントダウン表示
            await this.showCountdown(3);
            
            // キャンバスに現在のフレームを描画
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = this.video.videoWidth;
            captureCanvas.height = this.video.videoHeight;
            const captureCtx = captureCanvas.getContext('2d');
            captureCtx.drawImage(this.video, 0, 0);
            
            // 画像データを取得
            captureCanvas.toBlob((blob) => {
                if (!blob) {
                    console.error('❌ Blob生成エラー');
                    alert('画像の生成に失敗しました。もう一度お試しください。');
                    return;
                }
                
                // Blobから画像を読み込む
                const reader = new FileReader();
                reader.onload = (e) => {
                    // 対応する入力フィールドに画像を設定
                    if (this.targetType === 'before') {
                        this.setImageToInput(e.target.result, 'Before');
                    } else {
                        this.setImageToInput(e.target.result, 'After');
                    }
                    
                    // Before撮影時は位置を保存
                    if (this.targetType === 'before') {
                        this.saveFramePosition();
                    }
                    
                    // モーダルを閉じる
                    this.close();
                    
                    // 完了メッセージ
                    this.showMessage('📸 撮影完了！', 'success');
                };
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.95);
            
        } catch (error) {
            console.error('❌ 撮影エラー:', error);
            alert('撮影に失敗しました。もう一度お試しください。');
        }
    }
    
    /**
     * カウントダウンを表示
     */
    showCountdown(seconds) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('countdownOverlay');
            let count = seconds;
            
            const countdown = () => {
                if (count > 0) {
                    overlay.textContent = count;
                    overlay.classList.add('show');
                    
                    setTimeout(() => {
                        overlay.classList.remove('show');
                        count--;
                        setTimeout(countdown, 200);
                    }, 500);
                } else {
                    overlay.textContent = '';
                    resolve();
                }
            };
            
            countdown();
        });
    }
    
    /**
     * 撮影した画像を入力フィールドに設定
     */
    setImageToInput(dataURL, type) {
        // DataURLからBlobを作成してFileオブジェクトに変換
        fetch(dataURL)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `camera-capture-${type.toLowerCase()}.jpg`, { 
                    type: 'image/jpeg' 
                });
                
                // main.jsのhandleImageUpload関数を呼び出す
                if (typeof handleImageUpload === 'function') {
                    handleImageUpload(file, type.toLowerCase());
                    console.log(`✅ カメラ画像を${type}に設定しました`);
                } else {
                    console.error('❌ handleImageUpload関数が見つかりません');
                    // フォールバック: 直接画像を設定
                    this.setImageDirectly(dataURL, type);
                }
            })
            .catch(error => {
                console.error('❌ 画像変換エラー:', error);
                // フォールバック: 直接画像を設定
                this.setImageDirectly(dataURL, type);
            });
    }
    
    /**
     * 画像を直接設定（フォールバック用）
     */
    setImageDirectly(dataURL, type) {
        const img = new Image();
        img.onload = () => {
            if (type === 'Before') {
                beforeImage = img;
                document.getElementById('previewBefore').innerHTML = 
                    `<img src="${dataURL}" alt="Before">`;
                document.getElementById('editBeforeBtn').style.display = 'inline-block';
            } else {
                afterImage = img;
                document.getElementById('previewAfter').innerHTML = 
                    `<img src="${dataURL}" alt="After">`;
                document.getElementById('editAfterBtn').style.display = 'inline-block';
            }
            
            // 分析ボタンの状態を更新
            if (typeof updateAnalyzeButton === 'function') {
                updateAnalyzeButton();
            }
        };
        img.src = dataURL;
    }
    
    /**
     * メッセージを表示
     */
    showMessage(text, type = 'info') {
        // 既存のメッセージ表示機能を使用
        if (typeof showMessage === 'function') {
            showMessage(text, type);
        } else {
            console.log(text);
        }
    }
    
    /**
     * カメラを停止してモーダルを閉じる
     */
    close() {
        // カメラストリームを停止
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // イベントリスナーを削除
        if (this.orientationHandler) {
            window.removeEventListener('deviceorientation', this.orientationHandler);
            this.orientationHandler = null;
        }
        
        // モーダルを非表示
        if (this.modal) {
            this.modal.classList.remove('active');
            setTimeout(() => {
                this.modal.remove();
            }, 300);
        }
        
        console.log('📸 カメラガイド終了');
    }
    
    /**
     * カメラエラーハンドリング
     */
    handleCameraError(error) {
        let message = 'カメラの起動に失敗しました。';
        
        if (error.name === 'NotAllowedError') {
            message = 'カメラの使用が許可されていません。\nブラウザの設定を確認してください。';
        } else if (error.name === 'NotFoundError') {
            message = 'カメラが見つかりません。\nデバイスにカメラが接続されているか確認してください。';
        } else if (error.name === 'NotReadableError') {
            message = 'カメラが他のアプリケーションで使用中です。';
        }
        
        alert(message);
        this.close();
    }
    
    /**
     * 枠位置を保存
     */
    saveFramePosition() {
        if (this.savedFramePosition) {
            try {
                localStorage.setItem(
                    'cameraGuideFramePosition',
                    JSON.stringify(this.savedFramePosition)
                );
                console.log('💾 枠位置を保存しました', this.savedFramePosition);
            } catch (error) {
                console.warn('⚠️ 枠位置の保存に失敗:', error);
            }
        }
    }
    
    /**
     * 保存された枠位置を読み込み
     */
    loadSavedFramePosition() {
        try {
            const saved = localStorage.getItem('cameraGuideFramePosition');
            if (saved) {
                const position = JSON.parse(saved);
                console.log('📂 保存された枠位置を読み込みました', position);
                return position;
            }
        } catch (error) {
            console.warn('⚠️ 枠位置の読み込みに失敗:', error);
        }
        return null;
    }
}

// グローバルに公開
window.CameraGuide = CameraGuide;

console.log('✅ カメラガイド機能 v13.0.0 ロード完了');
