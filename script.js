/**
 * 文化祭 会計システム フロントエンド処理
 */

// ==========================================
// 1. 設定項目 (メニュー・価格・GASのURL)
// ==========================================

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxJk1q9uBGcmb7N00EGJTLUKHk5QRSjyrBgYYloPVnXFgxdMPGOarhCQVlf-xQI7e9BWQ/exec";
const TICKET_UNIT_PRICE = 50;

const menuItems = [
    { id: "item_a", name: "ポテト", price: 150 },
    { id: "item_b", name: "バナナチョコクレープ", price: 250 },
    { id: "item_d", name: "アイストッピング", price: 50 }
];

const orderState = {};

// 効果音ファイル設定（JSファイルと同じディレクトリに配置）
const SOUND_FILES = {
    success: ["success.mp3", "success.wav"],
    error: ["error.mp3", "error.wav"],
    iceOver: ["ice-over.mp3", "ice-over.wav"],
    empty: ["empty.mp3", "empty.wav"]
};

const soundPlayers = {};

// 送信エラー時の固定メッセージ
const SUBMIT_ERROR_MESSAGE = "【エラー】送信できませんでした。もう一度お試しください。\nただし、送信されていてもこのエラーが表示されることがあります。";

// ==========================================
// 2. 初期化処理
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    menuItems.forEach(item => {
        orderState[item.id] = 0;
    });

    preloadSounds();
    renderMenu();
    calculateTotal();

    document.getElementById("reset-btn").addEventListener("click", resetOrder);
    document.getElementById("submit-btn").addEventListener("click", submitOrder);
});

// ==========================================
// 3. 効果音処理
// ==========================================

function preloadSounds() {
    Object.keys(SOUND_FILES).forEach(key => {
        soundPlayers[key] = createAudioWithFallback(SOUND_FILES[key]);
    });
}

function createAudioWithFallback(fileList) {
    const audio = new Audio();
    audio.preload = "auto";

    if (!Array.isArray(fileList) || fileList.length === 0) {
        return audio;
    }

    // 先頭ファイルを基本ソースに設定
    audio.src = fileList[0];

    // 読み込み失敗時に次候補へ切り替え
    let currentIndex = 0;

    audio.addEventListener("error", () => {
        currentIndex += 1;

        if (currentIndex < fileList.length) {
            audio.src = fileList[currentIndex];
            audio.load();
        }
    });

    return audio;
}

function playSound(type) {
    const baseAudio = soundPlayers[type];

    if (!baseAudio) return;

    // 同じ音を連続再生できるよう clone して再生
    const audio = baseAudio.cloneNode(true);

    audio.currentTime = 0;

    audio.play().catch(error => {
        console.warn(`効果音の再生に失敗しました: ${type}`, error);
    });
}

// ==========================================
// 4. ポップアップ処理
// ==========================================

function showPopup(message) {
    // すでにポップアップが表示されている場合は削除
    const existingPopup = document.querySelector(".custom-popup-overlay");

    if (existingPopup) {
        existingPopup.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "custom-popup-overlay";

    const popup = document.createElement("div");
    popup.className = "custom-popup";

    const messageElement = document.createElement("div");
    messageElement.className = "custom-popup-message";

    // 改行をそのまま表示
    messageElement.textContent = message;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-popup-button";
    button.textContent = "OK";

    popup.appendChild(messageElement);
    popup.appendChild(button);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // OKボタン
    button.addEventListener("click", () => {
        closePopup();
    });

    // 背景部分をクリックしても閉じない仕様
    // 誤操作によるポップアップ消失を防止

    // キーボードのEnter / Escapeでも閉じられるようにする
    const keydownHandler = event => {
        if (event.key === "Enter" || event.key === "Escape") {
            closePopup();
        }
    };

    document.addEventListener("keydown", keydownHandler);

    // ポップアップを閉じる処理
    function closePopup() {
        overlay.remove();
        document.removeEventListener("keydown", keydownHandler);
    }

    // ボタンへフォーカス
    requestAnimationFrame(() => {
        button.focus();
    });
}

// ==========================================
// 5. UI描画・計算処理
// ==========================================

function renderMenu() {
    const container = document.getElementById("menu-container");

    container.innerHTML = "";

    menuItems.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "menu-item";

        itemDiv.innerHTML = `
            <div class="menu-item-main">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">¥${item.price.toLocaleString()}</span>
                </div>

                <div class="quantity-control">
                    <button
                        type="button"
                        class="btn-qty"
                        onclick="changeQuantity('${item.id}', -1)"
                    >-</button>

                    <input
                        type="number"
                        id="qty-${item.id}"
                        class="qty-input"
                        value="0"
                        min="0"
                        onchange="updateQuantityDirectly('${item.id}', this.value)"
                    >

                    <button
                        type="button"
                        class="btn-qty"
                        onclick="changeQuantity('${item.id}', 1)"
                    >+</button>
                </div>
            </div>

            <div id="warning-${item.id}" class="item-warning-msg"></div>
        `;

        container.appendChild(itemDiv);
    });
}

