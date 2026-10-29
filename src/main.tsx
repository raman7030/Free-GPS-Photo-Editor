import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-register service worker for instant offline support
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
