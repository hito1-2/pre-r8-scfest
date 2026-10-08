/**
 * 文化祭 会計・受渡管理システム バックエンド処理 (Google Apps Script)
 */

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ status: "success", headers: [], orders: [] });
    }

    const headers = data[0];
    const orders = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // A列:注文確認, B列:受渡確認 (文字列 "TRUE" や ブール値を安全に判定)
      const isOrderChecked = row[0] === true || String(row[0]).toUpperCase() === "TRUE";
      const isDeliveryChecked = row[1] === true || String(row[1]).toUpperCase() === "TRUE";

      // 両方チェック済みなら除外
      if (isOrderChecked && isDeliveryChecked) {
        continue;
      }

      // 日時データの安全な文字変換
      let timestampStr = "";
      if (row[2]) {
        if (row[2] instanceof Date) {
          timestampStr = Utilities.formatDate(row[2], "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
        } else {
          timestampStr = String(row[2]);
        }
      }

      // 商品データの取得 (D列〜最終列の1つ前まで)
      const items = [];
      for (let j = 3; j < row.length - 1; j++) {
        items.push({
          name: headers[j],
          quantity: Number(row[j]) || 0
        });
      }

      orders.push({
        rowIndex: i + 1,
        orderChecked: isOrderChecked,
        deliveryChecked: isDeliveryChecked,
        timestamp: timestampStr,
        items: items,
        totalAmount: row[row.length - 1]
      });
    }

    return createJsonResponse({
      status: "success",
      headers: headers.slice(3, -1),
      orders: orders
    });

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (data.action === "updateCheck") {
      const rowIndex = Number(data.rowIndex);
      const colIndex = data.target === "order" ? 1 : 2;
      sheet.getRange(rowIndex, colIndex).setValue(Boolean(data.value));

      return createJsonResponse({
        status: "success",
        message: "チェック状態を更新しました。"
      });
    } else if (data.action === "deleteRow") {
      // ★ 行削除処理
      const rowIndex = Number(data.rowIndex);
      sheet.deleteRow(rowIndex);

      return createJsonResponse({
        status: "success",
        message: "行を削除しました。"
      });
    } else {
      const timestamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
      const row = [false, false, timestamp];

      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => row.push(item.quantity));
      }
      row.push(data.totalAmount);

      sheet.appendRow(row);
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1, 1, 2).insertCheckboxes();

      return createJsonResponse({
        status: "success",
        message: "データが正常に記録されました。"
      });
    }

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
