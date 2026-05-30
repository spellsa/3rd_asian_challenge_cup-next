import React, { useState } from "react"; // メニューの開閉状態を保持
import { Link } from "react-router-dom"; // 画面遷移用リンク
import "./Menu.css"; // メニュー専用スタイル

const Menu = () => {
  // メニュー開閉と初回フェード演出抑止の状態
  const [isMenu, setIsMenu] = useState(false);
  const [notDisplay, setNotDisplay] = useState(true);

  const handleIsMenu = () => {
    setNotDisplay(false); // 初回のフェード演出を抑止
    setIsMenu(!isMenu); // 開閉トグル
  };
  return (
    <div className="sideBar">
      {/* ハンバーガーボタン */}
      <button
        className={isMenu ? "menuActive" : "notActive"}
        onClick={() => {
          handleIsMenu();
        }}
      >
        <span className="itemCross"></span>
      </button>

      {/* サイドメニュー本体 */}
      {isMenu ? (
        <div className="sideMenu">
          <li>
            <Link to="/">トップ</Link>
          </li>
          <li>
            <Link to="/dashboard">ホーム</Link>
          </li>
          <li>
            <Link to="/create">問題作成</Link>
          </li>
          <li>
            <Link to="/mypage">プロフィール</Link>
          </li>
        </div>
      ) : (
        <div>
          {/* 初回のみフェードアウトを抑止 */}
          {!notDisplay && <div className="hideMenu"></div>}
        </div>
      )}
    </div>
  );
};

export default Menu; //Menu関数をエクスポート