function changeQuantity(itemId, delta) {
    const currentQty = orderState[itemId] || 0;
    const newQty = Math.max(0, currentQty + delta);

    orderState[itemId] = newQty;

    const inputElem = document.getElementById(`qty-${itemId}`);

    if (inputElem) {
        inputElem.value = newQty;
    }

    calculateTotal();
}

function updateQuantityDirectly(itemId, value) {
    const parsedVal = parseInt(value, 10);

    const newQty =
        isNaN(parsedVal) || parsedVal < 0
            ? 0
            : parsedVal;

    orderState[itemId] = newQty;

    const inputElem = document.getElementById(`qty-${itemId}`);

    if (inputElem) {
        inputElem.value = newQty;
    }

    calculateTotal();
}

function calculateTotal() {
    let total = 0;

    menuItems.forEach(item => {
        const qty = orderState[item.id] || 0;

        total += item.price * qty;
    });

    const ticketCount = Math.ceil(total / TICKET_UNIT_PRICE);

    const totalElem = document.getElementById("total-amount");

    if (totalElem) {
        totalElem.textContent = total.toLocaleString();
    }

    const ticketElem = document.getElementById("ticket-count");

    if (ticketElem) {
        ticketElem.textContent = ticketCount.toLocaleString();
    }

    checkIceQuantityConstraint();

    return total;
}

// アイストッピングの数量制約チェック（画面上の警告制御）
function checkIceQuantityConstraint() {
    const crepeQty = orderState["item_b"] || 0;
    const iceQty = orderState["item_d"] || 0;

    const warningElem = document.getElementById("warning-item_d");

    if (!warningElem) return;

    if (iceQty > crepeQty) {
        warningElem.textContent =
            `⚠️ アイストッピングはクレープの個数(${crepeQty}個)以下にしてください。`;

        warningElem.style.display = "block";
    } else {
        warningElem.textContent = "";
        warningElem.style.display = "none";
    }
}

function resetOrder() {
    menuItems.forEach(item => {
        orderState[item.id] = 0;

        const inputElem =
            document.getElementById(`qty-${item.id}`);

        if (inputElem) {
            inputElem.value = 0;
        }
    });

    calculateTotal();
    setStatus("", "");
}

function setStatus(message, type) {
    const statusElem =
        document.getElementById("status-message");

    if (!statusElem) return;

    // 下部メッセージはHTML改行に対応
    statusElem.innerHTML = message;

    if (type === "success") {
        statusElem.style.color = "#27ae60";
    } else if (type === "error") {
        statusElem.style.color = "#e74c3c";
    } else {
        statusElem.style.color = "#333";
    }
}

// 送信エラー時に下部表示とポップアップの両方で通知
function notifySubmitError() {
    playSound("error");

    setStatus(SUBMIT_ERROR_MESSAGE, "error");

    showPopup(SUBMIT_ERROR_MESSAGE);
}

// ==========================================
// 6. データ送信処理 (GAS連携)
// ==========================================

async function submitOrder() {
    const totalAmount = calculateTotal();

    // 商品未選択
    if (totalAmount === 0) {
        playSound("empty");

        showPopup(
            "商品を1つ以上選択してください。"
        );

        return;
    }

    const crepeQty = orderState["item_b"] || 0;
    const iceQty = orderState["item_d"] || 0;

    // アイスがクレープ数を超えている
    if (iceQty > crepeQty) {
        playSound("iceOver");

        showPopup(
            `アイストッピング(${iceQty}個)がバナナチョコクレープ(${crepeQty}個)を超えています。\nアイストッピングはクレープの数量以下にしてください。`
        );

        return;
    }

    // GAS URL未設定
    if (
        GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE" ||
        !GAS_WEB_APP_URL
    ) {
        playSound("error");

        showPopup(
            "script.js に Google Apps Script の URLを設定してください。"
        );

        return;
    }

    const submitBtn =
        document.getElementById("submit-btn");

    submitBtn.disabled = true;

    setStatus("送信中...", "");

    const payload = {
        totalAmount: totalAmount,

        items: menuItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: orderState[item.id] || 0
        }))
    };

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.status === "success") {
            playSound("success");

            setStatus(
                "送信が完了しました！",
                "success"
            );

            setTimeout(() => {
                resetOrder();
            }, 1000);

        } else {
            throw new Error(
                result.message ||
                "送信エラーが発生しました。"
            );
        }

    } catch (error) {
        console.error("Error:", error);

        notifySubmitError();

    } finally {
        submitBtn.disabled = false;
    }
}