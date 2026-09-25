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
    { id: "item_b", name: "バナナチョコクレープ", price: 200 },
    { id: "item_d", name: "アイストッピング", price: 50 }
];

const orderState = {};

// ==========================================
// 2. 初期化処理
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    menuItems.forEach(item => {
        orderState[item.id] = 0;
    });

    renderMenu();
    
    document.getElementById("reset-btn").addEventListener("click", resetOrder);
    document.getElementById("submit-btn").addEventListener("click", submitOrder);
});

// ==========================================
// 3. UI描画・計算処理
// ==========================================

function renderMenu() {
    const container = document.getElementById("menu-container");
    container.innerHTML = "";

    menuItems.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "menu-item";

        // メニューカード内に直接 警告メッセージ用div を含める
        itemDiv.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">¥${item.price.toLocaleString()}</span>
            </div>
            <div class="quantity-control">
                <button type="button" class="btn-qty" onclick="changeQuantity('${item.id}', -1)">-</button>
                <input type="number" id="qty-${item.id}" class="qty-input" value="0" min="0" onchange="updateQuantityDirectly('${item.id}', this.value)">
                <button type="button" class="btn-qty" onclick="changeQuantity('${item.id}', 1)">+</button>
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
    if (inputElem) inputElem.value = newQty;
    
    calculateTotal();
}

function updateQuantityDirectly(itemId, value) {
    const parsedVal = parseInt(value, 10);
    const newQty = isNaN(parsedVal) || parsedVal < 0 ? 0 : parsedVal;
    
    orderState[itemId] = newQty;
    
    const inputElem = document.getElementById(`qty-${itemId}`);
    if (inputElem) inputElem.value = newQty;
    
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
    if (totalElem) totalElem.textContent = total.toLocaleString();
    
    const ticketElem = document.getElementById("ticket-count");
    if (ticketElem) ticketElem.textContent = ticketCount.toLocaleString();

    // 数量制限チェックを実行
    checkIceQuantityConstraint();

    return total;
}

// アイストッピングの数量制約チェック
function checkIceQuantityConstraint() {
    const crepeQty = orderState["item_b"] || 0; // バナナチョコクレープ
    const iceQty = orderState["item_d"] || 0;   // アイストッピング
    
    const warningElem = document.getElementById("warning-item_d");
    const submitBtn = document.getElementById("submit-btn");

    if (!warningElem || !submitBtn) return;

    if (iceQty > crepeQty) {
        warningElem.textContent = `⚠️ アイストッピングはクレープの個数(${crepeQty}個)以下にしてください。`;
        warningElem.style.display = "block";
        submitBtn.disabled = true; // 送信ボタン無効化
    } else {
        warningElem.textContent = "";
        warningElem.style.display = "none";
        submitBtn.disabled = false; // 送信ボタン有効化
    }
}

function resetOrder() {
    menuItems.forEach(item => {
        orderState[item.id] = 0;
        const inputElem = document.getElementById(`qty-${item.id}`);
        if (inputElem) inputElem.value = 0;
    });
    
    calculateTotal();
    setStatus("", "");
}

function setStatus(message, type) {
    const statusElem = document.getElementById("status-message");
    if (!statusElem) return;
    
    statusElem.textContent = message;
    
    if (type === "success") {
        statusElem.style.color = "#27ae60";
    } else if (type === "error") {
        statusElem.style.color = "#e74c3c";
    } else {
        statusElem.style.color = "#333";
    }
}

// ==========================================
// 4. データ送信処理 (GAS連携)
// ==========================================

async function submitOrder() {
    const totalAmount = calculateTotal();

    if (totalAmount === 0) {
        setStatus("商品を1つ以上選択してください。", "error");
        return;
    }

    const crepeQty = orderState["item_b"] || 0;
    const iceQty = orderState["item_d"] || 0;
    const potatoQty = orderState["item_a"] || 0;

    // 送信直前確認ポップアップ
    const confirmMessage = `以下の内容で注文を送信しますか？\n\n` +
        `・ポテト: ${potatoQty} 個\n` +
        `・バナナチョコクレープ: ${crepeQty} 個\n` +
        `・アイストッピング: ${iceQty} 個\n\n` +
        `合計金額: ${totalAmount.toLocaleString()} 円`;

    if (!confirm(confirmMessage)) {
        return;
    }

    if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE" || !GAS_WEB_APP_URL) {
        setStatus("script.js に Google Apps Script の URL を設定してください。", "error");
        return;
    }

    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    setStatus("送信中...", "info");

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

        const result = await response.json();

        if (result.status === "success") {
            setStatus("送信が完了しました！", "success");
            setTimeout(() => {
                resetOrder();
            }, 1000);
        } else {
            throw new Error(result.message || "送信エラーが発生しました。");
        }

    } catch (error) {
        console.error("Error:", error);
        setStatus("エラーが発生しました。もう一度お試しください。", "error");
    } finally {
        submitBtn.disabled = false;
    }
}