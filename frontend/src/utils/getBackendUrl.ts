export default function getBackendUrl(): string {
  const { hostname } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000'; // Set to your localhost backend URL
  } else {
    return 'https://your_domain.com'; // Set to your production backend URL
  }
}
