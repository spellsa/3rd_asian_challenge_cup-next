import { API_BASE_URL } from "../config/constants";

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, { method = "GET", headers = {}, body, token } = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const config = {
      method,
      headers: { ...headers },
    };

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTPエラー: ${response.status}`;
        try {
          // サーバーからのエラーレスポンスがあればそれを読み取る
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
            // jsonパース失敗は無視してデフォルトメッセージを使う
        }
        throw new Error(errorMessage);
      }

      // レスポンスが空の場合はnullを返す（DELETEなど）
      if (response.status === 204) {
          return null;
      }

      return await response.json();
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
    }
  }

  get(endpoint, token, queryParams) {
    let path = endpoint;
    if (queryParams) {
      const searchParams = new URLSearchParams(queryParams);
      path += `?${searchParams.toString()}`;
    }
    return this.request(path, { method: "GET", token });
  }

  post(endpoint, token, body) {
    return this.request(endpoint, { method: "POST", token, body });
  }

  put(endpoint, token, body) {
    return this.request(endpoint, { method: "PUT", token, body });
  }

  delete(endpoint, token) {
    return this.request(endpoint, { method: "DELETE", token });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
