import axios from 'axios';

// عند التشغيل داخل Electron (بروتوكول file://) يبقى الخادم دائمًا على نفس الجهاز،
// أما عند فتح الصفحة من متصفح (بما فيها جهاز آخر عبر الواي فاي المحلي) نستخدم نفس العنوان الذي فُتحت منه الصفحة.
const API_HOST =
  !window.location.hostname || window.location.protocol === 'file:' ? 'localhost' : window.location.hostname;
const API_BASE = `http://${API_HOST}:4310/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('raqeem_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('raqeem_token');
      localStorage.removeItem('raqeem_worker');
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(err);
  }
);

export function fileUrl(relPath) {
  if (!relPath) return null;
  const base = API_BASE.replace(/\/api$/, '');
  return `${base}/${relPath.replace(/\\/g, '/')}`;
}

export default api;
