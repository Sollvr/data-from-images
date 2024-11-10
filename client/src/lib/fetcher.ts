export class FetchError extends Error {
  info: any;
  status: number;
  constructor(message: string, info: any, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

const API_URL = import.meta.env.VITE_API_URL || '';

// Fetcher function for SWR that includes credentials and handles non-200 responses
export const fetcher = async (url: string, init?: RequestInit) => {
  const isAbsoluteUrl = url.startsWith('http');
  const fetchUrl = isAbsoluteUrl ? url : `${API_URL}${url}`;
  
  const res = await fetch(fetchUrl, {
    ...init,
    credentials: "include",
    headers: {
      ...init?.headers,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const info = await res.json().catch(() => null);
    const error = new FetchError(
      `An error occurred while fetching the data.`,
      info,
      res.status,
    );
    throw error;
  }

  return res.json();
};

// Helper function for making POST requests
export const postData = async (url: string, data: any) => {
  return fetcher(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Helper function for making PUT requests
export const putData = async (url: string, data: any) => {
  return fetcher(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

// Helper function for making DELETE requests
export const deleteData = async (url: string) => {
  return fetcher(url, {
    method: "DELETE",
  });
};
