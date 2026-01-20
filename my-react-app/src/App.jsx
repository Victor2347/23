import { useMemo, useState } from "react";
import Tesseract from "tesseract.js";
import "./App.css";

const ownerName = "Victor";

const createItem = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  driverName: "",
  amount: "",
  note: "",
  image: "",
  imageHeight: 160,
  ocrText: "",
  ocrStatus: "",
  ocrToken: "",
});

const formatNumber = (value) => {
  const numberValue = Number(value) || 0;
  return numberValue.toLocaleString("zh-TW");
};

const printImageScale = 1.4;

const App = () => {
  const [items, setItems] = useState([createItem()]);
  const [activeId, setActiveId] = useState(null);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items]
  );

  const addItem = () => setItems((prev) => [...prev, createItem()]);

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateItemFields = (id, fields) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...fields } : item))
    );
  };

  const runOcr = async (id, image) => {
    if (!image) return;
    const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    updateItemFields(id, { ocrStatus: "辨識中...", ocrText: "", ocrToken: token });
    try {
      const { data } = await Tesseract.recognize(image, "chi_tra+eng");
      const text = (data?.text || "").trim();
      setItems((prev) =>
        prev.map((item) =>
          item.id === id && item.ocrToken === token
            ? {
                ...item,
                ocrText: text,
                ocrStatus: text ? "辨識完成" : "未偵測到文字",
              }
            : item
        )
      );
    } catch (error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id && item.ocrToken === token
            ? { ...item, ocrStatus: "辨識失敗，請重試" }
            : item
        )
      );
    }
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [createItem()];
    });
  };

  const handleImageChange = (id, event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateItem(id, "image", reader.result);
      runOcr(id, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (id, event) => {
    const clipboardItems = event.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i += 1) {
      if (clipboardItems[i].type.includes("image")) {
        const blob = clipboardItems[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (e) => {
          updateItem(id, "image", e.target.result);
          runOcr(id, e.target.result);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <>
      <div className="page">
        <header className="header">
        <div>
          <h1>簽收單表格生成器</h1>
          <p>支援拖拉調整影像高度、貼上/上傳簽收單，快速產出列印表格。</p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={addItem}>
            新增一筆
          </button>
          <button type="button" className="primary" onClick={handlePrint}>
            列印表格
          </button>
        </div>
      </header>

      <section className="card">
        <div className="hint">
          提示：點擊簽收單區塊後按 <b>Ctrl + V</b>{" "}
          可直接貼上截圖；或點擊上傳圖檔。
        </div>
      </section>

      <section className="list">
        {items.map((item) => (
          <div
            key={item.id}
            className={`item ${activeId === item.id ? "active" : ""}`}
            onPaste={(event) => handlePaste(item.id, event)}
            onClick={() => setActiveId(item.id)}
            onFocus={() => setActiveId(item.id)}
            tabIndex={0}
          >
            <div>
              <div
                className="image-area"
                style={{ height: `${item.imageHeight}px` }}
              >
                {item.image ? (
                  <img src={item.image} alt="簽收單" />
                ) : (
                  <div className="placeholder">點擊上傳或 Ctrl+V 貼上</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleImageChange(item.id, event)}
                  title="點擊上傳圖片"
                />
              </div>
              <div className="image-actions">
                <label>影像高度</label>
                <input
                  type="range"
                  min="120"
                  max="320"
                  value={item.imageHeight}
                  onChange={(event) =>
                    updateItem(item.id, "imageHeight", Number(event.target.value))
                  }
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    runOcr(item.id, item.image);
                  }}
                  disabled={!item.image}
                >
                  重新辨識
                </button>
              </div>
            </div>

            <div className="fields">
              <div className="field">
                <label>司機名稱</label>
                <input
                  type="text"
                  placeholder="輸入司機姓名"
                  value={item.driverName}
                  onChange={(event) =>
                    updateItem(item.id, "driverName", event.target.value)
                  }
                />
              </div>
              <div className="field amount-input">
                <label>需收款金額</label>
                <span>NT$</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={item.amount}
                  onChange={(event) =>
                    updateItem(item.id, "amount", event.target.value)
                  }
                />
              </div>
              <div className="field full">
                <label>備註</label>
                <textarea
                  placeholder="補充說明..."
                  value={item.note}
                  onChange={(event) =>
                    updateItem(item.id, "note", event.target.value)
                  }
                />
              </div>
              <div className="field full">
                <label>辨識文字</label>
                <textarea
                  placeholder="尚未辨識"
                  value={item.ocrText}
                  readOnly
                />
                {item.ocrStatus ? (
                  <span className="ocr-status">{item.ocrStatus}</span>
                ) : null}
              </div>
            </div>

            <div className="item-actions">
              <button type="button" onClick={() => removeItem(item.id)}>
                刪除
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="footer-bar">
        <div className="footer-summary">
          <div>
            <span className="label">總筆數</span>
            <span className="value">{items.length}</span>
          </div>
          <div className="divider"></div>
          <div>
            <span className="label">總金額</span>
            <span className="value">NT$ {formatNumber(totalAmount)}</span>
          </div>
        </div>
        <button type="button" className="primary" onClick={handlePrint}>
          列印明細
        </button>
      </div>
      </div>

      <section className="print-page">
        <div className="print-header">
          <div>
            <h2>簽收單補收款項明細</h2>
            <p>製表日期：{new Date().toLocaleDateString("zh-TW")}</p>
          </div>
          <div className="print-meta">製表人：{ownerName}</div>
        </div>

        <div className="print-list">
          {items.map((item) => {
            const amountValue = Number(item.amount) || 0;
            const printHeight = Math.round(item.imageHeight * printImageScale);
            return (
              <div className="print-item" key={`print-${item.id}`}>
                <div className="print-image-wrap">
                  {item.image ? (
                    <img
                      src={item.image}
                      className="print-image"
                      style={{ height: `${printHeight}px` }}
                      alt="簽收單影像"
                    />
                  ) : (
                    <div className="print-placeholder">未附影像</div>
                  )}
                </div>
                <div className="print-fields">
                  <div className="print-field">
                    <span className="print-label">司機名稱</span>
                    <span>{item.driverName || "--"}</span>
                  </div>
                  {amountValue > 0 ? (
                    <div className="print-field">
                      <span className="print-label">需收金額</span>
                      <span className="print-amount">
                        NT$ {formatNumber(amountValue)}
                      </span>
                    </div>
                  ) : null}
                  <div className="print-field full">
                    <span className="print-label">備註</span>
                    <span>{item.note || "--"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="print-total">
          <span>合計筆數：{items.length} 筆</span>
          <span>總金額：NT$ {formatNumber(totalAmount)}</span>
        </div>
      </section>

    </>
  );
};

export default App;
 