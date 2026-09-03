import axios
  from 'axios';

export const api =
  axios.create({
    baseURL:
      import.meta.env
        .VITE_API_URL,

    timeout: 60000,

    withCredentials: true,
  });
